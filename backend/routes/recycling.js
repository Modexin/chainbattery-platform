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

// GET /api/recycling - 获取所有回收任务
router.get('/', (req, res) => {
    const tasks = db.prepare('SELECT * FROM recycling_tasks ORDER BY created_at DESC').all();
    res.json(tasks);
});

// POST /api/recycling - 创建回收任务
router.post('/', adminRequired, (req, res) => {
    const { battery_id, enterprise, contact } = req.body;
    if (!battery_id || !enterprise) {
        return res.status(400).json({ error: '缺少必填字段' });
    }
    const id = 'REC-' + String(Date.now()).slice(-6);
    db.prepare('INSERT INTO recycling_tasks (id, battery_id, enterprise, status, step, contact) VALUES (?, ?, ?, ?, ?, ?)').run(id, battery_id, enterprise, '待退役', 0, contact || '');
    res.status(201).json({ success: true, id: id, message: '回收任务已创建' });
});

// PUT /api/recycling/:id/advance - 推进回收流程
router.put('/:id/advance', adminRequired, (req, res) => {
    const { id } = req.params;
    const task = db.prepare('SELECT * FROM recycling_tasks WHERE id = ?').get(id);
    if (!task) {
        return res.status(404).json({ error: '回收任务不存在' });
    }
    if (task.step >= 5) {
        return res.status(400).json({ error: '已完成最终步骤' });
    }

    const steps = ['待退役', '待回收', '运输中', '已接收', '梯次利用', '已拆解'];
    const newStep = task.step + 1;
    const newStatus = steps[newStep];
    const txHash = generateHash(64);
    const blockNumber = 18923460 + Math.floor(Math.random() * 1000);

    db.prepare('UPDATE recycling_tasks SET status = ?, step = ? WHERE id = ?').run(newStatus, newStep, id);

    if (newStatus === '梯次利用') {
        db.prepare("UPDATE batteries SET status = '梯次利用' WHERE id = ?").run(task.battery_id);
    } else if (newStatus === '已拆解') {
        db.prepare("UPDATE batteries SET status = '已回收' WHERE id = ?").run(task.battery_id);
    }

    db.prepare('INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)').run(txHash, 'transferBattery', task.battery_id, blockNumber, task.enterprise, '成功');

    res.json({
        success: true,
        status: newStatus,
        step: newStep,
        txHash: txHash,
        blockNumber: blockNumber,
        message: '回收流程已推进至: ' + newStatus
    });
});

module.exports = router;
