const Database = require('better-sqlite3');
const path = require('path');
const { DB_PATH } = require('./init');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

module.exports = db;
