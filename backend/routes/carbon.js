const express = require('express');
const router = express.Router();
const db = require('../db/conn');

function generateTxHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 64; i++) hash += chars.charAt(Math.floor(Math.random() * 16));
    return hash;
}

function logAudit(operator, action, targetType, targetId, detail, txHash) {
    try {
        db.prepare('INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash) VALUES (?, ?, ?, ?, ?, ?)')
            .run(operator || '系统', action, targetType, targetId, detail, txHash || null);
    } catch(e) { console.error('Audit log error:', e.message); }
}

// GET /api/carbon - 获取所有碳减排记录
router.get('/', (req, res) => {
    const { battery_id } = req.query;
    let rows;
    if (battery_id) {
        rows = db.prepare(`
            SELECT c.*, b.manufacturer, b.model
            FROM carbon_records c
            LEFT JOIN batteries b ON c.battery_id = b.id
            WHERE c.battery_id = ?
            ORDER BY c.record_date DESC
        `).all(battery_id);
    } else {
        rows = db.prepare(`
            SELECT c.*, b.manufacturer, b.model
            FROM carbon_records c
            LEFT JOIN batteries b ON c.battery_id = b.id
            ORDER BY c.record_date DESC
        `).all();
    }
    res.json(rows);
});

// GET /api/carbon/stats - 碳减排统计
router.get('/stats', (req, res) => {
    const totalCarbon = db.prepare('SELECT COALESCE(SUM(carbon_saved), 0) as total FROM carbon_records').get().total;
    const byType = db.prepare(`
        SELECT record_type as name, SUM(carbon_saved) as value, COUNT(*) as count
        FROM carbon_records GROUP BY record_type
    `).all();
    const monthlyTrend = db.prepare(`
        SELECT substr(record_date, 1, 7) as month, SUM(carbon_saved) as total
        FROM carbon_records
        GROUP BY substr(record_date, 1, 7)
        ORDER BY month ASC
    `).all();
    const byBattery = db.prepare(`
        SELECT c.battery_id, b.manufacturer, b.model, SUM(c.carbon_saved) as total, COUNT(*) as count
        FROM carbon_records c
        LEFT JOIN batteries b ON c.battery_id = b.id
        GROUP BY c.battery_id
        ORDER BY total DESC
    `).all();

    res.json({
        totalCarbonSaved: Math.round(totalCarbon * 10) / 10,
        totalRecords: byType.reduce(function(s, r) { return s + r.count; }, 0),
        byType: byType,
        monthlyTrend: monthlyTrend,
        byBattery: byBattery,
        equivalentTrees: Math.round(totalCarbon / 20)
    });
});

// POST /api/carbon - 添加碳减排记录
router.post('/', (req, res) => {
    const { id, battery_id, record_type, description, carbon_saved, unit, verifier, record_date, operator } = req.body;

    if (!id || !battery_id || !record_type || !description || !carbon_saved || !record_date) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    const battery = db.prepare('SELECT id FROM batteries WHERE id = ?').get(battery_id);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const txHash = generateTxHash();
    const blockNumber = 18923460 + Math.floor(Math.random() * 1000);

    db.prepare(`
        INSERT INTO carbon_records (id, battery_id, record_type, description, carbon_saved, unit, verifier, tx_hash, block_number, record_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, battery_id, record_type, description, carbon_saved, unit || 'kgCO2', verifier || null, txHash, blockNumber, record_date);

    db.prepare('INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(txHash, 'recordCarbon', battery_id, blockNumber, '0xRECYCLE001GEM', '成功');

    logAudit(operator || verifier || '系统', '碳减排记录上链', 'carbon', id, '碳减排量: ' + carbon_saved + (unit || 'kgCO2'), txHash);

    res.status(201).json({
        success: true,
        recordId: id,
        txHash: txHash,
        blockNumber: blockNumber,
        message: '碳减排记录已上链存证'
    });
});

module.exports = router;
