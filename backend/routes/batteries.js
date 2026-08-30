const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

function generateTxHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 64; i++) {
        hash += chars.charAt(Math.floor(Math.random() * 16));
    }
    return hash;
}

function generateDataHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 40; i++) {
        hash += chars.charAt(Math.floor(Math.random() * 16));
    }
    return hash;
}

// GET /api/batteries - 获取所有电池
router.get('/', (req, res) => {
    const batteries = db.prepare('SELECT * FROM batteries ORDER BY created_at DESC').all();
    res.json(batteries);
});

// GET /api/batteries/:id - 获取单个电池详情（含事件、SOH历史、转移记录）
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(id);
    if (!battery) {
        return res.status(404).json({ error: 'Battery not found' });
    }
    const events = db.prepare('SELECT * FROM lifecycle_events WHERE battery_id = ? ORDER BY event_date ASC').all(id);
    const sohHistory = db.prepare('SELECT * FROM soh_history WHERE battery_id = ? ORDER BY record_date ASC').all(id);
    const transfers = db.prepare('SELECT * FROM transfer_records WHERE battery_id = ? ORDER BY transfer_date ASC').all(id);
    res.json({ ...battery, lifecycleEvents: events, sohHistory: sohHistory, transferHistory: transfers });
});

// POST /api/batteries - 注册新电池（写入数据库 + 模拟上链）
router.post('/', adminRequired, (req, res) => {
    const { id, manufacturer, model, battery_type, capacity, batch, production_date, vehicle_vin, current_owner } = req.body;

    if (!id || !manufacturer || !model || !battery_type || !capacity || !batch || !production_date) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    const existing = db.prepare('SELECT id FROM batteries WHERE id = ?').get(id);
    if (existing) {
        return res.status(409).json({ error: '电池ID已存在' });
    }

    const txHash = generateTxHash();
    const blockNumber = 18923460 + Math.floor(Math.random() * 1000);

    db.prepare(`
        INSERT INTO batteries (id, manufacturer, model, battery_type, capacity, batch, production_date, vehicle_vin, status, soh, soc, cycles, current_owner, trust_score, tx_hash, block_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '已生产', 100, 100, 0, ?, 100, ?, ?)
    `).run(id, manufacturer, model, battery_type, capacity, batch, production_date, vehicle_vin || null, current_owner || manufacturer, txHash, blockNumber);

    // 写入生命周期事件
    const dataHash = generateDataHash();
    db.prepare(`
        INSERT INTO lifecycle_events (battery_id, event_type, event_title, event_desc, submitter, data_hash, tx_hash, block_number, verified, event_date)
        VALUES (?, '电池生产', '电池生产完成', ?, ?, ?, ?, ?, 1, ?)
    `).run(id, '制造商: ' + manufacturer + ' / 型号: ' + model + ' / 容量: ' + capacity, manufacturer, dataHash, txHash, blockNumber, production_date);

    // 写入SOH初始记录
    db.prepare('INSERT INTO soh_history (battery_id, soh, soc, cycles, record_date) VALUES (?, 100, 100, 0, ?)').run(id, production_date.substring(0, 7));

    // 写入交易记录
    db.prepare('INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)').run(txHash, 'registerBattery', id, blockNumber, '0xABC1234DEF5678', '成功');

    res.status(201).json({
        success: true,
        batteryId: id,
        txHash: txHash,
        blockNumber: blockNumber,
        gasUsed: 50000 + Math.floor(Math.random() * 100000),
        message: '电池数字身份已生成，已写入区块链'
    });
});

// PUT /api/batteries/:id/status - 更新电池状态
router.put('/:id/status', adminRequired, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['已生产', '在役', '维修中', '待退役', '梯次利用', '已回收', '生命周期结束'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: '无效状态' });
    }
    const battery = db.prepare('SELECT id FROM batteries WHERE id = ?').get(id);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }
    db.prepare('UPDATE batteries SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, message: '状态已更新', status: status });
});

