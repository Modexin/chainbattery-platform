const express = require('express');
const router = express.Router();
const db = require('../db/conn');

// GET /api/search - 高级搜索电池
router.get('/', (req, res) => {
    const { keyword, status, type, manufacturer, soh_min, soh_max, date_from, date_to, sort, order, limit } = req.query;

    var sql = `SELECT * FROM batteries WHERE 1=1`;
    var params = [];

    if (keyword) {
        sql += ` AND (id LIKE ? OR manufacturer LIKE ? OR model LIKE ? OR vehicle_vin LIKE ? OR batch LIKE ? OR current_owner LIKE ?)`;
        var kw = '%' + keyword + '%';
        params.push(kw, kw, kw, kw, kw, kw);
    }
    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (type) { sql += ` AND battery_type = ?`; params.push(type); }
    if (manufacturer) { sql += ` AND manufacturer LIKE ?`; params.push('%' + manufacturer + '%'); }
    if (soh_min) { sql += ` AND soh >= ?`; params.push(parseFloat(soh_min)); }
    if (soh_max) { sql += ` AND soh <= ?`; params.push(parseFloat(soh_max)); }
    if (date_from) { sql += ` AND production_date >= ?`; params.push(date_from); }
    if (date_to) { sql += ` AND production_date <= ?`; params.push(date_to); }

    var sortField = 'created_at';
    if (sort === 'soh') sortField = 'soh';
    else if (sort === 'cycles') sortField = 'cycles';
    else if (sort === 'production_date') sortField = 'production_date';
    else if (sort === 'trust_score') sortField = 'trust_score';

    var sortOrder = (order === 'asc') ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    if (limit) {
        sql += ` LIMIT ?`;
        params.push(parseInt(limit));
    }

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
});

// GET /api/search/filters - 获取筛选选项
router.get('/filters', (req, res) => {
    const statuses = db.prepare('SELECT DISTINCT status FROM batteries').all().map(function(r) { return r.status; });
    const types = db.prepare('SELECT DISTINCT battery_type FROM batteries').all().map(function(r) { return r.battery_type; });
    const manufacturers = db.prepare('SELECT DISTINCT manufacturer FROM batteries').all().map(function(r) { return r.manufacturer; });
    res.json({ statuses: statuses, types: types, manufacturers: manufacturers });
});

module.exports = router;
