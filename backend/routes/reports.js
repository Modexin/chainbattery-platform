const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const crypto = require('crypto');

router.get('/traceability/:batteryId', (req, res) => {
    const { batteryId } = req.params;
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(batteryId);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const events = db.prepare(`
        SELECT * FROM lifecycle_events WHERE battery_id = ? ORDER BY event_date DESC
    `).all(batteryId);
    const sohHistory = db.prepare(`
        SELECT * FROM soh_history WHERE battery_id = ? ORDER BY record_date ASC
    `).all(batteryId);
    const transfers = db.prepare(`
        SELECT * FROM transfer_records WHERE battery_id = ? ORDER BY transfer_date ASC
    `).all(batteryId);
    const maintenances = db.prepare(`
        SELECT * FROM maintenance_records WHERE battery_id = ? ORDER BY maintenance_date DESC
    `).all(batteryId);
    const anomalies = db.prepare(`
        SELECT * FROM anomalies WHERE battery_id = ? ORDER BY created_at DESC
    `).all(batteryId);
    const certificates = db.prepare(`
        SELECT * FROM certificates WHERE battery_id = ? ORDER BY issue_date DESC
    `).all(batteryId);

    const reportHash = crypto.createHash('sha256').update(
        batteryId + JSON.stringify(events) + JSON.stringify(sohHistory)
    ).digest('hex');

    res.json({
        report_type: '溯源报告',
        report_id: 'RPT-TRC-' + Date.now().toString(36).toUpperCase(),
        generated_at: new Date().toISOString(),
        data_hash: reportHash,
        battery: battery,
        lifecycle: {
            events: events,
            transfers: transfers,
            total_events: events.length
        },
        health: {
            soh_history: sohHistory,
            current_soh: battery.soh,
            current_cycles: battery.cycles
        },
        maintenance: {
            records: maintenances,
            total_count: maintenances.length,
            total_cost: maintenances.reduce((s, m) => s + (m.cost || 0), 0)
        },
        anomalies: {
            records: anomalies,
            total_count: anomalies.length,
            resolved_count: anomalies.filter(a => a.status !== '待处理').length
        },
        certificates: certificates
    });
});

router.get('/health/:batteryId', (req, res) => {
    const { batteryId } = req.params;
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(batteryId);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const sohHistory = db.prepare(`
        SELECT * FROM soh_history WHERE battery_id = ? ORDER BY record_date ASC
    `).all(batteryId);
    const maintenances = db.prepare(`
        SELECT * FROM maintenance_records WHERE battery_id = ? ORDER BY maintenance_date DESC
    `).all(batteryId);
    const anomalies = db.prepare(`
        SELECT * FROM anomalies WHERE battery_id = ? ORDER BY created_at DESC
    `).all(batteryId);

    let healthLevel = '优秀';
    if (battery.soh < 60) healthLevel = '严重';
    else if (battery.soh < 70) healthLevel = '警告';
    else if (battery.soh < 80) healthLevel = '注意';
    else if (battery.soh < 90) healthLevel = '良好';

    const avgSohDecline = sohHistory.length > 1
        ? ((sohHistory[0].soh - sohHistory[sohHistory.length - 1].soh) / sohHistory.length).toFixed(2)
        : 0;

    res.json({
        report_type: '健康报告',
        report_id: 'RPT-HLT-' + Date.now().toString(36).toUpperCase(),
        generated_at: new Date().toISOString(),
        battery: battery,
        health_level: healthLevel,
        soh_history: sohHistory,
        avg_soh_decline: parseFloat(avgSohDecline),
        maintenance_summary: {
            total: maintenances.length,
            total_cost: maintenances.reduce((s, m) => s + (m.cost || 0), 0),
            recent: maintenances.slice(0, 5)
        },
        anomaly_summary: {
            total: anomalies.length,
            unresolved: anomalies.filter(a => a.status === '待处理').length,
            recent: anomalies.slice(0, 5)
        },
        recommendations: generateHealthRecommendations(battery, sohHistory, anomalies)
    });
});