// PUT /api/batteries/:id/soh - SOH递减上链存证（新SOH必须<=旧SOH）
router.put('/:id/soh', adminRequired, (req, res) => {
    const { id } = req.params;
    const { soh, soc, cycles, operator, remark } = req.body;
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(id);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }
    const newSoh = parseFloat(soh);
    if (isNaN(newSoh) || newSoh < 0 || newSoh > 100) {
        return res.status(400).json({ error: 'SOH必须在0-100之间' });
    }
    if (newSoh > battery.soh) {
        return res.status(400).json({
            error: 'SOH只能递减，不能高于上次记录(' + battery.soh + '%)',
            current_soh: battery.soh,
            attempted_soh: newSoh
        });
    }
    if (newSoh === battery.soh) {
        return res.status(400).json({ error: 'SOH与当前值相同，无需更新' });
    }

    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const txHash = generateTxHash();
    const dataHash = generateDataHash();
    const blockNumber = 18923460 + Math.floor(Math.random() * 100000);
    const decline = battery.soh - newSoh;

    db.prepare('UPDATE batteries SET soh = ?, soc = ?, cycles = ? WHERE id = ?')
        .run(newSoh, soc != null ? soc : battery.soc, cycles != null ? cycles : battery.cycles, id);
    db.prepare('INSERT INTO soh_history (battery_id, soh, soc, cycles, record_date) VALUES (?, ?, ?, ?, ?)')
        .run(id, newSoh, soc != null ? soc : battery.soc, cycles != null ? cycles : battery.cycles, dateStr);

    db.prepare(`INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(txHash, 'sohAttestation', id, blockNumber, '0x' + operator && operator.substring(0, 8) || 'SYSTEM', '成功');

    db.prepare(`INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(operator || '系统管理员', 'SOH上链存证', 'battery', id,
            'SOH: ' + battery.soh + '% -> ' + newSoh + '% (下降' + decline.toFixed(1) + '%)' + (remark ? ' | 备注: ' + remark : ''),
            txHash);

    res.json({
        success: true,
        message: 'SOH已上链存证',
        previous_soh: battery.soh,
        new_soh: newSoh,
        decline: decline,
        tx_hash: txHash,
        data_hash: dataHash,
        block_number: blockNumber,
        attestation_time: now.toISOString()
    });
});

// GET /api/batteries/:id/prediction - 电池健康预测
router.get('/:id/prediction', (req, res) => {
    const { id } = req.params;
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(id);
    if (!battery) {
        return res.status(404).json({ error: 'Battery not found' });
    }
    const sohHistory = db.prepare('SELECT * FROM soh_history WHERE battery_id = ? ORDER BY record_date ASC').all(id);

    if (sohHistory.length < 2) {
        return res.json({
            batteryId: id,
            currentSOH: battery.soh,
            predictionAvailable: false,
            message: 'SOH历史数据不足，至少需要2条记录才能进行预测'
        });
    }

    // 计算衰减率 (线性回归)
    var n = sohHistory.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (var i = 0; i < n; i++) {
        var x = i;
        var y = sohHistory[i].soh;
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;

    // 预测达到退役标准(65%)的时间
    var currentSOH = battery.soh;
    var retiredThreshold = 65;
    var cascadeThreshold = 80;
    var monthsToRetire = slope < 0 ? Math.ceil((currentSOH - retiredThreshold) / Math.abs(slope)) : -1;
    var monthsToCascade = slope < 0 ? Math.ceil((currentSOH - cascadeThreshold) / Math.abs(slope)) : -1;

    // 生成预测数据点
    var predictions = [];
    for (var j = 0; j <= 12; j++) {
        var futureMonth = n - 1 + j;
        var predictedSOH = slope * futureMonth + intercept;
        if (predictedSOH < 0) predictedSOH = 0;
        if (predictedSOH > 100) predictedSOH = 100;
        predictions.push({
            month: j,
            soh: Math.round(predictedSOH * 10) / 10,
            isPrediction: j > 0
        });
    }

    // 计算年衰减率
    var totalDrop = sohHistory[0].soh - sohHistory[n - 1].soh;
    var totalMonths = n;
    var annualDecayRate = totalMonths > 0 ? (totalDrop / totalMonths) * 12 : 0;

    // 估算剩余循环次数
    var avgCyclesPerRecord = sohHistory.length > 1 ?
        (sohHistory[n-1].cycles - sohHistory[0].cycles) / (n - 1) : 0;
    var remainingCycles = slope < 0 ?
        Math.ceil((currentSOH - retiredThreshold) / Math.abs(slope) * avgCyclesPerRecord) : 0;

    res.json({
        batteryId: id,
        currentSOH: currentSOH,
        currentCycles: battery.cycles,
        predictionAvailable: true,
        degradationRate: Math.round(slope * 1000) / 1000,
        annualDecayRate: Math.round(annualDecayRate * 10) / 10,
        intercept: Math.round(intercept * 10) / 10,
        monthsToCascadeThreshold: monthsToCascade,
        monthsToRetireThreshold: monthsToRetire,
        remainingCycles: remainingCycles,
        retiredThreshold: retiredThreshold,
        cascadeThreshold: cascadeThreshold,
        history: sohHistory.map(function(r) { return { month: r.record_date, soh: r.soh, cycles: r.cycles }; }),
        predictions: predictions
    });
});

module.exports = router;
