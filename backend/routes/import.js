const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const crypto = require('crypto');
const { adminRequired } = require('./auth');

router.post('/batteries', adminRequired, (req, res) => {
    const { data, operator } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: '数据为空或格式不正确' });
    }

    let success = 0;
    let failed = 0;
    const errors = [];

    const insertBattery = db.prepare(`
        INSERT OR IGNORE INTO batteries
        (id, manufacturer, model, battery_type, capacity, batch, production_date,
         vehicle_vin, status, soh, soc, cycles, current_owner, trust_score, tx_hash, block_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTx = db.prepare(`
        INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertLog = db.prepare(`
        INSERT INTO import_logs (import_type, file_name, total_rows, success_rows, failed_rows, error_detail, operator)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAudit = db.prepare(`
        INSERT INTO audit_logs (operator, action, target_type, target_id, detail)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
            if (!row.id || !row.manufacturer || !row.model || !row.battery_type || !row.capacity) {
                throw new Error('缺少必填字段');
            }
            const txHash = '0x' + crypto.randomBytes(32).toString('hex');
            const blockNumber = 18923460 + Math.floor(Math.random() * 100000);
            const result = insertBattery.run(
                row.id, row.manufacturer, row.model, row.battery_type, row.capacity,
                row.batch || 'BATCH-' + Date.now(), row.production_date || new Date().toISOString().split('T')[0],
                row.vehicle_vin || null, row.status || '在役',
                parseFloat(row.soh) || 100, parseFloat(row.soc) || 100,
                parseInt(row.cycles) || 0, row.current_owner || null,
                parseInt(row.trust_score) || 100, txHash, blockNumber
            );
            if (result.changes > 0) {
                insertTx.run(txHash, 'register', row.id, blockNumber, '0x' + crypto.randomBytes(20).toString('hex'), '成功');
                success++;
            } else {
                failed++;
                errors.push('第' + (i + 1) + '行: 电池ID已存在 (' + row.id + ')');
            }
        } catch (e) {
            failed++;
            errors.push('第' + (i + 1) + '行: ' + e.message);
        }
    }

    insertLog.run('batteries', 'batch_import', data.length, success, failed, JSON.stringify(errors.slice(0, 20)), operator || '系统管理员');
    insertAudit.run(operator || '系统管理员', '批量导入电池', 'batteries', null, '导入' + data.length + '条, 成功' + success + '条, 失败' + failed + '条');

    res.json({
        success: true,
        total: data.length,
        success_count: success,
        failed_count: failed,
        errors: errors.slice(0, 20),
        message: '导入完成: 成功' + success + '条, 失败' + failed + '条'
    });
});

router.get('/template', (req, res) => {
    const template = [
        {
            id: 'BAT-2026-XXX-00000001',
            manufacturer: '宁德时代',
            model: '麒麟电池-CTP3.0',
            battery_type: '三元锂电池',
            capacity: '100kWh',
            batch: 'BATCH-2026-001',
            production_date: '2026-01-15',
            vehicle_vin: 'LSGAB52L9DF000001',
            status: '在役',
            soh: 100,
            soc: 100,
            cycles: 0,
            current_owner: 'XX新能源汽车公司',
            trust_score: 100
        }
    ];
    res.json({
        format: 'json',
        required_fields: ['id', 'manufacturer', 'model', 'battery_type', 'capacity'],
        optional_fields: ['batch', 'production_date', 'vehicle_vin', 'status', 'soh', 'soc', 'cycles', 'current_owner', 'trust_score'],
        template: template,
        csv_header: 'id,manufacturer,model,battery_type,capacity,batch,production_date,vehicle_vin,status,soh,soc,cycles,current_owner,trust_score',
        csv_example: 'BAT-2026-XXX-00000001,宁德时代,麒麟电池-CTP3.0,三元锂电池,100kWh,BATCH-2026-001,2026-01-15,LSGAB52L9DF000001,在役,100,100,0,XX新能源汽车公司,100'
    });
});

