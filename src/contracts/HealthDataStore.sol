// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HealthDataStore
 * @dev 电池健康数据存储合约
 * 持续记录SOH/SOC/循环次数/温度/电压等健康指标
 * 生成链上健康趋势数据
 */
contract HealthDataStore {

    struct HealthRecord {
        string batteryId;
        uint256 soh;           // 电池健康度 (放大100倍，8600 = 86.00%)
        uint256 soc;           // 剩余电量 (放大100倍，7200 = 72.00%)
        uint256 cycles;        // 充放电循环次数
        int256 temperature;   // 当前温度 (放大10倍，325 = 32.5C)
        int256 voltage;        // 当前电压 (放大100倍，40000 = 400.00V)
        uint256 faultFlags;    // 故障标志位
        address recorder;      // 记录者地址
        uint256 timestamp;     // 记录时间
    }

    struct HealthSummary {
        uint256 currentSoh;
        uint256 currentSoc;
        uint256 currentCycles;
        uint256 recordCount;
        uint256 firstRecordTime;
        uint256 lastRecordTime;
    }

    mapping(string => HealthRecord[]) private healthRecords;
    mapping(string => HealthSummary) private healthSummaries;

    // 故障标志位定义
    uint256 public constant FLAG_OVERTEMP      = 1 << 0;  // 过温
    uint256 public constant FLAG_OVERVOLTAGE   = 1 << 1;  // 过压
    uint256 public constant FLAG_UNDERVOLTAGE  = 1 << 2;  // 欠压
    uint256 public constant FLAG_CELL_IMBALANCE = 1 << 3;  // 电芯不平衡
    uint256 public constant FLAG_INSULATION    = 1 << 4;  // 绝缘异常
    uint256 public constant FLAG_COMM_FAULT    = 1 << 5;  // 通讯故障

    // 安全阈值
    int256 public constant MAX_TEMP = 600;   // 60.0C
    int256 public constant MIN_TEMP  = -200;  // -20.0C
    int256 public constant MAX_VOLT  = 42000; // 420.00V
    int256 public constant MIN_VOLT  = 30000; // 300.00V

    event HealthRecorded(
        string indexed batteryId,
        uint256 soh,
        uint256 soc,
        uint256 cycles,
        uint256 timestamp
    );

    event FaultDetected(
        string indexed batteryId,
        uint256 faultFlags,
        uint256 timestamp
    );

    event HealthSummaryUpdated(
        string indexed batteryId,
        uint256 soh,
        uint256 cycles,
        uint256 recordCount
    );

    /**
     * @dev 上传电池健康数据
     * @param _batteryId 电池编号
     * @param _soh SOH值 (86.00% 传入 8600)
     * @param _soc SOC值
     * @param _cycles 循环次数
     * @param _temperature 温度 (32.5C 传入 325)
     * @param _voltage 电压 (400.00V 传入 40000)
     * @param _faultFlags 故障标志位
     */
    function uploadHealthData(
        string memory _batteryId,
        uint256 _soh,
        uint256 _soc,
        uint256 _cycles,
        int256 _temperature,
        int256 _voltage,
        uint256 _faultFlags
    ) external {
        // 自动检测故障并设置标志位
        uint256 detectedFaults = _faultFlags;
        if (_temperature > MAX_TEMP || _temperature < MIN_TEMP) {
            detectedFaults |= FLAG_OVERTEMP;
        }
        if (_voltage > MAX_VOLT) {
            detectedFaults |= FLAG_OVERVOLTAGE;
        }
        if (_voltage < MIN_VOLT && _voltage > 0) {
            detectedFaults |= FLAG_UNDERVOLTAGE;
        }

        HealthRecord memory record = HealthRecord({
            batteryId: _batteryId,
            soh: _soh,
            soc: _soc,
            cycles: _cycles,
            temperature: _temperature,
            voltage: _voltage,
            faultFlags: detectedFaults,
            recorder: msg.sender,
            timestamp: block.timestamp
        });

        healthRecords[_batteryId].push(record);

        // 更新摘要
        HealthSummary storage summary = healthSummaries[_batteryId];
        if (summary.recordCount == 0) {
            summary.firstRecordTime = block.timestamp;
        }
        summary.currentSoh = _soh;
        summary.currentSoc = _soc;
        summary.currentCycles = _cycles;
        summary.recordCount++;
        summary.lastRecordTime = block.timestamp;

        emit HealthRecorded(_batteryId, _soh, _soc, _cycles, block.timestamp);
        emit HealthSummaryUpdated(_batteryId, _soh, _cycles, summary.recordCount);

        if (detectedFaults > 0) {
            emit FaultDetected(_batteryId, detectedFaults, block.timestamp);
        }
    }

    /**
     * @dev 获取最新健康记录
     */
    function getLatestHealth(string memory _batteryId) external view returns (HealthRecord memory) {
        require(healthRecords[_batteryId].length > 0, "No health records");
        return healthRecords[_batteryId][healthRecords[_batteryId].length - 1];
    }

    /**
     * @dev 获取所有健康记录
     */
    function getHealthRecords(string memory _batteryId) external view returns (HealthRecord[] memory) {
        return healthRecords[_batteryId];
    }

    /**
     * @dev 获取SOH趋势 (用于绘制衰减曲线)
     * @param _batteryId 电池编号
     * @param _startIdx 起始索引
     * @param _count 记录数量
     */
    function getSohTrend(
        string memory _batteryId,
        uint256 _startIdx,
        uint256 _count
    ) external view returns (uint256[] memory sohValues, uint256[] memory timestamps) {
        HealthRecord[] storage records = healthRecords[_batteryId];
        uint256 end = _startIdx + _count;
        if (end > records.length) end = records.length;

        uint256 actualCount = end - _startIdx;
        sohValues = new uint256[](actualCount);
        timestamps = new uint256[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            sohValues[i] = records[_startIdx + i].soh;
            timestamps[i] = records[_startIdx + i].timestamp;
        }
    }

    /**
     * @dev 获取健康摘要
     */
    function getHealthSummary(string memory _batteryId) external view returns (HealthSummary memory) {
        return healthSummaries[_batteryId];
    }

    /**
     * @dev 检查是否有故障
     */
    function hasFault(string memory _batteryId, uint256 _flag) external view returns (bool) {
        if (healthRecords[_batteryId].length == 0) return false;
        HealthRecord storage latest = healthRecords[_batteryId][healthRecords[_batteryId].length - 1];
        return (latest.faultFlags & _flag) != 0;
    }

    /**
     * @dev 计算电池衰减率 (每年SOH下降百分比)
     */
    function getDegradationRate(string memory _batteryId) external view returns (int256) {
        HealthSummary storage summary = healthSummaries[_batteryId];
        if (summary.recordCount < 2) return 0;

        HealthRecord storage first = healthRecords[_batteryId][0];
        HealthRecord storage last = healthRecords[_batteryId][healthRecords[_batteryId].length - 1];

        if (last.timestamp == first.timestamp) return 0;

        // 衰减率 = (初始SOH - 当前SOH) * 一年秒数 / (当前时间 - 初始时间)
        uint256 timeDiff = last.timestamp - first.timestamp;
        uint256 sohDiff = first.soh - last.soh;

        // 返回放大100倍的年衰减率
        return int256((sohDiff * 365 days * 100) / timeDiff);
    }
}
