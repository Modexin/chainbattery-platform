const express = require('express');
const router = express.Router();
const db = require('../db/conn');

router.get('/', (req, res) => {
    const { severity, category, status } = req.query;
    let alerts = [];

    const sevMap = { '高危': '严重', '中危': '警告', '低危': '提示', '严重': '严重', '警告': '警告', '提示': '提示' };

    let anomalySql = `SELECT id, battery_id, anomaly_type, level, description, status, created_at FROM anomalies WHERE 1=1`;
    const anomalyParams = [];
    if (status) { anomalySql += ' AND status = ?'; anomalyParams.push(status); }
    anomalySql += ' ORDER BY created_at DESC';
    const anomalies = db.prepare(anomalySql).all(...anomalyParams);
    anomalies.forEach(a => {
        var mappedSev = sevMap[a.level] || a.level || '提示';
        if (!severity || mappedSev === severity) {
            alerts.push({
                id: 'ANOM-' + a.id,
                source: 'anomaly',
                category: '异常告警',
                severity: mappedSev,
                title: a.anomaly_type,
                description: a.description,
                battery_id: a.battery_id,
                status: a.status,
                created_at: a.created_at
            });
        }
    });

    const upcomingMaint = db.prepare(`
        SELECT id, battery_id, maintenance_type, description, provider, next_maintenance_date,
               'maintenance' as source, '保养到期' as category
        FROM maintenance_records
        WHERE next_maintenance_date IS NOT NULL
        AND next_maintenance_date <= date('now','localtime','+30 days')
        ORDER BY next_maintenance_date ASC
    `).all();
    upcomingMaint.forEach(m => {
        const daysLeft = Math.ceil((new Date(m.next_maintenance_date) - new Date()) / 86400000);
        var sev, title;
        if (daysLeft < 0) {
            sev = '严重';
            title = m.maintenance_type + '已逾期';
        } else if (daysLeft <= 7) {
            sev = '严重';
            title = m.maintenance_type + '即将到期';
        } else if (daysLeft <= 14) {
            sev = '警告';
            title = m.maintenance_type + '即将到期';
        } else {
            sev = '提示';
            title = m.maintenance_type + '即将到期';
        }
        alerts.push({
            id: 'MAINT-' + m.id,
            source: 'maintenance',
            category: '保养到期',
            severity: sev,
            title: title,
            description: m.description + ' | 保养商: ' + m.provider + (daysLeft < 0 ? ' | 已逾期' + Math.abs(daysLeft) + '天' : ' | 剩余' + daysLeft + '天'),
            battery_id: m.battery_id,
            status: daysLeft < 0 ? '已逾期' : '待处理',
            due_date: m.next_maintenance_date,
            days_left: daysLeft,
            created_at: m.next_maintenance_date
        });
    });

    const lowSohBatteries = db.prepare(`
        SELECT id, manufacturer, model, soh, cycles, status
        FROM batteries
        WHERE soh < 80 AND status = '在役'
        ORDER BY soh ASC
    `).all();
    lowSohBatteries.forEach(b => {
        alerts.push({
            id: 'SOH-' + b.id,
            source: 'soh',
            category: '健康预警',
            severity: b.soh < 60 ? '严重' : '警告',
            title: '电池SOH过低',
            description: b.manufacturer + ' ' + b.model + ' SOH: ' + b.soh + '%',
            battery_id: b.id,
            status: '待处理',
            created_at: new Date().toISOString()
        });
    });

    const expiringCerts = db.prepare(`
        SELECT id, battery_id, cert_type, cert_number, issuer, expiry_date,
               'certificate' as source, '证书到期' as category
        FROM certificates
        WHERE status = '有效'
        AND expiry_date IS NOT NULL
        AND expiry_date <= date('now','localtime','+60 days')
        ORDER BY expiry_date ASC
    `).all();
    expiringCerts.forEach(c => {
        const daysLeft = Math.ceil((new Date(c.expiry_date) - new Date()) / 86400000);
        alerts.push({
            id: 'CERT-' + c.id,
            source: 'certificate',
            category: '证书到期',
            severity: daysLeft <= 7 ? '严重' : daysLeft <= 30 ? '警告' : '提示',
            title: c.cert_type + '即将到期',
            description: '证书编号: ' + c.cert_number + ' | 签发: ' + c.issuer,
            battery_id: c.battery_id,
            status: '待处理',
            due_date: c.expiry_date,
            days_left: daysLeft,
            created_at: c.expiry_date
        });
    });

    if (category) {
        alerts = alerts.filter(a => a.category === category);
    }
    if (severity) {
        alerts = alerts.filter(a => a.severity === severity);
    }

    const severityOrder = { '严重': 0, '警告': 1, '提示': 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

    res.json({
        total: alerts.length,
        critical: alerts.filter(a => a.severity === '严重').length,
        warning: alerts.filter(a => a.severity === '警告').length,
        info: alerts.filter(a => a.severity === '提示').length,
        byCategory: {
            '异常告警': alerts.filter(a => a.category === '异常告警').length,
            '保养到期': alerts.filter(a => a.category === '保养到期').length,
            '健康预警': alerts.filter(a => a.category === '健康预警').length,
            '证书到期': alerts.filter(a => a.category === '证书到期').length
        },
        alerts: alerts
    });
});

router.get('/summary', (req, res) => {
    const anomalyCount = db.prepare("SELECT COUNT(*) as c FROM anomalies WHERE status = '待处理'").get().c;
    const maintCount = db.prepare(`
        SELECT COUNT(*) as c FROM maintenance_records
        WHERE next_maintenance_date IS NOT NULL
        AND next_maintenance_date <= date('now','localtime','+30 days')
    `).get().c;
    const lowSohCount = db.prepare("SELECT COUNT(*) as c FROM batteries WHERE soh < 80 AND status = '在役'").get().c;
    const expCertCount = db.prepare(`
        SELECT COUNT(*) as c FROM certificates
        WHERE status = '有效' AND expiry_date IS NOT NULL
        AND expiry_date <= date('now','localtime','+60 days')
    `).get().c;

    res.json({
        total: anomalyCount + maintCount + lowSohCount + expCertCount,
        anomaly: anomalyCount,
        maintenance: maintCount,
        lowSoh: lowSohCount,
        expiringCert: expCertCount
    });
});

module.exports = router;
