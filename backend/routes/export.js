const express = require('express');
const router = express.Router();
const db = require('../db/conn');

function jsonToCsv(data, columns) {
    if (!data || data.length === 0) return '';
    var cols = columns || Object.keys(data[0]);
    var header = cols.join(',');
    var rows = data.map(function(row) {
        return cols.map(function(col) {
            var val = row[col];
            if (val === null || val === undefined) val = '';
            val = String(val).replace(/"/g, '""');
            if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
                val = '"' + val + '"';
            }
            return val;
        }).join(',');
    });
    return header + '\n' + rows.join('\n');
}

function generateExportTxHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 64; i++) hash += chars.charAt(Math.floor(Math.random() * 16));
    return hash;
}

// GET /api/export/:type - 导出数据 (csv/json)
router.get('/:type', (req, res) => {
    const { type } = req.params;
    const format = req.query.format || 'json';
    const { battery_id } = req.query;

    var data;
    var columns;
    var filename;

    switch(type) {
        case 'batteries':
            data = db.prepare('SELECT * FROM batteries ORDER BY created_at DESC').all();
            columns = ['id', 'manufacturer', 'model', 'battery_type', 'capacity', 'batch', 'production_date', 'vehicle_vin', 'status', 'soh', 'soc', 'cycles', 'current_owner', 'trust_score', 'tx_hash', 'block_number', 'created_at'];
            filename = 'batteries';
            break;
        case 'events':
            if (battery_id) {
                data = db.prepare('SELECT * FROM lifecycle_events WHERE battery_id = ? ORDER BY event_date ASC').all(battery_id);
            } else {
                data = db.prepare('SELECT * FROM lifecycle_events ORDER BY created_at DESC').all();
            }
            columns = ['id', 'battery_id', 'event_type', 'event_title', 'event_desc', 'submitter', 'data_hash', 'tx_hash', 'block_number', 'verified', 'event_date', 'created_at'];
            filename = 'lifecycle_events';
            break;
        case 'maintenance':
            data = db.prepare('SELECT * FROM maintenance_records ORDER BY maintenance_date DESC').all();
            columns = ['id', 'battery_id', 'maintenance_type', 'description', 'provider', 'cost', 'result', 'maintenance_date', 'next_maintenance_date', 'tx_hash', 'block_number'];
            filename = 'maintenance_records';
            break;
        case 'carbon':
            data = db.prepare('SELECT * FROM carbon_records ORDER BY record_date DESC').all();
            columns = ['id', 'battery_id', 'record_type', 'description', 'carbon_saved', 'unit', 'verifier', 'tx_hash', 'block_number', 'record_date'];
            filename = 'carbon_records';
            break;
        case 'anomalies':
            data = db.prepare('SELECT * FROM anomalies ORDER BY created_at DESC').all();
            columns = ['id', 'battery_id', 'anomaly_type', 'level', 'description', 'status', 'created_at'];
            filename = 'anomalies';
            break;
        case 'certificates':
            data = db.prepare('SELECT * FROM certificates ORDER BY issue_date DESC').all();
            columns = ['id', 'battery_id', 'cert_type', 'cert_number', 'issuer', 'issue_date', 'expiry_date', 'status', 'data_hash', 'tx_hash', 'block_number'];
            filename = 'certificates';
            break;
        case 'audit':
            data = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').all();
            columns = ['id', 'operator', 'action', 'target_type', 'target_id', 'detail', 'ip_address', 'tx_hash', 'created_at'];
            filename = 'audit_logs';
            break;
        case 'transactions':
            data = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 500').all();
            columns = ['id', 'tx_hash', 'tx_type', 'battery_id', 'block_number', 'from_addr', 'status', 'created_at'];
            filename = 'transactions';
            break;
        default:
            return res.status(400).json({ error: '未知的导出类型' });
    }

    // 记录导出审计
    try {
        var txHash = generateExportTxHash();
        db.prepare('INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash) VALUES (?, ?, ?, ?, ?, ?)')
            .run('系统', '数据导出', type, null, '导出' + data.length + '条' + type + '数据 (' + format + ')', txHash);
    } catch(e) { console.error('Export audit error:', e.message); }

    if (format === 'csv') {
        var csv = jsonToCsv(data, columns);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '_' + new Date().toISOString().slice(0,10) + '.csv"');
        res.send('\ufeff' + csv);
    } else {
        res.json({ type: type, count: data.length, exported_at: new Date().toISOString(), data: data });
    }
});

module.exports = router;
