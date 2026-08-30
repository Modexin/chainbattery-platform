const express = require('express');
const router = express.Router();
const db = require('../db/conn');

router.get('/', (req, res) => {
    // 合并多个 COUNT 查询为 2 次查询，大幅减少数据库往返
    const batteryStats = db.prepare(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = '在役' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = '梯次利用' THEN 1 ELSE 0 END) as cascade,
            SUM(CASE WHEN status = '已回收' THEN 1 ELSE 0 END) as recycled,
            SUM(CASE WHEN date(created_at) = date('now','localtime') THEN 1 ELSE 0 END) as todayNew,
            AVG(CASE WHEN status != '已回收' THEN soh END) as avgSoh
        FROM batteries
    `).get();

    const otherStats = db.prepare(`
        SELECT
            (SELECT COUNT(*) FROM enterprises) as totalEnterprises,
            (SELECT COUNT(*) FROM lifecycle_events) as totalRecords,
            (SELECT COUNT(*) FROM anomalies WHERE status = '待处理') as anomalyAlerts,
            (SELECT COALESCE(SUM(carbon_saved), 0) FROM carbon_records) as totalCarbonSaved,
            (SELECT COUNT(*) FROM maintenance_records) as totalMaintenance,
            (SELECT COUNT(*) FROM certificates WHERE status = '有效') as totalCertificates,
            (SELECT COUNT(*) FROM audit_logs) as totalAuditLogs
    `).get();

    const totalBatteries = batteryStats.total;
    const recycled = batteryStats.recycled;
    const recyclingRate = totalBatteries > 0 ? Math.round((recycled / totalBatteries) * 1000) / 10 : 0;

    res.json({
        totalBatteries: totalBatteries,
        activeBatteries: batteryStats.active,
        cascadeUtilization: batteryStats.cascade,
        recycled: recycled,
        anomalyAlerts: otherStats.anomalyAlerts,
        todayNew: batteryStats.todayNew,
        totalEnterprises: otherStats.totalEnterprises,
        totalRecords: otherStats.totalRecords,
        recyclingRate: recyclingRate,
        avgSOH: Math.round((batteryStats.avgSoh || 0) * 10) / 10,
        totalCarbonSaved: Math.round(otherStats.totalCarbonSaved * 10) / 10,
        totalMaintenance: otherStats.totalMaintenance,
        totalCertificates: otherStats.totalCertificates,
        totalAuditLogs: otherStats.totalAuditLogs
    });
});

router.get('/status-dist', (req, res) => {
    const rows = db.prepare("SELECT status as name, COUNT(*) as value FROM batteries GROUP BY status").all();
    const colors = {
        '已生产': '#64748b', '在役': '#3b82f6', '维修中': '#f59e0b',
        '待退役': '#8b5cf6', '梯次利用': '#06b6d4', '已回收': '#10b981', '生命周期结束': '#475569'
    };
    const result = rows.map(r => ({
        name: r.name,
        value: r.value,
        color: colors[r.name] || '#64748b'
    }));
    res.json(result);
});

router.get('/type-dist', (req, res) => {
    const rows = db.prepare("SELECT battery_type as name, COUNT(*) as value FROM batteries GROUP BY battery_type").all();
    const result = rows.map(r => ({ name: r.name, value: r.value }));
    res.json(result);
});

router.get('/lifecycle-trend', (req, res) => {
    const rows = db.prepare(`
        SELECT
            strftime('%Y-%m', event_date) as month,
            COUNT(CASE WHEN event_type = '电池生产' OR event_type = '注册' THEN 1 END) as registrations,
            COUNT(*) as records
        FROM lifecycle_events
        WHERE event_date IS NOT NULL
        GROUP BY strftime('%Y-%m', event_date)
        ORDER BY month ASC
        LIMIT 12
    `).all();

    const anomalyRows = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM anomalies
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
        LIMIT 12
    `).all();

    var anomalyMap = {};
    anomalyRows.forEach(function(r) { anomalyMap[r.month] = r.count; });

    if (rows.length === 0) {
        var now = new Date();
        var months = [];
        for (var i = 11; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        return res.json({ months: months, registrations: months.map(()=>0), records: months.map(()=>0), anomalies: months.map(()=>0) });
    }

    res.json({
        months: rows.map(r => r.month),
        registrations: rows.map(r => r.registrations || 0),
        records: rows.map(r => r.records || 0),
        anomalies: rows.map(r => anomalyMap[r.month] || 0)
    });
});

