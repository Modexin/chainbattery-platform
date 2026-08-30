const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const QRCode = require('qrcode');

function buildBatteryText(battery, events) {
    var lines = [];
    lines.push('=== 电池溯源信息 ===');
    lines.push('电池ID: ' + battery.id);
    lines.push('制造商: ' + battery.manufacturer);
    lines.push('型号: ' + battery.model);
    lines.push('电芯类型: ' + battery.battery_type);
    lines.push('额定容量: ' + battery.capacity);
    lines.push('生产批次: ' + (battery.batch || '-'));
    lines.push('生产日期: ' + battery.production_date);
    lines.push('当前状态: ' + battery.status);
    lines.push('SOH: ' + battery.soh + '%');
    lines.push('SOC: ' + (battery.soc || 0) + '%');
    lines.push('循环次数: ' + battery.cycles);
    lines.push('绑定车辆VIN: ' + (battery.vehicle_vin || '-'));
    lines.push('当前责任主体: ' + (battery.current_owner || '-'));
    lines.push('可信评分: ' + (battery.trust_score || 0) + '/100');
    if (battery.tx_hash) {
        lines.push('交易Hash: ' + battery.tx_hash);
        lines.push('区块高度: #' + battery.block_number);
    }
    if (events && events.length > 0) {
        lines.push('');
        lines.push('--- 生命周期事件 ---');
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            lines.push('[' + (ev.event_date || '-') + '] ' + ev.event_title);
        }
    }
    lines.push('');
    lines.push('数据来源: 区块链存证+SQLite');
    lines.push('生成时间: ' + new Date().toLocaleString('zh-CN'));
    return lines.join('\n');
}

router.get('/battery/:batteryId', async (req, res) => {
    const { batteryId } = req.params;
    const battery = db.prepare(`
        SELECT * FROM batteries WHERE id = ?
    `).get(batteryId);

    if (!battery) {
        return res.status(404).json({ error: 'Battery not found' });
    }

    const events = db.prepare(`
        SELECT event_date, event_title FROM lifecycle_events WHERE battery_id = ? ORDER BY event_date
    `).all(batteryId);

    const text = buildBatteryText(battery, events);
    try {
        const qrDataUrl = await QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: { dark: '#0a1628', light: '#ffffff' }
        });
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': imgBuffer.length
        });
        res.end(imgBuffer);
    } catch (err) {
        res.status(500).json({ error: 'QR code generation failed: ' + err.message });
    }
});

router.get('/battery/:batteryId/data', async (req, res) => {
    const { batteryId } = req.params;
    const battery = db.prepare(`
        SELECT * FROM batteries WHERE id = ?
    `).get(batteryId);

    if (!battery) {
        return res.status(404).json({ error: 'Battery not found' });
    }

    const events = db.prepare(`
        SELECT event_date, event_title FROM lifecycle_events WHERE battery_id = ? ORDER BY event_date
    `).all(batteryId);

    const text = buildBatteryText(battery, events);
    try {
        const qrDataUrl = await QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: { dark: '#0a1628', light: '#ffffff' }
        });
        res.json({
            battery_id: batteryId,
            qr_text: text,
            qr_code: qrDataUrl,
            battery_info: battery
        });
    } catch (err) {
        res.status(500).json({ error: 'QR code generation failed: ' + err.message });
    }
});

module.exports = router;
