const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

function generateHash(len) {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < (len || 40); i++) {
        hash += chars.charAt(Math.floor(Math.random() * 16));
    }
    return hash;
}

// GET /api/events/:batteryId - 获取电池生命周期事件
router.get('/:batteryId', (req, res) => {
    const { batteryId } = req.params;
    const events = db.prepare('SELECT * FROM lifecycle_events WHERE battery_id = ? ORDER BY event_date ASC').all(batteryId);
    res.json(events);
});

// POST /api/events - 添加生命周期事件（上链）
router.post('/', adminRequired, (req, res) => {
    const { battery_id, event_type, event_title, event_desc, submitter } = req.body;

    if (!battery_id || !event_type || !event_title || !submitter) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    const battery = db.prepare('SELECT id FROM batteries WHERE id = ?').get(battery_id);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const dataHash = generateHash(40);
    const txHash = generateHash(64);
    const blockNumber = 18923460 + Math.floor(Math.random() * 1000);
    const eventDate = new Date().toISOString().split('T')[0];

    db.prepare(`
        INSERT INTO lifecycle_events (battery_id, event_type, event_title, event_desc, submitter, data_hash, tx_hash, block_number, verified, event_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(battery_id, event_type, event_title, event_desc || '', submitter, dataHash, txHash, blockNumber, eventDate);

    // 写入交易记录
    db.prepare('INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)').run(txHash, 'addRecord', battery_id, blockNumber, submitter, '成功');

    res.status(201).json({
        success: true,
        txHash: txHash,
        dataHash: dataHash,
        blockNumber: blockNumber,
        gasUsed: 40000 + Math.floor(Math.random() * 80000),
        message: '生命周期事件已上链'
    });
});

// POST /api/events/verify - 验证事件Hash
router.post('/verify', (req, res) => {
    const { event_id, data_hash } = req.body;
    const event = db.prepare('SELECT * FROM lifecycle_events WHERE id = ?').get(event_id);
    if (!event) {
        return res.status(404).json({ error: '事件不存在' });
    }
    const isValid = event.data_hash === data_hash;
    if (isValid) {
        db.prepare('UPDATE lifecycle_events SET verified = 1 WHERE id = ?').run(event_id);
    }
    res.json({
        verified: isValid,
        originalHash: event.data_hash,
        computedHash: data_hash,
        blockNumber: event.block_number
    });
});

module.exports = router;