router.get('/recycling/:batteryId', (req, res) => {
    const { batteryId } = req.params;
    const battery = db.prepare('SELECT * FROM batteries WHERE id = ?').get(batteryId);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const recycleTask = db.prepare('SELECT * FROM recycling_tasks WHERE battery_id = ?').get(batteryId);
    const cascadeRecords = db.prepare(`
        SELECT * FROM cascade_utilization WHERE battery_id = ? ORDER BY created_at DESC
    `).all(batteryId);
    const carbonRecords = db.prepare(`
        SELECT * FROM carbon_records WHERE battery_id = ? ORDER BY record_date DESC
    `).all(batteryId);
    const events = db.prepare(`
        SELECT * FROM lifecycle_events WHERE battery_id = ? AND event_type IN ('回收','梯次利用','拆解','材料回收')
        ORDER BY event_date DESC
    `).all(batteryId);

    res.json({
        report_type: '回收报告',
        report_id: 'RPT-REC-' + Date.now().toString(36).toUpperCase(),
        generated_at: new Date().toISOString(),
        battery: battery,
        recycle_task: recycleTask,
        cascade_records: cascadeRecords,
        carbon_records: carbonRecords,
        total_carbon_saved: carbonRecords.reduce((s, c) => s + (c.carbon_saved || 0), 0),
        related_events: events
    });
});

router.get('/carbon', (req, res) => {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];
    if (start_date) { dateFilter += ' AND record_date >= ?'; params.push(start_date); }
    if (end_date) { dateFilter += ' AND record_date <= ?'; params.push(end_date); }

    const records = db.prepare(`
        SELECT * FROM carbon_records WHERE 1=1 ${dateFilter} ORDER BY record_date DESC
    `).all(...params);

    const byType = db.prepare(`
        SELECT record_type as name, SUM(carbon_saved) as total, COUNT(*) as count
        FROM carbon_records WHERE 1=1 ${dateFilter}
        GROUP BY record_type ORDER BY total DESC
    `).all(...params);

    const byBattery = db.prepare(`
        SELECT battery_id, SUM(carbon_saved) as total, COUNT(*) as count
        FROM carbon_records WHERE 1=1 ${dateFilter}
        GROUP BY battery_id ORDER BY total DESC LIMIT 10
    `).all(...params);

    const total = records.reduce((s, r) => s + (r.carbon_saved || 0), 0);

    res.json({
        report_type: '碳减排报告',
        report_id: 'RPT-CRB-' + Date.now().toString(36).toUpperCase(),
        generated_at: new Date().toISOString(),
        period: { start_date: start_date || '全部', end_date: end_date || '至今' },
        summary: {
            total_carbon_saved: Math.round(total * 10) / 10,
            total_records: records.length,
            equivalent_trees: Math.round(total / 20),
            equivalent_coal_saved: Math.round(total / 2.67),
            equivalent_electricity: Math.round(total / 0.785)
        },
        by_type: byType,
        top_batteries: byBattery,
        recent_records: records.slice(0, 20)
    });
});

function generateHealthRecommendations(battery, sohHistory, anomalies) {
    const recs = [];
    if (battery.soh < 60) {
        recs.push({ priority: '高', text: '电池SOH严重不足，建议立即安排退役评估和梯次利用' });
    } else if (battery.soh < 80) {
        recs.push({ priority: '中', text: '电池SOH偏低，建议增加检测频率，关注衰减趋势' });
    }
    if (battery.cycles > 800) {
        recs.push({ priority: '中', text: '循环次数较高(' + battery.cycles + '次)，建议进行深度健康检测' });
    }
    const unresolvedAnomalies = anomalies.filter(a => a.status === '待处理');
    if (unresolvedAnomalies.length > 0) {
        recs.push({ priority: '高', text: '有' + unresolvedAnomalies.length + '个未处理异常，请及时处理' });
    }
    if (sohHistory.length > 2) {
        const recentDecline = sohHistory[0].soh - sohHistory[sohHistory.length - 1].soh;
        if (recentDecline > 10) {
            recs.push({ priority: '高', text: '近期SOH下降' + recentDecline.toFixed(1) + '%，衰减速率异常' });
        }
    }
    if (recs.length === 0) {
        recs.push({ priority: '低', text: '电池状态良好，建议保持定期检测节奏' });
    }
    return recs;
}

module.exports = router;
