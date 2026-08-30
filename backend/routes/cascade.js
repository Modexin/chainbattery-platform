const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const crypto = require('crypto');
const { adminRequired } = require('./auth');

router.get('/', (req, res) => {
    const { battery_id, status } = req.query;
    let sql = 'SELECT * FROM cascade_utilization WHERE 1=1';
    const params = [];
    if (battery_id) { sql += ' AND battery_id = ?'; params.push(battery_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
});

router.get('/stats', (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as c FROM cascade_utilization').get().c;
    const byStatus = db.prepare(`
        SELECT status as name, COUNT(*) as value FROM cascade_utilization GROUP BY status
    `).all();
    const byScenario = db.prepare(`
        SELECT cascade_scenario as name, COUNT(*) as value FROM cascade_utilization
        WHERE cascade_scenario IS NOT NULL GROUP BY cascade_scenario
    `).all();
    const recentRecords = db.prepare(`
        SELECT * FROM cascade_utilization ORDER BY created_at DESC LIMIT 5
    `).all();

    res.json({
        total: total,
        byStatus: byStatus,
        byScenario: byScenario,
        recentRecords: recentRecords
    });
});

router.post('/', adminRequired, (req, res) => {
    const {
        battery_id, source_vehicle_vin, evaluation_result, evaluation_score,
        cascade_scenario, target_project, installed_capacity,
        start_date, expected_end_date, operator
    } = req.body;

    if (!battery_id) {
        return res.status(400).json({ error: '电池ID不能为空' });
    }

    const id = 'CSD-' + Date.now().toString(36).toUpperCase();
    const dataHash = crypto.createHash('sha256').update(battery_id + cascade_scenario + Date.now()).digest('hex');
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = 18923460 + Math.floor(Math.random() * 10000);

    db.prepare(`
        INSERT INTO cascade_utilization
        (id, battery_id, source_vehicle_vin, evaluation_result, evaluation_score,
         cascade_scenario, target_project, installed_capacity, status, start_date,
         expected_end_date, operator, data_hash, tx_hash, block_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id, battery_id, source_vehicle_vin || null, evaluation_result || null,
        evaluation_score || null, cascade_scenario || null, target_project || null,
        installed_capacity || null, '评估中', start_date || null,
        expected_end_date || null, operator || '系统管理员',
        dataHash, txHash, blockNumber
    );

    db.prepare(`
        INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        operator || '系统管理员', '创建梯次利用记录',
        'cascade', id,
        '电池: ' + battery_id + ', 场景: ' + (cascade_scenario || '未指定'),
        txHash
    );

    res.json({
        success: true,
        id: id,
        tx_hash: txHash,
        block_number: blockNumber,
        message: '梯次利用记录已创建并上链'
    });
});

router.put('/:id/advance', adminRequired, (req, res) => {
    const { id } = req.params;
    const { operator } = req.body;
    const record = db.prepare('SELECT * FROM cascade_utilization WHERE id = ?').get(id);
    if (!record) {
        return res.status(404).json({ error: '梯次利用记录不存在' });
    }

    const flow = ['评估中', '已评估', '梯次安装', '运行中', '已完成'];
    const currentIdx = flow.indexOf(record.status);
    if (currentIdx === -1 || currentIdx >= flow.length - 1) {
        return res.status(400).json({ error: '无法推进: ' + record.status });
    }
    const nextStatus = flow[currentIdx + 1];
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = 18923460 + Math.floor(Math.random() * 10000);

    let updateFields = 'status = ?, tx_hash = ?, block_number = ?';
    const params = [nextStatus, txHash, blockNumber];
    if (nextStatus === '运行中' && !record.start_date) {
        updateFields += ', start_date = ?';
        params.push(new Date().toISOString().split('T')[0]);
    }
    if (nextStatus === '已完成') {
        updateFields += ', actual_end_date = ?';
        params.push(new Date().toISOString().split('T')[0]);
    }
    params.push(id);

    db.prepare(`UPDATE cascade_utilization SET ${updateFields} WHERE id = ?`).run(...params);

    db.prepare(`
        INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        operator || '系统管理员', '推进梯次利用流程',
        'cascade', id,
        '状态: ' + record.status + ' -> ' + nextStatus,
        txHash
    );

    res.json({
        success: true,
        prev_status: record.status,
        next_status: nextStatus,
        tx_hash: txHash,
        block_number: blockNumber,
        message: '梯次利用流程已推进: ' + record.status + ' -> ' + nextStatus
    });
});

router.put('/:id', adminRequired, (req, res) => {
    const { id } = req.params;
    const {
        evaluation_result, evaluation_score, cascade_scenario,
        target_project, installed_capacity, expected_end_date, operator
    } = req.body;

    const record = db.prepare('SELECT * FROM cascade_utilization WHERE id = ?').get(id);
    if (!record) {
        return res.status(404).json({ error: '梯次利用记录不存在' });
    }

    db.prepare(`
        UPDATE cascade_utilization SET
            evaluation_result = COALESCE(?, evaluation_result),
            evaluation_score = COALESCE(?, evaluation_score),
            cascade_scenario = COALESCE(?, cascade_scenario),
            target_project = COALESCE(?, target_project),
            installed_capacity = COALESCE(?, installed_capacity),
            expected_end_date = COALESCE(?, expected_end_date)
        WHERE id = ?
    `).run(
        evaluation_result || null, evaluation_score || null,
        cascade_scenario || null, target_project || null,
        installed_capacity || null, expected_end_date || null, id
    );

    db.prepare(`
        INSERT INTO audit_logs (operator, action, target_type, target_id, detail)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        operator || '系统管理员', '更新梯次利用记录',
        'cascade', id, '更新评估信息'
    );

    res.json({ success: true, message: '梯次利用记录已更新' });
});

module.exports = router;
