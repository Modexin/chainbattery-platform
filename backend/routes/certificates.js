const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const { adminRequired } = require('./auth');

function generateTxHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 64; i++) hash += chars.charAt(Math.floor(Math.random() * 16));
    return hash;
}

function generateDataHash() {
    var hash = '0x';
    var chars = '0123456789abcdef';
    for (var i = 0; i < 40; i++) hash += chars.charAt(Math.floor(Math.random() * 16));
    return hash;
}

function logAudit(operator, action, targetType, targetId, detail, txHash) {
    try {
        db.prepare('INSERT INTO audit_logs (operator, action, target_type, target_id, detail, tx_hash) VALUES (?, ?, ?, ?, ?, ?)')
            .run(operator || '系统', action, targetType, targetId, detail, txHash || null);
    } catch(e) { console.error('Audit log error:', e.message); }
}

// GET /api/certificates - 获取所有证书
router.get('/', (req, res) => {
    const { battery_id } = req.query;
    let rows;
    if (battery_id) {
        rows = db.prepare(`
            SELECT c.*, b.manufacturer, b.model
            FROM certificates c
            LEFT JOIN batteries b ON c.battery_id = b.id
            WHERE c.battery_id = ?
            ORDER BY c.issue_date DESC
        `).all(battery_id);
    } else {
        rows = db.prepare(`
            SELECT c.*, b.manufacturer, b.model
            FROM certificates c
            LEFT JOIN batteries b ON c.battery_id = b.id
            ORDER BY c.issue_date DESC
        `).all();
    }
    res.json(rows);
});

// POST /api/certificates - 签发证书
router.post('/', adminRequired, (req, res) => {
    const { id, battery_id, cert_type, cert_number, issuer, issue_date, expiry_date, operator } = req.body;

    if (!id || !battery_id || !cert_type || !cert_number || !issuer || !issue_date) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    const battery = db.prepare('SELECT id FROM batteries WHERE id = ?').get(battery_id);
    if (!battery) {
        return res.status(404).json({ error: '电池不存在' });
    }

    const existing = db.prepare('SELECT id FROM certificates WHERE cert_number = ?').get(cert_number);
    if (existing) {
        return res.status(409).json({ error: '证书编号已存在' });
    }

    const txHash = generateTxHash();
    const dataHash = generateDataHash();
    const blockNumber = 18923460 + Math.floor(Math.random() * 1000);

    db.prepare(`
        INSERT INTO certificates (id, battery_id, cert_type, cert_number, issuer, issue_date, expiry_date, status, data_hash, tx_hash, block_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, '有效', ?, ?, ?)
    `).run(id, battery_id, cert_type, cert_number, issuer, issue_date, expiry_date || null, dataHash, txHash, blockNumber);

    db.prepare('INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(txHash, 'issueCertificate', battery_id, blockNumber, '0xTEST005CCIC01', '成功');

    logAudit(operator || issuer, '签发证书', 'certificate', id, cert_type + ' / ' + cert_number, txHash);

    res.status(201).json({
        success: true,
        certId: id,
        certNumber: cert_number,
        txHash: txHash,
        dataHash: dataHash,
        blockNumber: blockNumber,
        message: '证书已签发并上链存证'
    });
});

// PUT /api/certificates/:id/revoke - 撤销证书
router.put('/:id/revoke', adminRequired, (req, res) => {
    const { id } = req.params;
    const { operator } = req.body;
    const cert = db.prepare('SELECT id, cert_number FROM certificates WHERE id = ?').get(id);
    if (!cert) {
        return res.status(404).json({ error: '证书不存在' });
    }
    db.prepare("UPDATE certificates SET status = '已撤销' WHERE id = ?").run(id);
    logAudit(operator || '系统', '撤销证书', 'certificate', id, '撤销证书: ' + cert.cert_number, null);
    res.json({ success: true, message: '证书已撤销' });
});

// GET /api/certificates/verify/:certNumber - 验证证书
router.get('/verify/:certNumber', (req, res) => {
    const { certNumber } = req.params;
    const cert = db.prepare(`
        SELECT c.*, b.manufacturer, b.model, b.battery_type, b.capacity
        FROM certificates c
        LEFT JOIN batteries b ON c.battery_id = b.id
        WHERE c.cert_number = ?
    `).get(certNumber);
    if (!cert) {
        return res.status(404).json({ valid: false, error: '证书编号不存在' });
    }
    res.json({ valid: cert.status === '有效', certificate: cert });
});

module.exports = router;
