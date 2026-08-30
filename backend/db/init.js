const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 数据库路径：优先使用环境变量 DB_PATH，否则使用默认路径
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'chainbattery.db');

// 确保数据库所在目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'chainbattery_salt_2026').digest('hex');
}

function initDatabase() {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS batteries (
            id TEXT PRIMARY KEY,
            manufacturer TEXT NOT NULL,
            model TEXT NOT NULL,
            battery_type TEXT NOT NULL,
            capacity TEXT NOT NULL,
            batch TEXT NOT NULL,
            production_date TEXT NOT NULL,
            vehicle_vin TEXT,
            status TEXT DEFAULT '在役',
            soh REAL DEFAULT 100,
            soc REAL DEFAULT 100,
            cycles INTEGER DEFAULT 0,
            current_owner TEXT,
            trust_score INTEGER DEFAULT 100,
            tx_hash TEXT,
            block_number INTEGER,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS lifecycle_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            battery_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_title TEXT NOT NULL,
            event_desc TEXT,
            submitter TEXT,
            data_hash TEXT,
            tx_hash TEXT,
            block_number INTEGER,
            verified INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            event_date TEXT,
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS soh_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            battery_id TEXT NOT NULL,
            soh REAL NOT NULL,
            soc REAL,
            cycles INTEGER,
            record_date TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS transfer_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            battery_id TEXT NOT NULL,
            from_party TEXT NOT NULL,
            to_party TEXT NOT NULL,
            transfer_type TEXT NOT NULL,
            tx_hash TEXT,
            block_number INTEGER,
            transfer_date TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS enterprises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            enterprise_type TEXT NOT NULL,
            role TEXT NOT NULL,
            address TEXT,
            verified INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS anomalies (
            id TEXT PRIMARY KEY,
            battery_id TEXT NOT NULL,
            anomaly_type TEXT NOT NULL,
            level TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT '待处理',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS recycling_tasks (
            id TEXT PRIMARY KEY,
            battery_id TEXT NOT NULL,
            enterprise TEXT NOT NULL,
            status TEXT NOT NULL,
            step INTEGER DEFAULT 0,
            contact TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            tx_type TEXT NOT NULL,
            battery_id TEXT,
            block_number INTEGER,
            from_addr TEXT,
            status TEXT DEFAULT '成功',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS maintenance_records (
            id TEXT PRIMARY KEY,
            battery_id TEXT NOT NULL,
            maintenance_type TEXT NOT NULL,
            description TEXT NOT NULL,
            provider TEXT NOT NULL,
            cost REAL DEFAULT 0,
            result TEXT DEFAULT '完成',
            data_hash TEXT,
            tx_hash TEXT,
            block_number INTEGER,
            maintenance_date TEXT NOT NULL,
            next_maintenance_date TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS carbon_records (
            id TEXT PRIMARY KEY,
            battery_id TEXT NOT NULL,
            record_type TEXT NOT NULL,
            description TEXT NOT NULL,
            carbon_saved REAL NOT NULL,
            unit TEXT DEFAULT 'kgCO2',
            verifier TEXT,
            tx_hash TEXT,
            block_number INTEGER,
            record_date TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operator TEXT NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            detail TEXT,
            ip_address TEXT DEFAULT '127.0.0.1',
            tx_hash TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY,
            battery_id TEXT NOT NULL,
            cert_type TEXT NOT NULL,
            cert_number TEXT NOT NULL UNIQUE,
            issuer TEXT NOT NULL,
            issue_date TEXT NOT NULL,
            expiry_date TEXT,
            status TEXT DEFAULT '有效',
            data_hash TEXT,
            tx_hash TEXT,
            block_number INTEGER,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS cascade_utilization (
            id TEXT PRIMARY KEY,
            battery_id TEXT NOT NULL,
            source_vehicle_vin TEXT,
            evaluation_result TEXT,
            evaluation_score REAL,
            cascade_scenario TEXT,
            target_project TEXT,
            installed_capacity TEXT,
            status TEXT DEFAULT '评估中',
            start_date TEXT,
            expected_end_date TEXT,
            actual_end_date TEXT,
            operator TEXT,
            data_hash TEXT,
            tx_hash TEXT,
            block_number INTEGER,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (battery_id) REFERENCES batteries(id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            severity TEXT DEFAULT 'info',
            target_id TEXT,
            target_type TEXT,
            read_status INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS import_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_type TEXT NOT NULL,
            file_name TEXT,
            total_rows INTEGER DEFAULT 0,
            success_rows INTEGER DEFAULT 0,
            failed_rows INTEGER DEFAULT 0,
            error_detail TEXT,
            operator TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'visitor',
            token TEXT,
            token_expires_at TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            last_login_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_events_battery ON lifecycle_events(battery_id);
        CREATE INDEX IF NOT EXISTS idx_soh_battery ON soh_history(battery_id);
        CREATE INDEX IF NOT EXISTS idx_transfer_battery ON transfer_records(battery_id);
        CREATE INDEX IF NOT EXISTS idx_anomaly_battery ON anomalies(battery_id);
        CREATE INDEX IF NOT EXISTS idx_recycle_battery ON recycling_tasks(battery_id);
        CREATE INDEX IF NOT EXISTS idx_maintenance_battery ON maintenance_records(battery_id);
        CREATE INDEX IF NOT EXISTS idx_carbon_battery ON carbon_records(battery_id);
        CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_cert_battery ON certificates(battery_id);
        CREATE INDEX IF NOT EXISTS idx_cascade_battery ON cascade_utilization(battery_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_status);
    `);

    // Initialize admin account
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
        db.prepare(`
            INSERT INTO users (username, password, role, email, created_at)
            VALUES (?, ?, 'admin', 'admin@chainbattery.local', datetime('now','localtime'))
        `).run('admin', hashPassword('admin123'));
        console.log('Admin account created: admin / admin123');
    }

    console.log('Database initialized at:', DB_PATH);
    db.close();
}

if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase, DB_PATH };
