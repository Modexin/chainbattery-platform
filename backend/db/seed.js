const Database = require('better-sqlite3');
const path = require('path');
const { DB_PATH } = require('./init');

function seedDatabase() {
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = OFF');

    // Clear existing data
    db.exec('DELETE FROM transactions; DELETE FROM recycling_tasks; DELETE FROM anomalies; DELETE FROM transfer_records; DELETE FROM soh_history; DELETE FROM lifecycle_events; DELETE FROM batteries; DELETE FROM enterprises; DELETE FROM maintenance_records; DELETE FROM carbon_records; DELETE FROM audit_logs; DELETE FROM certificates; DELETE FROM cascade_utilization; DELETE FROM notifications; DELETE FROM import_logs;');

    // ===== Seed Enterprises =====
    const insertEnterprise = db.prepare(`INSERT INTO enterprises (name, enterprise_type, role, address, verified) VALUES (?, ?, ?, ?, 1)`);
    const enterprises = [
        ['宁德时代', '电池生产企业', 'BATTERY_MANUFACTURER', '0xABC1234DEF5678'],
        ['比亚迪', '电池生产企业', 'BATTERY_MANUFACTURER', '0xDEF5678ABC1234'],
        ['国轩高科', '电池生产企业', 'BATTERY_MANUFACTURER', '0xGHI9012JKL3456'],
        ['亿纬锂能', '电池生产企业', 'BATTERY_MANUFACTURER', '0xMNO7890PQR1234'],
        ['比亚迪汽车', '汽车生产企业', 'VEHICLE_MANUFACTURER', '0xRST5678UVW9012'],
        ['蔚来汽车', '汽车生产企业', 'VEHICLE_MANUFACTURER', '0xUVW9012RST5678'],
        ['小鹏汽车', '汽车生产企业', 'VEHICLE_MANUFACTURER', '0xXYZ3456ABC7890'],
        ['北汽新能源', '汽车生产企业', 'VEHICLE_MANUFACTURER', '0xPQR1234MNO5678'],
        ['深圳检测中心', '检测机构', 'TESTING_PROVIDER', '0xTEST001CENTER1'],
        ['广州检测中心', '检测机构', 'TESTING_PROVIDER', '0xTEST002CENTER2'],
        ['合肥检测中心', '检测机构', 'TESTING_PROVIDER', '0xTEST003CENTER3'],
        ['上海检测中心', '检测机构', 'TESTING_PROVIDER', '0xTEST004CENTER4'],
        ['中检集团', '检测机构', 'TESTING_PROVIDER', '0xTEST005CCIC01'],
        ['比亚迪4S店', '维修机构', 'MAINTENANCE_PROVIDER', '0xMAINT001BYD44S'],
        ['北汽4S店', '维修机构', 'MAINTENANCE_PROVIDER', '0xMAINT002BAIC4S'],
        ['格林美', '回收企业', 'RECYCLER', '0xRECYCLE001GEM'],
        ['浙江XX储能科技', '回收企业', 'RECYCLER', '0xRECYCLE002ZJES'],
        ['合肥XX回收企业', '回收企业', 'RECYCLER', '0xRECYCLE003HFRE'],
        ['深圳XX回收企业', '回收企业', 'RECYCLER', '0xRECYCLE004SZRE'],
        ['广州XX回收企业', '回收企业', 'RECYCLER', '0xRECYCLE005GZRE'],
        ['上海XX回收企业', '回收企业', 'RECYCLER', '0xRECYCLE006SHRE'],
        ['广东XX通信科技', '回收企业', 'RECYCLER', '0xRECYCLE007GDCT'],
        ['国家工信部', '监管机构', 'REGULATOR', '0xREGULATOR001MI']
    ];
    const insertMany = db.transaction((items) => {
        for (const item of items) insertEnterprise.run(...item);
    });
    insertMany(enterprises);

    // ===== Seed Batteries =====
    const insertBattery = db.prepare(`INSERT INTO batteries (id, manufacturer, model, battery_type, capacity, batch, production_date, vehicle_vin, status, soh, soc, cycles, current_owner, trust_score, tx_hash, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const batteries = [
        ['BAT-2026-CATL-00001852', '宁德时代', 'CTP3.0-100kWh', '三元锂', '100 kWh', 'B202603-CT', '2022-03-10', 'VIN20220401CATL001', '在役', 86, 72, 560, '深圳XX新能源租赁公司', 86, '0x8a7b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', 18923456],
        ['BAT-2026-BYD-00002301', '比亚迪', 'Blade-72kWh', '磷酸铁锂', '72 kWh', 'B202602-BYD', '2022-01-20', 'VIN20220201BYD0002', '在役', 89, 85, 480, '广州XX网约车公司', 91, '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a1c', 18920001],
        ['BAT-2026-GOTION-00000456', '国轩高科', 'Gotion-50kWh', '磷酸铁锂', '50 kWh', 'B202511-GT', '2021-06-15', 'VIN20210701GT0003', '待退役', 68, 45, 1200, '合肥XX出租车公司', 72, '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b2', 18915000],
        ['BAT-2026-CATL-00000987', '宁德时代', 'CTP2.0-60kWh', '三元锂', '60 kWh', 'B202601-CT', '2020-09-10', 'VIN20200915CT0004', '梯次利用', 62, 0, 1800, '浙江XX储能科技有限公司', 95, '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b3c4', 18910000],
        ['BAT-2026-EVE-00001234', '亿纬锂能', 'EVE-LF280K', '磷酸铁锂', '75 kWh', 'B202604-EVE', '2019-11-20', 'VIN20191201EVE0005', '已回收', 0, 0, 2200, '格林美报废回收中心', 100, '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b4c5', 18905000]
    ];
    const insertBatteries = db.transaction((items) => {
        for (const item of items) insertBattery.run(...item);
    });
    insertBatteries(batteries);

    // ===== Seed Lifecycle Events =====
    const insertEvent = db.prepare(`INSERT INTO lifecycle_events (battery_id, event_type, event_title, event_desc, submitter, data_hash, tx_hash, block_number, verified, event_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`);
    const events = [
        ['BAT-2026-CATL-00001852', '电池生产', '电池生产完成', '宁德时代宁德工厂3号产线', '宁德时代', '0xab12cd34ef56', '0x8a7b3c4d5e6f', 18923456, '2022-03-10'],
        ['BAT-2026-CATL-00001852', '质量检测', '出厂质量检测通过', '容量测试: 100.2kWh / 内阻: 0.8m / 绝缘: 通过', '中检集团', '0xcd34ef56ab78', '0x9b8c7d6e5f4a', 18923457, '2022-03-15'],
        ['BAT-2026-CATL-00001852', '装配车辆', '装配至车辆 VIN20220401CATL001', '车型: 比亚迪汉EV / 电池包编号: PCK-001', '比亚迪汽车', '0xef56ab78cd90', '0xa9b8c7d6e5f4', 18923458, '2022-04-01'],
        ['BAT-2026-CATL-00001852', '车辆交付', '车辆交付用户', '交付地: 深圳 / 交付方式: 4S店直销', '比亚迪汽车', '0x78cd90ef12ab', '0xb9c8d7e6f5a4', 18923459, '2022-04-05'],
        ['BAT-2026-CATL-00001852', '电池检测', '常规健康检测', 'SOH: 91% / SOC: 68% / 循环次数: 420次', '深圳检测中心', '0x90ef12ab34cd', '0xc9d8e7f6a5b4', 18923460, '2024-06-11'],
        ['BAT-2026-CATL-00001852', '维修记录', '更换2号电芯模组', '故障原因: 电芯电压异常 / 维修机构: 比亚迪4S店 / 更换模组: MOD-2-REV', '比亚迪4S店', '0x12ab34cd56ef', '0xd9e8f7a6b5c4', 18923461, '2025-02-13'],
        ['BAT-2026-CATL-00001852', '电池检测', '年度健康检测', 'SOH: 86% / SOC: 72% / 循环次数: 560次', '深圳检测中心', '0x34cd56ef78ab', '0xe9f8a7b6c5d4', 18923462, '2026-08-20'],
        ['BAT-2026-BYD-00002301', '电池生产', '电池生产完成', '比亚迪弗迪电池西安工厂', '比亚迪', '0xa1b2c3d4e5f6', '0x1a2b3c4d5e6f', 18920001, '2022-01-20'],
        ['BAT-2026-BYD-00002301', '质量检测', '出厂质量检测通过', '容量: 72.1kWh / 内阻: 1.2m', '中检集团', '0xb2c3d4e5f6a1', '0x2a3b4c5d6e7f', 18920002, '2022-01-25'],
        ['BAT-2026-BYD-00002301', '装配车辆', '装配至车辆 VIN20220201BYD0002', '车型: 比亚迪秦PLUS EV', '比亚迪汽车', '0xc3d4e5f6a1b2', '0x3a4b5c6d7e8f', 18920003, '2022-02-10'],
        ['BAT-2026-BYD-00002301', '电池检测', '常规健康检测', 'SOH: 93% / 循环次数: 320次', '广州检测中心', '0xd4e5f6a1b2c3', '0x4a5b6c7d8e9f', 18920004, '2024-03-15'],
        ['BAT-2026-BYD-00002301', '电池检测', '年度健康检测', 'SOH: 89% / 循环次数: 480次', '广州检测中心', '0xe5f6a1b2c3d4', '0x5a6b7c8d9eaf', 18920005, '2026-07-10'],
        ['BAT-2026-GOTION-00000456', '电池生产', '电池生产完成', '国轩高科合肥工厂', '国轩高科', '0xf1a2b3c4d5e6', '0x2b3c4d5e6f7a', 18915000, '2021-06-15'],
        ['BAT-2026-GOTION-00000456', '质量检测', '出厂质量检测通过', '容量: 50.1kWh', '中检集团', '0xa2b3c4d5e6f1', '0x3b4c5d6e7f8a', 18915001, '2021-06-20'],
        ['BAT-2026-GOTION-00000456', '装配车辆', '装配至车辆', '车型: 北汽EU5', '北汽新能源', '0xb3c4d5e6f1a2', '0x4c5d6e7f8a9b', 18915002, '2021-07-01'],
        ['BAT-2026-GOTION-00000456', '维修记录', '更换4号电芯模组', '电芯一致性异常', '北汽4S店', '0xc4d5e6f1a2b3', '0x5d6e7f8a9bac', 18915003, '2023-05-10'],
        ['BAT-2026-GOTION-00000456', '事故记录', '车辆碰撞事故', '电池包底部轻微变形 / SOH下降至72%', '保险公司', '0xd5e6f1a2b3c4', '0x6e7f8a9bacbd', 18915004, '2025-08-20'],
        ['BAT-2026-GOTION-00000456', '电池检测', '退役前检测', 'SOH: 68% / 建议退役', '合肥检测中心', '0xe6f1a2b3c4d5', '0x7f8a9bacbdec', 18915005, '2026-06-10'],
        ['BAT-2026-CATL-00000987', '电池生产', '电池生产完成', '宁德时代宁德工厂1号产线', '宁德时代', '0x1a2b3c4d5e6f', '0x3c4d5e6f7a8b', 18910000, '2020-09-10'],
        ['BAT-2026-CATL-00000987', '质量检测', '出厂质量检测通过', '容量: 60.1kWh', '中检集团', '0x2b3c4d5e6f1a', '0x4d5e6f7a8b9c', 18910001, '2020-09-15'],
        ['BAT-2026-CATL-00000987', '装配车辆', '装配至车辆', '车型: 蔚来ES6', '蔚来汽车', '0x3c4d5e6f1a2b', '0x5e6f7a8b9c0d', 18910002, '2020-10-01'],
        ['BAT-2026-CATL-00000987', '电池检测', '健康检测', 'SOH: 82%', '上海检测中心', '0x4d5e6f1a2b3c', '0x6f7a8b9c0d1e', 18910003, '2022-12-05'],
        ['BAT-2026-CATL-00000987', '电池检测', '健康检测', 'SOH: 70%', '上海检测中心', '0x5e6f1a2b3c4d', '0x7a8b9c0d1e2f', 18910004, '2024-03-20'],
        ['BAT-2026-CATL-00000987', '退役', '电池退役', 'SOH低于65% / 达到退役标准', '蔚来汽车', '0x6f1a2b3c4d5e', '0x8b9c0d1e2f3a', 18910005, '2025-06-15'],
        ['BAT-2026-CATL-00000987', '梯次利用', '进入梯次利用', '用于浙江XX储能电站 / 重组为储能电池包', '浙江XX储能科技', '0x1a2b3c4d5e7f', '0x9c0d1e2f3a4b', 18910006, '2025-08-01'],
        ['BAT-2026-EVE-00001234', '电池生产', '电池生产完成', '亿纬锂能惠州工厂', '亿纬锂能', '0xa1b2c3d4e5f7', '0x4d5e6f7a8b9c', 18905000, '2019-11-20'],
        ['BAT-2026-EVE-00001234', '质量检测', '出厂检测通过', '容量: 75.2kWh', '中检集团', '0xb2c3d4e5f7a1', '0x5e6f7a8b9c0d', 18905001, '2019-11-25'],
        ['BAT-2026-EVE-00001234', '装配车辆', '装配至车辆', '车型: 小鹏G3', '小鹏汽车', '0xc3d4e5f7a1b2', '0x6f7a8b9c0d1e', 18905002, '2019-12-10'],
        ['BAT-2026-EVE-00001234', '退役', '电池退役', 'SOH: 58% / 循环次数: 2000', '小鹏汽车', '0xd4e5f7a1b2c3', '0x7a8b9c0d1e2f', 18905003, '2023-10-15'],
        ['BAT-2026-EVE-00001234', '梯次利用', '进入梯次利用', '用于通信基站备电', '广东XX通信科技', '0xe5f7a1b2c3d4', '0x8b9c0d1e2f3a', 18905004, '2024-01-20'],
        ['BAT-2026-EVE-00001234', '最终回收', '进入拆解回收', '锂回收率: 91% / 钴回收率: 95% / 镍回收率: 98%', '格林美', '0xf7a1b2c3d4e5', '0x9c0d1e2f3a4b', 18905005, '2026-03-10'],
        ['BAT-2026-EVE-00001234', '生命周期结束', '电池生命周期结束', '所有材料已回收处理 / 生命周期完整闭环', '格林美', '0xa1b2c3d4e5f8', '0xa0d1e2f3a4b5', 18905006, '2026-04-15']
    ];
    const insertEvents = db.transaction((items) => {
        for (const item of items) insertEvent.run(...item);
    });
    insertEvents(events);

    // ===== Seed SOH History =====
    const insertSOH = db.prepare(`INSERT INTO soh_history (battery_id, soh, soc, cycles, record_date) VALUES (?, ?, ?, ?, ?)`);
    const sohData = [
        ['BAT-2026-CATL-00001852', 100, 100, 0, '2022-03'],
        ['BAT-2026-CATL-00001852', 98, 90, 80, '2022-12'],
        ['BAT-2026-CATL-00001852', 96, 85, 150, '2023-06'],
        ['BAT-2026-CATL-00001852', 93, 80, 220, '2023-12'],
        ['BAT-2026-CATL-00001852', 91, 68, 420, '2024-06'],
        ['BAT-2026-CATL-00001852', 89, 75, 460, '2024-12'],
        ['BAT-2026-CATL-00001852', 88, 70, 500, '2025-06'],
        ['BAT-2026-CATL-00001852', 87, 68, 530, '2025-12'],
        ['BAT-2026-CATL-00001852', 86, 72, 560, '2026-08'],
        ['BAT-2026-BYD-00002301', 100, 100, 0, '2022-01'],
        ['BAT-2026-BYD-00002301', 99, 88, 60, '2022-12'],
        ['BAT-2026-BYD-00002301', 97, 82, 120, '2023-06'],
        ['BAT-2026-BYD-00002301', 95, 78, 180, '2023-12'],
        ['BAT-2026-BYD-00002301', 92, 75, 280, '2024-06'],
        ['BAT-2026-BYD-00002301', 91, 80, 320, '2024-12'],
        ['BAT-2026-BYD-00002301', 90, 82, 400, '2025-06'],
        ['BAT-2026-BYD-00002301', 89, 85, 480, '2026-07'],
        ['BAT-2026-GOTION-00000456', 100, 100, 0, '2021-06'],
        ['BAT-2026-GOTION-00000456', 97, 85, 100, '2021-12'],
        ['BAT-2026-GOTION-00000456', 94, 80, 200, '2022-06'],
        ['BAT-2026-GOTION-00000456', 90, 75, 350, '2022-12'],
        ['BAT-2026-GOTION-00000456', 85, 70, 500, '2023-06'],
        ['BAT-2026-GOTION-00000456', 82, 65, 650, '2023-12'],
        ['BAT-2026-GOTION-00000456', 78, 60, 800, '2024-06'],
        ['BAT-2026-GOTION-00000456', 75, 55, 900, '2024-12'],
        ['BAT-2026-GOTION-00000456', 72, 50, 1000, '2025-06'],
        ['BAT-2026-GOTION-00000456', 70, 48, 1100, '2025-12'],
        ['BAT-2026-GOTION-00000456', 68, 45, 1200, '2026-06'],
        ['BAT-2026-CATL-00000987', 100, 100, 0, '2020-09'],
        ['BAT-2026-CATL-00000987', 95, 90, 150, '2021-06'],
        ['BAT-2026-CATL-00000987', 85, 70, 400, '2022-06'],
        ['BAT-2026-CATL-00000987', 78, 55, 700, '2023-06'],
        ['BAT-2026-CATL-00000987', 68, 40, 1100, '2024-06'],
        ['BAT-2026-CATL-00000987', 63, 30, 1500, '2025-06'],
        ['BAT-2026-CATL-00000987', 62, 0, 1800, '2025-12'],
        ['BAT-2026-EVE-00001234', 100, 100, 0, '2019-11'],
        ['BAT-2026-EVE-00001234', 96, 85, 120, '2020-06'],
        ['BAT-2026-EVE-00001234', 88, 70, 350, '2021-06'],
        ['BAT-2026-EVE-00001234', 72, 50, 800, '2022-06'],
        ['BAT-2026-EVE-00001234', 60, 40, 1400, '2023-06'],
        ['BAT-2026-EVE-00001234', 58, 35, 1600, '2023-10'],
        ['BAT-2026-EVE-00001234', 52, 0, 2000, '2024-06']
    ];
    const insertSOHs = db.transaction((items) => {
        for (const item of items) insertSOH.run(...item);
    });
    insertSOHs(sohData);

    // ===== Seed Transfer Records =====
    const insertTransfer = db.prepare(`INSERT INTO transfer_records (battery_id, from_party, to_party, transfer_type, tx_hash, block_number, transfer_date) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const transfers = [
        ['BAT-2026-CATL-00001852', '宁德时代', '比亚迪汽车', '生产转装车', '0xa9b8c7d6e5f4', 18923458, '2022-04-01'],
        ['BAT-2026-CATL-00001852', '比亚迪汽车', '深圳XX新能源租赁公司', '装车转交付', '0xb9c8d7e6f5a4', 18923459, '2022-04-05'],
        ['BAT-2026-BYD-00002301', '比亚迪', '比亚迪汽车', '生产转装车', '0x3a4b5c6d7e8f', 18920003, '2022-02-10'],
        ['BAT-2026-BYD-00002301', '比亚迪汽车', '广州XX网约车公司', '装车转交付', '0x4a5b6c7d8e9f', 18920004, '2022-02-15'],
        ['BAT-2026-GOTION-00000456', '国轩高科', '北汽新能源', '生产转装车', '0x4c5d6e7f8a9b', 18915002, '2021-07-01'],
        ['BAT-2026-GOTION-00000456', '北汽新能源', '合肥XX出租车公司', '装车转交付', '0x5d6e7f8a9bac', 18915003, '2021-07-05'],
        ['BAT-2026-CATL-00000987', '宁德时代', '蔚来汽车', '生产转装车', '0x5e6f7a8b9c0d', 18910002, '2020-10-01'],
        ['BAT-2026-CATL-00000987', '蔚来汽车', '上海XX回收企业', '退役转回收', '0x8b9c0d1e2f3a', 18910005, '2025-06-15'],
        ['BAT-2026-CATL-00000987', '上海XX回收企业', '浙江XX储能科技', '回收转梯次利用', '0x9c0d1e2f3a4b', 18910006, '2025-08-01'],
        ['BAT-2026-EVE-00001234', '亿纬锂能', '小鹏汽车', '生产转装车', '0x6f7a8b9c0d1e', 18905002, '2019-12-10'],
        ['BAT-2026-EVE-00001234', '小鹏汽车', '广东XX通信科技', '退役转梯次利用', '0x8b9c0d1e2f3a', 18905004, '2024-01-20'],
        ['BAT-2026-EVE-00001234', '广东XX通信科技', '格林美', '梯次利用转回收', '0x9c0d1e2f3a4b', 18905005, '2026-03-10']
    ];
    const insertTransfers = db.transaction((items) => {
        for (const item of items) insertTransfer.run(...item);
    });
    insertTransfers(transfers);

    // ===== Seed Anomalies =====
    const insertAnomaly = db.prepare(`INSERT INTO anomalies (id, battery_id, anomaly_type, level, description, status) VALUES (?, ?, ?, ?, ?, ?)`);
    const anomalies = [
        ['ANM-2026-001', 'BAT-2026-GOTION-00000456', 'SOH异常波动', '高危', 'SOH数据从81%跳升至96%，存在数据篡改嫌疑', '待处理'],
        ['ANM-2026-002', 'BAT-2026-CATL-00000331', '循环次数倒退', '中危', '循环次数从890次变为850次，数据不一致', '已确认'],
        ['ANM-2026-003', 'BAT-2026-BYD-00001788', '电池身份重复', '高危', '检测到相同BatteryID在两个地区同时出现', '处理中'],
        ['ANM-2026-004', 'BAT-2026-CATL-00000512', '流转路径异常', '中危', '电池从广东流转至新疆后无后续记录，疑似非正规渠道', '待处理'],
        ['ANM-2026-005', 'BAT-2026-EVE-00000899', '维修记录冲突', '低危', '同一天出现两条不同维修机构提交的维修记录', '已处理']
    ];
    const insertAnomalies = db.transaction((items) => {
        for (const item of items) insertAnomaly.run(...item);
    });
    insertAnomalies(anomalies);

    // ===== Seed Recycling Tasks =====
    const insertRecycle = db.prepare(`INSERT INTO recycling_tasks (id, battery_id, enterprise, status, step, contact) VALUES (?, ?, ?, ?, ?, ?)`);
    const recycleTasks = [
        ['REC-001', 'BAT-2026-GOTION-00000456', '合肥XX回收企业', '待退役', 0, '张经理'],
        ['REC-002', 'BAT-2026-CATL-00000712', '深圳XX回收企业', '待回收', 1, '李经理'],
        ['REC-003', 'BAT-2026-BYD-00000655', '广州XX回收企业', '运输中', 2, '王经理'],
        ['REC-004', 'BAT-2026-CATL-00000823', '上海XX回收企业', '已接收', 3, '赵经理'],
        ['REC-005', 'BAT-2026-CATL-00000987', '浙江XX储能科技', '梯次利用', 4, '陈经理'],
        ['REC-006', 'BAT-2026-EVE-00001234', '格林美', '已拆解', 5, '刘经理']
    ];
    const insertRecycles = db.transaction((items) => {
        for (const item of items) insertRecycle.run(...item);
    });
    insertRecycles(recycleTasks);

    // ===== Seed Transactions =====
    const insertTx = db.prepare(`INSERT INTO transactions (tx_hash, tx_type, battery_id, block_number, from_addr, status) VALUES (?, ?, ?, ?, ?, ?)`);
    const txs = [
        ['0x8a7b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', 'registerBattery', 'BAT-2026-CATL-00001852', 18923456, '0xABC1234DEF5678', '成功'],
        ['0x9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c', 'addRecord', 'BAT-2026-CATL-00001852', 18923457, '0xTEST005CCIC01', '成功'],
        ['0xa9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0d', 'bindVehicle', 'BAT-2026-CATL-00001852', 18923458, '0xRST5678UVW9012', '成功'],
        ['0xb9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d', 'transferBattery', 'BAT-2026-CATL-00001852', 18923459, '0xRST5678UVW9012', '成功'],
        ['0xc9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e', 'addRecord', 'BAT-2026-CATL-00001852', 18923460, '0xTEST001CENTER1', '成功'],
        ['0xd9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f', 'addRecord', 'BAT-2026-CATL-00001852', 18923461, '0xMAINT001BYD44S', '成功'],
        ['0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a1c', 'registerBattery', 'BAT-2026-BYD-00002301', 18920001, '0xDEF5678ABC1234', '成功'],
        ['0x3a4b5c6d7e8f7a8b9c0d1e2f3a4b5c6d7e8f9a2d', 'bindVehicle', 'BAT-2026-BYD-00002301', 18920003, '0xRST5678UVW9012', '成功'],
        ['0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b2', 'registerBattery', 'BAT-2026-GOTION-00000456', 18915000, '0xGHI9012JKL3456', '成功'],
        ['0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b3c4', 'registerBattery', 'BAT-2026-CATL-00000987', 18910000, '0xABC1234DEF5678', '成功'],
        ['0x8b9c0d1e2f3a4b5c6d7e8f9a0b3c4d5e6f7a8b9c', 'transferBattery', 'BAT-2026-CATL-00000987', 18910005, '0xUVW9012RST5678', '成功'],
        ['0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b4c5', 'registerBattery', 'BAT-2026-EVE-00001234', 18905000, '0xMNO7890PQR1234', '成功']
    ];
    const insertTxs = db.transaction((items) => {
        for (const item of items) insertTx.run(...item);
    });
    insertTxs(txs);

    // ===== Seed Maintenance Records =====
    const insertMaintenance = db.prepare(`INSERT INTO maintenance_records (id, battery_id, maintenance_type, description, provider, cost, result, data_hash, tx_hash, block_number, maintenance_date, next_maintenance_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const maintenanceRecords = [
        ['MNT-001', 'BAT-2026-CATL-00001852', '电芯更换', '更换2号电芯模组，故障原因: 电芯电压异常', '比亚迪4S店', 3200, '完成', '0x12ab34cd56ef', '0xd9e8f7a6b5c4', 18923461, '2025-02-13', '2026-02-13'],
        ['MNT-002', 'BAT-2026-CATL-00001852', '常规保养', 'BMS系统升级至V2.1，均衡校准', '比亚迪4S店', 800, '完成', '0xa1b2c3d4e5f9', '0xe1f2a3b4c5d6', 18923470, '2025-08-10', '2026-08-10'],
        ['MNT-003', 'BAT-2026-BYD-00002301', '常规保养', '冷却液更换，连接器紧固', '比亚迪4S店', 600, '完成', '0xb2c3d4e5f6a2', '0xf2a3b4c5d6e7', 18920010, '2024-09-20', '2025-09-20'],
        ['MNT-004', 'BAT-2026-GOTION-00000456', '电芯更换', '更换4号电芯模组，电芯一致性异常', '北汽4S店', 2800, '完成', '0xc4d5e6f1a2b3', '0x5d6e7f8a9bac', 18915003, '2023-05-10', '2024-05-10'],
        ['MNT-005', 'BAT-2026-GOTION-00000456', '故障维修', '电池包底部整形修复，事故后维修', '北汽4S店', 4500, '完成', '0xd5e6f1a2b3c4', '0x6e7f8a9bacbd', 18915004, '2025-08-25', '2026-02-25'],
        ['MNT-006', 'BAT-2026-CATL-00000987', '梯次重组', '退役电池拆解重组为储能电池包', '浙江XX储能科技', 12000, '完成', '0x1a2b3c4d5e7f', '0x9c0d1e2f3a4b', 18910006, '2025-08-01', null]
    ];
    const insertMaintenances = db.transaction((items) => {
        for (const item of items) insertMaintenance.run(...item);
    });
    insertMaintenances(maintenanceRecords);

    // ===== Seed Carbon Records =====
    const insertCarbon = db.prepare(`INSERT INTO carbon_records (id, battery_id, record_type, description, carbon_saved, unit, verifier, tx_hash, block_number, record_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const carbonRecords = [
        ['CRB-001', 'BAT-2026-CATL-00000987', '梯次利用减排', '退役电池梯次利用于储能电站，减少新电池生产碳排放', 4200, 'kgCO2', '中检集团', '0x9c0d1e2f3a4b', 18910006, '2025-08-01'],
        ['CRB-002', 'BAT-2026-EVE-00001234', '梯次利用减排', '退役电池梯次利用于通信基站备电', 3100, 'kgCO2', '中检集团', '0x8b9c0d1e2f3a', 18905004, '2024-01-20'],
        ['CRB-003', 'BAT-2026-EVE-00001234', '材料回收减排', '锂回收率91% / 钴回收率95% / 镍回收率98%，减少矿产开采碳排放', 5800, 'kgCO2', '格林美', '0x9c0d1e2f3a4b', 18905005, '2026-03-10'],
        ['CRB-004', 'BAT-2026-CATL-00001852', '维修延寿减排', '电芯模组更换延长电池寿命，推迟退役时间', 1850, 'kgCO2', '深圳检测中心', '0xd9e8f7a6b5c4', 18923461, '2025-02-13'],
        ['CRB-005', 'BAT-2026-GOTION-00000456', '维修延寿减排', '电芯模组更换延长电池寿命', 1650, 'kgCO2', '合肥检测中心', '0x5d6e7f8a9bac', 18915003, '2023-05-10']
    ];
    const insertCarbons = db.transaction((items) => {
        for (const item of items) insertCarbon.run(...item);
    });
    insertCarbons(carbonRecords);

    // ===== Seed Audit Logs =====
    const insertAudit = db.prepare(`INSERT INTO audit_logs (operator, action, target_type, target_id, detail, ip_address, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const auditLogs = [
        ['宁德时代', '注册电池', 'battery', 'BAT-2026-CATL-00001852', '通过BatteryRegistry合约注册电池数字身份', '10.0.1.32', '0x8a7b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'],
        ['中检集团', '验证事件', 'event', 'EVT-0001', '验证电池生产数据Hash一致性', '10.0.1.55', '0x9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c'],
        ['比亚迪汽车', '责任转移', 'transfer', 'BAT-2026-CATL-00001852', '电池责任从宁德时代转移至比亚迪汽车', '10.0.2.11', '0xa9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0d'],
        ['深圳检测中心', '上传健康数据', 'soh', 'BAT-2026-CATL-00001852', '上传SOH:86% SOC:72% 循环:560次', '10.0.3.22', '0xe9f8a7b6c5d4'],
        ['比亚迪4S店', '维修记录上链', 'maintenance', 'MNT-001', '更换2号电芯模组，维修数据上链存证', '10.0.4.15', '0xd9e8f7a6b5c4'],
        ['国家工信部', '处理异常', 'anomaly', 'ANM-2026-005', '确认维修记录冲突异常已处理', '10.0.0.1', null],
        ['格林美', '回收任务创建', 'recycle', 'REC-006', '创建电池回收任务，进入拆解流程', '10.0.5.30', '0x9c0d1e2f3a4b'],
        ['蔚来汽车', '退役登记', 'battery', 'BAT-2026-CATL-00000987', 'SOH低于65%，达到退役标准', '10.0.2.45', '0x8b9c0d1e2f3a'],
        ['浙江XX储能科技', '梯次利用登记', 'carbon', 'CRB-001', '记录梯次利用碳减排量: 4200kgCO2', '10.0.6.10', '0x9c0d1e2f3a4b'],
        ['系统管理员', '企业审核', 'enterprise', '宁德时代', '企业资质审核通过', '10.0.0.1', null]
    ];
    const insertAudits = db.transaction((items) => {
        for (const item of items) insertAudit.run(...item);
    });
    insertAudits(auditLogs);

    // ===== Seed Certificates =====
    const insertCert = db.prepare(`INSERT INTO certificates (id, battery_id, cert_type, cert_number, issuer, issue_date, expiry_date, status, data_hash, tx_hash, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const certificates = [
        ['CERT-001', 'BAT-2026-CATL-00001852', '产品质量合格证', 'QC-2022-CT-00001852', '中检集团', '2022-03-15', '2032-03-15', '有效', '0xcd34ef56ab78', '0x9b8c7d6e5f4a', 18923457],
        ['CERT-002', 'BAT-2026-CATL-00001852', '维修合格证', 'MT-2025-BYD4S-001', '比亚迪4S店', '2025-02-13', '2026-02-13', '有效', '0x12ab34cd56ef', '0xd9e8f7a6b5c4', 18923461],
        ['CERT-003', 'BAT-2026-BYD-00002301', '产品质量合格证', 'QC-2022-BYD-00002301', '中检集团', '2022-01-25', '2032-01-25', '有效', '0xb2c3d4e5f6a1', '0x2a3b4c5d6e7f', 18920002],
        ['CERT-004', 'BAT-2026-GOTION-00000456', '退役评估报告', 'RET-2026-GT-00000456', '合肥检测中心', '2026-06-10', null, '有效', '0xe6f1a2b3c4d5', '0x7f8a9bacbdec', 18915005],
        ['CERT-005', 'BAT-2026-CATL-00000987', '梯次利用合格证', 'CAS-2025-CT-00000987', '中检集团', '2025-08-01', '2030-08-01', '有效', '0x1a2b3c4d5e7f', '0x9c0d1e2f3a4b', 18910006],
        ['CERT-006', 'BAT-2026-EVE-00001234', '回收处理证明', 'REC-2026-GEM-00001234', '格林美', '2026-04-15', null, '有效', '0xa1b2c3d4e5f8', '0xa0d1e2f3a4b5', 18905006]
    ];
    const insertCerts = db.transaction((items) => {
        for (const item of items) insertCert.run(...item);
    });
    insertCerts(certificates);

    // ===== Seed Cascade Utilization =====
    const insertCascade = db.prepare(`INSERT INTO cascade_utilization (id, battery_id, source_vehicle_vin, evaluation_result, evaluation_score, cascade_scenario, target_project, installed_capacity, status, start_date, expected_end_date, actual_end_date, operator, data_hash, tx_hash, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const cascadeRecords = [
        ['CSD-001', 'BAT-2026-CATL-00000987', 'VIN20200915CT0004', '通过 - 适合梯次利用', 82, '储能电站', '浙江XX储能电站项目', '180 kWh', '运行中', '2025-08-01', '2030-08-01', null, '浙江XX储能科技', '0x1a2b3c4d5e7f', '0x9c0d1e2f3a4b', 18910006],
        ['CSD-002', 'BAT-2026-EVE-00001234', 'VIN20191201EVE0005', '通过 - 适合梯次利用', 76, '通信基站', '广东XX通信基站备电项目', '75 kWh', '已完成', '2024-01-20', '2026-01-20', '2026-03-10', '广东XX通信科技', '0xe5f7a1b2c3d4', '0x8b9c0d1e2f3a', 18905004],
        ['CSD-003', 'BAT-2026-GOTION-00000456', 'VIN20210701GT0003', '评估中 - 等待深度检测结果', null, '低速电动车', '待分配', null, '评估中', null, null, null, '合肥XX回收企业', '0xe6f1a2b3c4d5', '0x7f8a9bacbdec', 18915005]
    ];
    const insertCascades = db.transaction((items) => {
        for (const item of items) insertCascade.run(...item);
    });
    insertCascades(cascadeRecords);

    // ===== Seed Notifications =====
    const insertNotification = db.prepare(`INSERT INTO notifications (title, content, category, severity, target_id, target_type, read_status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const notifications = [
        ['异常告警: SOH异常波动', '电池 BAT-2026-GOTION-00000456 检测到SOH异常波动，请及时处理', '异常告警', '严重', 'ANM-2026-001', 'anomaly', 0],
        ['保养到期提醒', '电池 BAT-2026-CATL-00001852 常规保养即将到期，请安排保养', '保养到期', '警告', 'MNT-002', 'maintenance', 0],
        ['证书即将到期', '电池 BAT-2026-CATL-00001852 维修合格证将于2026-02-13到期', '证书到期', '警告', 'CERT-002', 'certificate', 0],
        ['低SOH预警', '电池 BAT-2026-CATL-00000987 SOH为62%，低于安全阈值', '健康预警', '严重', 'BAT-2026-CATL-00000987', 'battery', 0],
        ['梯次利用记录更新', '电池 BAT-2026-CATL-00000987 已进入梯次利用阶段', '系统通知', '提示', 'CSD-001', 'cascade', 1]
    ];
    const insertNotifications = db.transaction((items) => {
        for (const item of items) insertNotification.run(...item);
    });
    insertNotifications(notifications);

    // ===== Seed Admin User =====
    const crypto = require('crypto');
    const adminPwd = crypto.createHash('sha256').update('admin123' + 'chainbattery_salt_2026').digest('hex');
    db.prepare(`INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, 'admin')`)
        .run('admin', adminPwd, 'admin@chainbattery.com');

    console.log('Database seeded successfully!');
    console.log('  Enterprises:', enterprises.length);
    console.log('  Batteries:', batteries.length);
    console.log('  Lifecycle Events:', events.length);
    console.log('  SOH Records:', sohData.length);
    console.log('  Transfer Records:', transfers.length);
    console.log('  Anomalies:', anomalies.length);
    console.log('  Recycling Tasks:', recycleTasks.length);
    console.log('  Transactions:', txs.length);
    console.log('  Maintenance Records:', maintenanceRecords.length);
    console.log('  Carbon Records:', carbonRecords.length);
    console.log('  Audit Logs:', auditLogs.length);
    console.log('  Certificates:', certificates.length);
    console.log('  Cascade Records:', cascadeRecords.length);
    console.log('  Notifications:', notifications.length);

    db.close();
}

if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
