const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/conn');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'chainbattery_salt_2026').digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 3) {
        return res.status(400).json({ error: '用户名至少3个字符' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少6个字符' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
        return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPwd = hashPassword(password);
    const token = generateToken();
    const now = new Date().toISOString();

    const info = db.prepare(`
        INSERT INTO users (username, password, email, role, token, token_expires_at, created_at)
        VALUES (?, ?, ?, 'visitor', ?, datetime('now', '+7 days'), ?)
    `).run(username, hashedPwd, email || null, token, now);

    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);

    res.json({
        success: true,
        message: '注册成功',
        token: token,
        user: user
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const hashedPwd = hashPassword(password);
    if (hashedPwd !== user.password) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken();
    db.prepare('UPDATE users SET token = ?, token_expires_at = datetime(\'now\', \'+7 days\'), last_login_at = datetime(\'now\') WHERE id = ?')
        .run(token, user.id);

    const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        last_login_at: new Date().toISOString()
    };

    res.json({
        success: true,
        message: '登录成功',
        token: token,
        user: safeUser
    });
});

router.post('/logout', (req, res) => {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
    if (token) {
        db.prepare('UPDATE users SET token = NULL, token_expires_at = NULL WHERE token = ?').run(token);
    }
    res.json({ success: true, message: '已登出' });
});

router.get('/me', (req, res) => {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }

    const user = db.prepare('SELECT id, username, email, role, created_at, last_login_at FROM users WHERE token = ? AND token_expires_at > datetime('now')').get(token);
    if (!user) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }

    res.json({ user });
});

function authRequired(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }
    const user = db.prepare('SELECT * FROM users WHERE token = ? AND token_expires_at > datetime('now')').get(token);
    if (!user) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    req.user = user;
    next();
}

function adminRequired(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }
    const user = db.prepare('SELECT * FROM users WHERE token = ? AND token_expires_at > datetime('now')').get(token);
    if (!user) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    if (user.role !== 'admin') {
        return res.status(403).json({ error: '无权限操作，仅管理员可执行此操作' });
    }
    req.user = user;
    next();
}

module.exports = router;
module.exports.authRequired = authRequired;
module.exports.adminRequired = adminRequired;
module.exports.hashPassword = hashPassword;
