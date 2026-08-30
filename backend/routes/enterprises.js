const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

// GET /api/enterprises - 获取所有企业
router.get('/', (req, res) => {
    const enterprises = db.prepare('SELECT * FROM enterprises ORDER BY created_at DESC').all();
    res.json(enterprises);
});

// POST /api/enterprises - 注册企业
router.post('/', adminRequired, (req, res) => {
    const { name, enterprise_type, role, address } = req.body;
    if (!name || !enterprise_type || !role) {
        return res.status(400).json({ error: '缺少必填字段' });
    }
    const existing = db.prepare('SELECT id FROM enterprises WHERE name = ?').get(name);
    if (existing) {
        return res.status(409).json({ error: '企业名称已存在' });
    }
    db.prepare('INSERT INTO enterprises (name, enterprise_type, role, address, verified) VALUES (?, ?, ?, ?, 0)').run(name, enterprise_type, role, address || '');
    res.status(201).json({ success: true, message: '企业注册申请已提交' });
});

// PUT /api/enterprises/:id/verify - 认证企业
router.put('/:id/verify', adminRequired, (req, res) => {
    const { id } = req.params;
    const enterprise = db.prepare('SELECT id FROM enterprises WHERE id = ?').get(id);
    if (!enterprise) {
        return res.status(404).json({ error: '企业不存在' });
    }
    db.prepare('UPDATE enterprises SET verified = 1 WHERE id = ?').run(id);
    res.json({ success: true, message: '企业已认证' });
});

module.exports = router;
