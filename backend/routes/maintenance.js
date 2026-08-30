const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

function generateTxHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 64; i++) hash += chars.charAt(Math.floor(Math.random() * 16));
    return hash;
}

function generateDataHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 40; i++) hash += chars.charAt(Math.floor(Math.random() * 16));
    return hash;
}

function logAudit(operator, action, targetType, targetId, detail, txHash) {
    try {
        db.prepare('INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash) VALUES (?, ?, ?, ?, ?, ?)')
            .run(operator || '系统', action, targetType, targetId, detail, txHash || null);
    } catch(e) { console.error('Audit log error:', e.message); }
}

// GET /api/maintenance - 获取所有维护记录
router.get('/', (req, res) => {
    const { battery_id } = req.query;
    let rows;
    if (battery_id) {
        rows = db.prepare('SELECT * FROM maintenance_records WHERE battery_id = ? ORDER BY maintenance_date DESC').all(battery_id);
    } else {
        rows = db.prepare('SELECT * FROM maintenance_records ORDER BY maintenance_date DESC').all();
    }
    res.json(rows);
});

// POST /api/maintenance - 添加维护记录
router.post('/', adminRequired, (req, res) => {
    const { id, battery_id, maintenance_type, description, provider, cost, next_maintenance_date, maintenance_date, operator } = req.body;

    if (!id || !battery_id || !maintenance_type || !description || !provider || !maintenance_date) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    const battery = db.prepare('SELECT id, manufacturer FROM batteries WHERE id = ?').get(battery_id);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const existing = db.prepare('SELECT id FROM maintenance_records WHERE id = ?').get(id);
    if (existing) {
        return res.status(409).json({ error: '维护记录ID已存在' });
    }

    const txHash = generateTxHash();
    const dataHash = generateDataHash();
    const blockNumber = 18923460 + Math.floor(Math.random() * 1000);

    db.prepare(`
        INSERT INTO maintenance_records (id, battery_id, maintenance_type, description, provider, cost, result, data_hash, tx_hash, block_number, maintenance_date, next_maintenance_date)
        VALUES (?, ?, ?, ?, ?, ?, '完成', ?, ?, ?, ?, ?)
    `).run(id, battery_id, maintenance_type, description, provider, cost || 0, dataHash, txHash, blockNumber, maintenance_date, next_maintenance_date || null);

    db.prepare('INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(txHash, 'addMaintenance', battery_id, blockNumber, '0xMAINT001BYD44S', '成功');

    logAudit(operator || provider, '维护记录上链', 'maintenance', id, description, txHash);

    res.status(201).json({
        success: true,
        recordId: id,
        txHash: txHash,
        dataHash: dataHash,
        blockNumber: blockNumber,
        message: '维护记录已上链存证'
    });
});

// PUT /api/maintenance/:id - 更新维护记录
router.put('/:id', adminRequired, (req, res) => {
    const { id } = req.params;
    const { maintenance_type, description, provider, cost, result, next_maintenance_date, operator } = req.body;
    const record = db.prepare('SELECT id FROM maintenance_records WHERE id = ?').get(id);
    if (!record) {
        return res.status(404).json({ error: '维护记录不存在' });
    }

    db.prepare(`UPDATE maintenance_records SET
        maintenance_type = COALESCE(?, maintenance_type),
        description = COALESCE(?, description),
        provider = COALESCE(?, provider),
        cost = COALESCE(?, cost),
        result = COALESCE(?, result),
        next_maintenance_date = COALESCE(?, next_maintenance_date)
        WHERE id = ?`).run(
        maintenance_type || null, description || null, provider || null,
        cost !== undefined ? cost : null, result || null,
        next_maintenance_date || null, id
    );

    logAudit(operator || '系统', '更新维护记录', 'maintenance', id, '更新维护记录信息', null);
    res.json({ success: true, message: '维护记录已更新' });
});

// GET /api/maintenance/upcoming - 即将到期的保养提醒
router.get('/upcoming', (req, res) => {
    const rows = db.prepare(`
        SELECT m.*, b.manufacturer, b.model, b.soh
        FROM maintenance_records m
        JOIN batteries b ON m.battery_id = b.id
        WHERE m.next_maintenance_date IS NOT NULL
            AND m.next_maintenance_date >= date('now','localtime')
            AND m.next_maintenance_date <= date('now','localtime','+90 days')
        ORDER BY m.next_maintenance_date ASC
    `).all();
    res.json(rows);
});

module.exports = router;