router.get('/recycling-trend', (req, res) => {
    const rows = db.prepare(`
        SELECT
            strftime('%Y-%m', created_at) as month,
            COUNT(*) as total,
            SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed
        FROM recycling_tasks
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
        LIMIT 12
    `).all();

    if (rows.length === 0) {
        var now = new Date();
        var months = [];
        for (var i = 11; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        return res.json({ months: months, rates: months.map(()=>0) });
    }

    res.json({
        months: rows.map(r => r.month),
        rates: rows.map(r => r.total > 0 ? Math.round((r.completed / r.total) * 1000) / 10 : 0)
    });
});

router.get('/enterprise-dist', (req, res) => {
    const manufacturers = db.prepare("SELECT COUNT(*) as count FROM enterprises WHERE role = 'BATTERY_MANUFACTURER'").get().count;
    const vehicleMakers = db.prepare("SELECT COUNT(*) as count FROM enterprises WHERE role = 'VEHICLE_MANUFACTURER'").get().count;
    const maintenance = db.prepare("SELECT COUNT(*) as count FROM enterprises WHERE role = 'MAINTENANCE_PROVIDER'").get().count;
    const testing = db.prepare("SELECT COUNT(*) as count FROM enterprises WHERE role = 'TESTING_PROVIDER'").get().count;
    const recyclers = db.prepare("SELECT COUNT(*) as count FROM enterprises WHERE role = 'RECYCLER'").get().count;
    res.json({
        manufacturers: manufacturers,
        vehicleMakers: vehicleMakers,
        maintenance: maintenance,
        testing: testing,
        recyclers: recyclers
    });
});

router.get('/region-dist', (req, res) => {
    const rows = db.prepare(`
        SELECT
            CASE
                WHEN current_owner LIKE '%广东%' OR current_owner LIKE '%深圳%' OR current_owner LIKE '%广州%' THEN '广东'
                WHEN current_owner LIKE '%江苏%' OR current_owner LIKE '%南京%' THEN '江苏'
                WHEN current_owner LIKE '%上海%' THEN '上海'
                WHEN current_owner LIKE '%北京%' THEN '北京'
                WHEN current_owner LIKE '%浙江%' OR current_owner LIKE '%杭州%' THEN '浙江'
                WHEN current_owner LIKE '%四川%' OR current_owner LIKE '%成都%' THEN '四川'
                WHEN current_owner LIKE '%湖北%' OR current_owner LIKE '%武汉%' THEN '湖北'
                WHEN current_owner LIKE '%陕西%' OR current_owner LIKE '%西安%' THEN '陕西'
                WHEN current_owner LIKE '%合肥%' OR current_owner LIKE '%安徽%' THEN '安徽'
                ELSE '其他'
            END as region,
            COUNT(*) as count
        FROM batteries
        WHERE current_owner IS NOT NULL AND current_owner != ''
        GROUP BY region
        ORDER BY count DESC
    `).all();

    if (rows.length === 0) {
        const mfgRows = db.prepare(`
            SELECT
                CASE
                    WHEN manufacturer LIKE '%宁德%' OR manufacturer LIKE '%CATL%' THEN '福建'
                    WHEN manufacturer LIKE '%比亚迪%' OR manufacturer LIKE '%BYD%' THEN '广东'
                    WHEN manufacturer LIKE '%国轩%' THEN '安徽'
                    WHEN manufacturer LIKE '%亿纬%' THEN '湖北'
                    WHEN manufacturer LIKE '%中创%' THEN '江苏'
                    WHEN manufacturer LIKE '%蜂巢%' THEN '江苏'
                    ELSE '其他'
                END as region,
                COUNT(*) as count
            FROM batteries
            GROUP BY region
            ORDER BY count DESC
        `).all();
        return res.json(mfgRows.map(r => ({ name: r.region, value: r.count })));
    }

    res.json(rows.map(r => ({ name: r.region, value: r.count })));
});

// 合并所有 Dashboard 图表数据为单次请求，减少 5 次 HTTP 往返为 1 次
router.get('/dashboard', (req, res) => {
    const statusDist = db.prepare("SELECT status as name, COUNT(*) as value FROM batteries GROUP BY status").all();
    const colors = {
        '已生产': '#64748b', '在役': '#3b82f6', '维修中': '#f59e0b',
        '待退役': '#8b5cf6', '梯次利用': '#06b6d4', '已回收': '#10b981', '生命周期结束': '#475569'
    };

    const typeDist = db.prepare("SELECT battery_type as name, COUNT(*) as value FROM batteries GROUP BY battery_type").all();

    const lifecycleRows = db.prepare(`
        SELECT
            strftime('%Y-%m', event_date) as month,
            COUNT(CASE WHEN event_type = '电池生产' OR event_type = '注册' THEN 1 END) as registrations,
            COUNT(*) as records
        FROM lifecycle_events
        WHERE event_date IS NOT NULL
        GROUP BY strftime('%Y-%m', event_date)
        ORDER BY month ASC
        LIMIT 12
    `).all();

    const anomalyRows = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM anomalies
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
        LIMIT 12
    `).all();
    var anomalyMap = {};
    anomalyRows.forEach(function(r) { anomalyMap[r.month] = r.count; });

    const regionDist = db.prepare(`
        SELECT
            CASE
                WHEN current_owner LIKE '%广东%' OR current_owner LIKE '%深圳%' OR current_owner LIKE '%广州%' THEN '广东'
                WHEN current_owner LIKE '%江苏%' OR current_owner LIKE '%南京%' THEN '江苏'
                WHEN current_owner LIKE '%上海%' THEN '上海'
                WHEN current_owner LIKE '%北京%' THEN '北京'
                WHEN current_owner LIKE '%浙江%' OR current_owner LIKE '%杭州%' THEN '浙江'
                WHEN current_owner LIKE '%四川%' OR current_owner LIKE '%成都%' THEN '四川'
                WHEN current_owner LIKE '%湖北%' OR current_owner LIKE '%武汉%' THEN '湖北'
                WHEN current_owner LIKE '%陕西%' OR current_owner LIKE '%西安%' THEN '陕西'
                WHEN current_owner LIKE '%合肥%' OR current_owner LIKE '%安徽%' THEN '安徽'
                ELSE '其他'
            END as region,
            COUNT(*) as count
        FROM batteries
        WHERE current_owner IS NOT NULL AND current_owner != ''
        GROUP BY region
        ORDER BY count DESC
    `).all();

    const recyclingRows = db.prepare(`
        SELECT
            strftime('%Y-%m', created_at) as month,
            COUNT(*) as total,
            SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed
        FROM recycling_tasks
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
        LIMIT 12
    `).all();

    function emptyMonths() {
        var now = new Date();
        var months = [];
        for (var i = 11; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        return months;
    }

    res.json({
        statusDist: statusDist.map(r => ({ name: r.name, value: r.value, color: colors[r.name] || '#64748b' })),
        typeDist: typeDist.map(r => ({ name: r.name, value: r.value })),
        lifecycleTrend: lifecycleRows.length === 0
            ? { months: emptyMonths(), registrations: emptyMonths().map(()=>0), records: emptyMonths().map(()=>0), anomalies: emptyMonths().map(()=>0) }
            : {
                months: lifecycleRows.map(r => r.month),
                registrations: lifecycleRows.map(r => r.registrations || 0),
                records: lifecycleRows.map(r => r.records || 0),
                anomalies: lifecycleRows.map(r => anomalyMap[r.month] || 0)
            },
        regionDist: regionDist.map(r => ({ name: r.region, value: r.count })),
        recyclingTrend: recyclingRows.length === 0
            ? { months: emptyMonths(), rates: emptyMonths().map(()=>0) }
            : {
                months: recyclingRows.map(r => r.month),
                rates: recyclingRows.map(r => r.total > 0 ? Math.round((r.completed / r.total) * 1000) / 10 : 0)
            }
    });
});

module.exports = router;
