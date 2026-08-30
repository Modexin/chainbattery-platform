const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

// GET /api/anomalies - 获取所有异常
router.get('/', (req, res) => {
    const anomalies = db.prepare('SELECT * FROM anomalies ORDER BY created_at DESC').all();
    res.json(anomalies);
});

// PUT /api/anomalies/:id/status - 更新异常状态
router.put('/:id/status', adminRequired, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['待处理', '处理中', '已确认', '已处理'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: '无效状态' });
    }
    const anomaly = db.prepare('SELECT id FROM anomalies WHERE id = ?').get(id);
    if (!anomaly) {
        return res.status(404).json({ error: '异常记录不存在' });
    }
    db.prepare('UPDATE anomalies SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, message: '异常状态已更新', status: status });
});

// POST /api/anomalies - 手动创建异常
router.post('/', adminRequired, (req, res) => {
    const { battery_id, anomaly_type, level, description } = req.body;
    if (!battery_id || !anomaly_type || !level || !description) {
        return res.status(400).json({ error: '缺少必填字段' });
    }
    const id = 'ANM-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
    db.prepare('INSERT INTO anomalies (id, battery_id, anomaly_type, level, description, status) VALUES (?, ?, ?, ?, ?, ?)').run(id, battery_id, anomaly_type, level, description, '待处理');
    res.status(201).json({ success: true, id: id, message: '异常记录已创建' });
});

module.exports = router;
