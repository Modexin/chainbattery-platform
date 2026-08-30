// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AnomalyDetector
 * @dev 异常检测合约
 * 自动检测SOH异常波动、循环次数倒退、时间冲突等异常
 * 规则引擎：链上记录 + 预警触发
 */
contract AnomalyDetector {

    enum AnomalyType {
        None,
        SohAbnormalJump,       // SOH异常波动
        CycleCountRollback,    // 循环次数倒退
        TimeConflict,          // 时间记录冲突
        DuplicateMaintenance,  // 重复维修
        AbnormalCellReplacement, // 异常电芯更换
        DuplicateBatteryId,    // 电池身份重复
        AbnormalTransferPath,  // 流转路径异常
        RepairConflict         // 维修记录冲突
    }

    enum Severity {
        None,
        Low,       // 低危
        Medium,    // 中危
        High       // 高危
    }

    struct Anomaly {
        string batteryId;
        AnomalyType anomalyType;
        Severity severity;
        string description;
        address reporter;
        uint256 detectedAt;
        bool resolved;
        string resolution;
    }

    // SOH历史快照（用于异常检测）
    struct SohSnapshot {
        uint256 soh;        // SOH值 (放大100倍存储，如 8600 = 86.00%)
        uint256 cycles;     // 循环次数
        uint256 timestamp;  // 时间戳
    }

    mapping(string => Anomaly[]) private anomalies;
    mapping(string => SohSnapshot[]) private sohSnapshots;
    mapping(string => uint256) private lastSoh;
    mapping(string => uint256) private lastCycles;
    mapping(string => uint256) private lastTimestamp;

    // SOH变化阈值：一次变化超过15%视为异常
    uint256 public constant SOH_JUMP_THRESHOLD = 1500;
    // 循环次数不能减少
    // 时间戳不能倒退

    event AnomalyDetected(
        string indexed batteryId,
        AnomalyType anomalyType,
        Severity severity,
        string description,
        uint256 timestamp
    );

    event AnomalyResolved(
        string indexed batteryId,
        uint256 anomalyIndex,
        string resolution,
        uint256 timestamp
    );

    event SohSnapshotRecorded(
        string indexed batteryId,
        uint256 soh,
        uint256 cycles,
        uint256 timestamp
    );

    /**
     * @dev 记录SOH快照并自动检测异常
     * @param _batteryId 电池编号
     * @param _soh SOH值 (86.00% 传入 8600)
     * @param _cycles 循环次数
     */
    function recordSohSnapshot(
        string memory _batteryId,
        uint256 _soh,
        uint256 _cycles
    ) external {
        uint256 prevSoh = lastSoh[_batteryId];
        uint256 prevCycles = lastCycles[_batteryId];
        uint256 prevTimestamp = lastTimestamp[_batteryId];

        // 记录快照
        SohSnapshot memory snapshot = SohSnapshot({
            soh: _soh,
            cycles: _cycles,
            timestamp: block.timestamp
        });
        sohSnapshots[_batteryId].push(snapshot);

        // 检测SOH异常波动
        if (prevSoh > 0) {
            uint256 delta = _soh > prevSoh ? (_soh - prevSoh) : (prevSoh - _soh);
            if (delta > SOH_JUMP_THRESHOLD) {
                _createAnomaly(_batteryId, AnomalyType.SohAbnormalJump, Severity.High,
                    "SOH数据异常波动，存在数据篡改嫌疑");
            }
            // SOH不应上升超过初始值
            if (_soh > prevSoh && _soh > 10000) {
                _createAnomaly(_batteryId, AnomalyType.SohAbnormalJump, Severity.Medium,
                    "SOH异常上升，不符合电池衰减规律");
            }
        }

        // 检测循环次数倒退
        if (prevCycles > 0 && _cycles < prevCycles) {
            _createAnomaly(_batteryId, AnomalyType.CycleCountRollback, Severity.Medium,
                "循环次数倒退，数据不一致");
        }

        // 更新状态
        lastSoh[_batteryId] = _soh;
        lastCycles[_batteryId] = _cycles;
        lastTimestamp[_batteryId] = block.timestamp;

        emit SohSnapshotRecorded(_batteryId, _soh, _cycles, block.timestamp);
    }

    /**
     * @dev 手动报告异常
     */
    function reportAnomaly(
        string memory _batteryId,
        AnomalyType _type,
        Severity _severity,
        string memory _description
    ) external {
        _createAnomaly(_batteryId, _type, _severity, _description);
    }

    function _createAnomaly(
        string memory _batteryId,
        AnomalyType _type,
        Severity _severity,
        string memory _description
    ) internal {
        Anomaly memory anomaly = Anomaly({
            batteryId: _batteryId,
            anomalyType: _type,
            severity: _severity,
            description: _description,
            reporter: msg.sender,
            detectedAt: block.timestamp,
            resolved: false,
            resolution: ""
        });

        anomalies[_batteryId].push(anomaly);

        emit AnomalyDetected(_batteryId, _type, _severity, _description, block.timestamp);
    }

    /**
     * @dev 解决异常
     */
    function resolveAnomaly(
        string memory _batteryId,
        uint256 _index,
        string memory _resolution
    ) external {
        require(_index < anomalies[_batteryId].length, "Anomaly index out of range");
        Anomaly storage anomaly = anomalies[_batteryId][_index];
        require(!anomaly.resolved, "Anomaly already resolved");

        anomaly.resolved = true;
        anomaly.resolution = _resolution;

        emit AnomalyResolved(_batteryId, _index, _resolution, block.timestamp);
    }

    /**
     * @dev 获取电池的所有异常
     */
    function getAnomalies(string memory _batteryId) external view returns (Anomaly[] memory) {
        return anomalies[_batteryId];
    }

    /**
     * @dev 获取未解决的异常数量
     */
    function getUnresolvedCount(string memory _batteryId) external view returns (uint256) {
        Anomaly[] storage list = anomalies[_batteryId];
        uint256 count = 0;
        for (uint256 i = 0; i < list.length; i++) {
            if (!list[i].resolved) count++;
        }
        return count;
    }

    /**
     * @dev 获取SOH历史快照
     */
    function getSohSnapshots(string memory _batteryId) external view returns (SohSnapshot[] memory) {
        return sohSnapshots[_batteryId];
    }

    /**
     * @dev 批量异常检测（检查时间冲突）
     */
    function checkTimeConflict(
        string memory _batteryId,
        uint256 _eventTimestamp
    ) external {
        if (lastTimestamp[_batteryId] > 0 && _eventTimestamp < lastTimestamp[_batteryId]) {
            _createAnomaly(_batteryId, AnomalyType.TimeConflict, Severity.Medium,
                "时间记录冲突，事件时间早于上一条记录");
        }
    }
}
