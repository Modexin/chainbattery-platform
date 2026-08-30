const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据库已初始化
const { initDatabase } = require('./db/init');
const DB_PATH = require('./db/init').DB_PATH;
if (!fs.existsSync(DB_PATH)) {
    console.log('Database not found, initializing...');
    initDatabase();
    require('./db/seed').seedDatabase();
}

app.use(cors());
app.use(express.json());

// 静态文件服务 - 前端（带缓存优化）
app.use(express.static(path.join(__dirname, '..', 'src'), {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

// API 路由
app.use('/api/batteries', require('./routes/batteries'));
app.use('/api/events', require('./routes/events'));
app.use('/api/anomalies', require('./routes/anomalies'));
app.use('/api/recycling', require('./routes/recycling'));
app.use('/api/enterprises', require('./routes/enterprises'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/search', require('./routes/search'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/carbon', require('./routes/carbon'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/export', require('./routes/export'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/cascade', require('./routes/cascade'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/import', require('./routes/import'));
app.use('/api/qrcode', require('./routes/qrcode'));
app.use('/api/auth', require('./routes/auth'));

// 根路由返回前端
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'index.html'));
});

// 合约信息接口
app.get('/api/contracts', (req, res) => {
    res.json({
        network: 'Hardhat Local Network',
        blockNumber: 18923460,
        gasPrice: '2.5 Gwei',
        contracts: {
            BatteryRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            LifecycleRecord: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
            RoleManager: '0x9fE46736679d2D9e651096d44eE7eE35C2684Cd8',
            BatteryTransfer: '0xCf7Ed3AccA5a467e9e704C703E9D30EA5c4D8fE5',
            AnomalyDetector: '0xDc64a140Aa3E981100a9becA4E685f962f0c6E39',
            HealthDataStore: '0x5FC8d32690cc91D4c39d9d3abcBD16982F725909',
            RecycleTracker: '0x71C95911E9d4d11177a5A3289Dd8D0e6F9e7C4E3',
            MaintenanceTracker: '0x82aF9b8c3B1D7e0a5F4c6E2d8B9a1C3d5E7f9A0b',
            CarbonCredit: '0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0',
            CertificateRegistry: '0xB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1',
            CascadeManager: '0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2'
        }
    });
});

// 角色定义
app.get('/api/roles', (req, res) => {
    res.json({
        BATTERY_MANUFACTURER: { name: '电池生产企业', color: 'blue', permissions: ['registerBattery', 'uploadProductionData'] },
        VEHICLE_MANUFACTURER: { name: '汽车生产企业', color: 'cyan', permissions: ['bindVehicle', 'uploadAssemblyData'] },
        MAINTENANCE_PROVIDER: { name: '维修机构', color: 'orange', permissions: ['uploadMaintenance', 'uploadRepair'] },
        TESTING_PROVIDER: { name: '检测机构', color: 'purple', permissions: ['uploadTestReport', 'uploadSOH'] },
        RECYCLER: { name: '回收企业', color: 'green', permissions: ['receiveBattery', 'uploadRecycle', 'cascadeUtilization'] },
        REGULATOR: { name: '监管机构', color: 'red', permissions: ['auditAll', 'viewAnomalies', 'viewStatistics'] }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  链池溯源后端服务已启动');
    console.log('  端口: ' + PORT);
    console.log('  本地: http://localhost:' + PORT);
    console.log('  API:  http://localhost:' + PORT + '/api');
    console.log('  数据库: ' + DB_PATH);
    console.log('========================================');
});
