const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

// GET /api/audit - 获取审计日志（支持筛选）
router.get('/', (req, res) => {
    const { operator, action, target_type, limit, offset } = req.query;
    var sql = 'SELECT * FROM audit_logs WHERE 1=1';
    var params = [];

    if (operator) { sql += ' AND operator LIKE ?'; params.push('%' + operator + '%'); }
    if (action) { sql += ' AND action LIKE ?'; params.push('%' + action + '%'); }
    if (target_type) { sql += ' AND target_type = ?'; params.push(target_type); }

    sql += ' ORDER BY created_at DESC';

    if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
        if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)); }
    }

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
});

// GET /api/audit/stats - 审计统计
router.get('/stats', (req, res) => {
    const totalLogs = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
    const byAction = db.prepare(`
        SELECT action as name, COUNT(*) as value
        FROM audit_logs GROUP BY action ORDER BY value DESC
    `).all();
    const byOperator = db.prepare(`
        SELECT operator as name, COUNT(*) as value
        FROM audit_logs GROUP BY operator ORDER BY value DESC LIMIT 10
    `).all();
    const byTargetType = db.prepare(`
        SELECT target_type as name, COUNT(*) as value
        FROM audit_logs WHERE target_type IS NOT NULL GROUP BY target_type
    `).all();
    const recentActivity = db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE date(created_at) = date('now','localtime')
    `).get().count;

    res.json({
        totalLogs: totalLogs,
        recentActivity: recentActivity,
        byAction: byAction,
        byOperator: byOperator,
        byTargetType: byTargetType
    });
});

// POST /api/audit - 手动添加审计日志
router.post('/', adminRequired, (req, res) => {
    const { operator, action, target_type, target_id, detail, ip_address } = req.body;
    if (!operator || !action) {
        return res.status(400).json({ error: '缺少必填字段' });
    }
    var info = db.prepare('INSERT INTO audit_logs (operator, action, target_type, target_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        .run(operator, action, target_type || null, target_id || null, detail || null, ip_address || '127.0.0.1');
    res.status(201).json({ success: true, id: info.lastInsertRowid, message: '审计日志已记录' });
});

module.exports = router;
