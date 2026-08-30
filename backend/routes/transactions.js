const express = require('express');
const router = express.Router();
const db = require('../db/conn');

// GET /api/transactions - 获取链上交易记录
router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const txs = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?').all(limit);
    res.json(txs);
});

module.exports = router;
