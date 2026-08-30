// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LifecycleRecord
 * @dev 生命周期记录合约
 * 采用链上摘要 + 链下数据设计，链上记录关键信息与Hash
 */
contract LifecycleRecord {

    enum EventType {
        Production,      // 电池生产
        QualityTest,    // 质量检测
        VehicleAssembly, // 装配车辆
        Delivery,        // 车辆交付
        HealthCheck,    // 电池检测
        Maintenance,    // 维修记录
        Accident,       // 事故记录
        Transfer,       // 责任转移
        Retirement,     // 退役
        CascadeUse,     // 梯次利用
        Dismantling,    // 拆解
        MaterialRecovery,// 材料回收
        EndOfLife       // 生命周期结束
    }

    struct LifecycleEvent {
        string batteryId;       // 电池编号
        EventType eventType;    // 事件类型
        string title;           // 事件标题
        string description;      // 事件描述
        string submitter;        // 提交机构
        bytes32 dataHash;        // 链下数据Hash (SHA-256)
        address submitterAddr;   // 提交者地址
        uint256 timestamp;       // 时间戳
        bool verified;           // 是否已验证
    }

    mapping(string => LifecycleEvent[]) private lifecycleRecords;
    mapping(bytes32 => bool) private hashExists;

    event RecordAdded(
        string indexed batteryId,
        EventType indexed eventType,
        bytes32 dataHash,
        address indexed submitter,
        uint256 timestamp
    );

    event RecordVerified(
        string indexed batteryId,
        uint256 recordIndex,
        bytes32 dataHash,
        uint256 timestamp
    );

    /**
     * @dev 添加生命周期记录
     * @param _batteryId 电池编号
     * @param _eventType 事件类型
     * @param _title 事件标题
     * @param _description 事件描述
     * @param _submitter 提交机构
     * @param _dataHash 链下数据Hash
     */
    function addRecord(
        string memory _batteryId,
        EventType _eventType,
        string memory _title,
        string memory _description,
        string memory _submitter,
        bytes32 _dataHash
    ) external {
        require(bytes(_batteryId).length > 0, "Battery ID required");
        require(_dataHash != bytes32(0), "Data hash required");

        LifecycleEvent memory eventRecord = LifecycleEvent({
            batteryId: _batteryId,
            eventType: _eventType,
            title: _title,
            description: _description,
            submitter: _submitter,
            dataHash: _dataHash,
            submitterAddr: msg.sender,
            timestamp: block.timestamp,
            verified: false
        });

        lifecycleRecords[_batteryId].push(eventRecord);
        hashExists[_dataHash] = true;

        emit RecordAdded(_batteryId, _eventType, _dataHash, msg.sender, block.timestamp);
    }

    /**
     * @dev 获取电池的所有生命周期记录
     */
    function getRecords(string memory _batteryId) external view returns (LifecycleEvent[] memory) {
        return lifecycleRecords[_batteryId];
    }

    /**
     * @dev 获取特定索引的记录
     */
    function getRecord(string memory _batteryId, uint256 _index) external view returns (LifecycleEvent memory) {
        require(_index < lifecycleRecords[_batteryId].length, "Index out of range");
        return lifecycleRecords[_batteryId][_index];
    }

    /**
     * @dev 验证记录Hash是否匹配
     */
    function verifyRecord(string memory _batteryId, uint256 _index, bytes32 _dataHash) external returns (bool) {
        require(_index < lifecycleRecords[_batteryId].length, "Index out of range");
        LifecycleEvent storage record = lifecycleRecords[_batteryId][_index];
        bool isValid = (record.dataHash == _dataHash);
        if (isValid) {
            record.verified = true;
            emit RecordVerified(_batteryId, _index, _dataHash, block.timestamp);
        }
        return isValid;
    }

    /**
     * @dev 获取电池生命周期记录数量
     */
    function getRecordCount(string memory _batteryId) external view returns (uint256) {
        return lifecycleRecords[_batteryId].length;
    }

    /**
     * @dev 检查Hash是否已存在
     */
    function isHashExists(bytes32 _dataHash) external view returns (bool) {
        return hashExists[_dataHash];
    }
}