router.get('/sample-csv', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const manufacturers = [
        { name: '宁德时代', prefix: 'CATL', models: ['麒麟电池-CTP3.0', '神行超充电池', 'M3P电池'], types: ['三元锂电池', '磷酸铁锂电池'] },
        { name: '比亚迪', prefix: 'BYD', models: ['刀片电池', 'Blade Battery V2'], types: ['磷酸铁锂电池'] },
        { name: '亿纬锂能', prefix: 'EVE', models: ['LF560K', 'LF280K'], types: ['磷酸铁锂电池', '三元锂电池'] },
        { name: '国轩高科', prefix: 'GOT', models: ['Gotion L600', 'JTM电池'], types: ['磷酸铁锂电池'] },
        { name: '中创新航', prefix: 'CALB', models: ['OS高锰铁锂电池', 'U型电池'], types: ['三元锂电池', '磷酸铁锂电池'] }
    ];
    const statuses = ['在役', '已生产', '在役', '在役', '维修中'];
    const capacities = ['60kWh', '75kWh', '80kWh', '100kWh', '120kWh'];

    let csv = 'id,manufacturer,model,battery_type,capacity,batch,production_date,vehicle_vin,status,soh,soc,cycles,current_owner,trust_score\n';
    const now = new Date();
    const year = now.getFullYear();
    const ts = String(Date.now()).slice(-6);

    for (let i = 1; i <= count; i++) {
        const mfg = manufacturers[Math.floor(Math.random() * manufacturers.length)];
        const model = mfg.models[Math.floor(Math.random() * mfg.models.length)];
        const type = mfg.types[Math.floor(Math.random() * mfg.types.length)];
        const capacity = capacities[Math.floor(Math.random() * capacities.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const rnd = String(Math.floor(Math.random() * 900000) + 100000);
        const batteryId = `BAT-${year}-${mfg.prefix}-${ts}${rnd}`;
        const soh = status === '在役' ? (75 + Math.floor(Math.random() * 25)) : (status === '维修中' ? (60 + Math.floor(Math.random() * 15)) : 100);
        const soc = Math.floor(Math.random() * 100);
        const cycles = status === '在役' ? Math.floor(Math.random() * 800) : (status === '维修中' ? 600 + Math.floor(Math.random() * 400) : 0);
        const vin = 'LSGA' + String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
        const batch = 'BATCH-' + year + '-' + String(Math.floor(Math.random() * 999)).padStart(3, '0');
        const owner = ['XX新能源汽车公司', 'YY出行服务', 'ZZ物流集团'][Math.floor(Math.random() * 3)];
        const trust = 80 + Math.floor(Math.random() * 20);

        csv += `${batteryId},${mfg.name},${model},${type},${capacity},${batch},${year}-${month}-${day},${vin},${status},${soh},${soc},${cycles},${owner},${trust}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sample_batteries.csv"');
    res.send('\ufeff' + csv);
});

router.get('/sample-json', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const manufacturers = [
        { name: '宁德时代', prefix: 'CATL', models: ['麒麟电池-CTP3.0', '神行超充电池'], types: ['三元锂电池', '磷酸铁锂电池'] },
        { name: '比亚迪', prefix: 'BYD', models: ['刀片电池', 'Blade Battery V2'], types: ['磷酸铁锂电池'] },
        { name: '亿纬锂能', prefix: 'EVE', models: ['LF560K', 'LF280K'], types: ['磷酸铁锂电池'] }
    ];
    const statuses = ['在役', '已生产', '在役', '维修中'];
    const capacities = ['60kWh', '75kWh', '80kWh', '100kWh'];
    const data = [];
    const now = new Date();
    const year = now.getFullYear();
    const ts = String(Date.now()).slice(-6);

    for (let i = 1; i <= count; i++) {
        const mfg = manufacturers[Math.floor(Math.random() * manufacturers.length)];
        const model = mfg.models[Math.floor(Math.random() * mfg.models.length)];
        const type = mfg.types[Math.floor(Math.random() * mfg.types.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const rnd = String(Math.floor(Math.random() * 900000) + 100000);
        const soh = status === '在役' ? (75 + Math.floor(Math.random() * 25)) : (status === '维修中' ? (60 + Math.floor(Math.random() * 15)) : 100);
        data.push({
            id: `BAT-${year}-${mfg.prefix}-${ts}${rnd}`,
            manufacturer: mfg.name,
            model: model,
            battery_type: type,
            capacity: capacities[Math.floor(Math.random() * capacities.length)],
            batch: 'BATCH-' + year + '-' + String(Math.floor(Math.random() * 999)).padStart(3, '0'),
            production_date: `${year}-${month}-${day}`,
            vehicle_vin: 'LSGA' + String(Math.floor(Math.random() * 99999999)).padStart(8, '0'),
            status: status,
            soh: soh,
            soc: Math.floor(Math.random() * 100),
            cycles: status === '在役' ? Math.floor(Math.random() * 800) : 0,
            current_owner: ['XX新能源汽车公司', 'YY出行服务', 'ZZ物流集团'][Math.floor(Math.random() * 3)],
            trust_score: 80 + Math.floor(Math.random() * 20)
        });
    }
    res.json(data);
});

router.get('/logs', (req, res) => {
    const logs = db.prepare(`
        SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 50
    `).all();
    res.json(logs);
});

router.delete('/logs', adminRequired, (req, res) => {
    db.prepare('DELETE FROM import_logs').run();
    res.json({ success: true, message: '所有导入历史已清空' });
});

router.delete('/logs/:id', adminRequired, (req, res) => {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM import_logs WHERE id = ?').run(id);
    if (result.changes > 0) {
        res.json({ success: true, message: '记录已删除' });
    } else {
        res.status(404).json({ error: '记录不存在' });
    }
});

module.exports = router;
