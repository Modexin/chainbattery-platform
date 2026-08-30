// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RecycleTracker
 * @dev 退役与回收追踪合约
 * 追踪退役电池流向，管理回收流程状态
 * 在役 -> 检测 -> 退役 -> 梯次利用/直接回收 -> 拆解 -> 材料回收 -> 生命周期结束
 */
contract RecycleTracker {

    enum RecycleStage {
        None,              // 未开始
        PendingRetirement, // 待退役
        PendingRecycle,    // 待回收
        InTransit,         // 运输中
        Received,          // 已接收
        CascadeUse,        // 梯次利用
        Dismantling,       // 拆解中
        MaterialRecovery,  // 材料回收
        Completed          // 已完成（生命周期结束）
    }

    struct RecycleTask {
        string batteryId;
        RecycleStage currentStage;
        address currentHandler;    // 当前处理方
        address originalOwner;      // 原始所有者
        address finalRecycler;      // 最终回收企业
        string contactPerson;       // 联系人
        uint256 createdAt;           // 创建时间
        uint256 updatedAt;          // 更新时间
        bool exists;
    }

    struct StageRecord {
        RecycleStage stage;
        address handler;
        string notes;
        uint256 timestamp;
        bytes32 dataHash;          // 阶段文件Hash
    }

    struct MaterialRecoveryResult {
        uint256 lithiumRate;       // 锂回收率 (放大100倍，91 = 91%)
        uint256 cobaltRate;        // 钴回收率
        uint256 nickelRate;        // 镍回收率
        uint256 manganeseRate;     // 锰回收率
        uint256 totalWeight;       // 总处理重量 (克)
    }

    mapping(string => RecycleTask) private recycleTasks;
    mapping(string => StageRecord[]) private stageHistory;
    mapping(string => MaterialRecoveryResult) private recoveryResults;
    string[] private taskIds;

    event RecycleTaskCreated(
        string indexed batteryId,
        address indexed handler,
        uint256 timestamp
    );

    event StageAdvanced(
        string indexed batteryId,
        RecycleStage newStage,
        address indexed handler,
        uint256 timestamp
    );

    event MaterialRecovered(
        string indexed batteryId,
        uint256 lithiumRate,
        uint256 cobaltRate,
        uint256 nickelRate,
        uint256 timestamp
    );

    modifier taskExists(string memory _batteryId) {
        require(recycleTasks[_batteryId].exists, "Recycle task not found");
        _;
    }

    /**
     * @dev 创建回收任务（电池进入退役流程）
     * @param _batteryId 电池编号
     * @param _contactPerson 联系人
     */
    function createRecycleTask(
        string memory _batteryId,
        string memory _contactPerson
    ) external {
        require(!recycleTasks[_batteryId].exists, "Recycle task already exists");

        recycleTasks[_batteryId] = RecycleTask({
            batteryId: _batteryId,
            currentStage: RecycleStage.PendingRetirement,
            currentHandler: msg.sender,
            originalOwner: msg.sender,
            finalRecycler: address(0),
            contactPerson: _contactPerson,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        taskIds.push(_batteryId);

        _recordStage(_batteryId, RecycleStage.PendingRetirement, msg.sender, "回收任务创建", bytes32(0));

        emit RecycleTaskCreated(_batteryId, msg.sender, block.timestamp);
    }

    /**
     * @dev 推进回收流程到下一阶段
     * @param _batteryId 电池编号
     * @param _notes 备注
     * @param _dataHash 阶段文件Hash
     */
    function advanceStage(
        string memory _batteryId,
        string memory _notes,
        bytes32 _dataHash
    ) external taskExists(_batteryId) {
        RecycleTask storage task = recycleTasks[_batteryId];
        require(task.currentStage != RecycleStage.Completed, "Task already completed");
        require(task.currentHandler == msg.sender, "Only current handler can advance");

        RecycleStage newStage = RecycleStage(uint256(task.currentStage) + 1);
        task.currentStage = newStage;
        task.currentHandler = msg.sender;
        task.updatedAt = block.timestamp;

        if (newStage == RecycleStage.CascadeUse) {
            task.finalRecycler = msg.sender;
        }

        _recordStage(_batteryId, newStage, msg.sender, _notes, _dataHash);

        emit StageAdvanced(_batteryId, newStage, msg.sender, block.timestamp);
    }

    /**
     * @dev 转交给新的处理方
     */
    function transferHandler(
        string memory _batteryId,
        address _newHandler,
        string memory _notes
    ) external taskExists(_batteryId) {
        RecycleTask storage task = recycleTasks[_batteryId];
        require(task.currentHandler == msg.sender, "Only current handler can transfer");
        require(_newHandler != address(0), "Invalid handler");

        task.currentHandler = _newHandler;
        task.updatedAt = block.timestamp;

        _recordStage(_batteryId, task.currentStage, _newHandler, _notes, bytes32(0));
    }

    /**
     * @dev 记录材料回收结果
     */
    function recordMaterialRecovery(
        string memory _batteryId,
        uint256 _lithiumRate,
        uint256 _cobaltRate,
        uint256 _nickelRate,
        uint256 _manganeseRate,
        uint256 _totalWeight
    ) external taskExists(_batteryId) {
        RecycleTask storage task = recycleTasks[_batteryId];
        require(task.currentStage == RecycleStage.MaterialRecovery || task.currentStage == RecycleStage.Dismantling, "Not in recovery stage");

        recoveryResults[_batteryId] = MaterialRecoveryResult({
            lithiumRate: _lithiumRate,
            cobaltRate: _cobaltRate,
            nickelRate: _nickelRate,
            manganeseRate: _manganeseRate,
            totalWeight: _totalWeight
        });

        task.currentStage = RecycleStage.Completed;
        task.updatedAt = block.timestamp;

        _recordStage(_batteryId, RecycleStage.Completed, msg.sender, "材料回收完成，生命周期结束", bytes32(0));

        emit MaterialRecovered(_batteryId, _lithiumRate, _cobaltRate, _nickelRate, block.timestamp);
        emit StageAdvanced(_batteryId, RecycleStage.Completed, msg.sender, block.timestamp);
    }

    function _recordStage(
        string memory _batteryId,
        RecycleStage _stage,
        address _handler,
        string memory _notes,
        bytes32 _dataHash
    ) internal {
        stageHistory[_batteryId].push(StageRecord({
            stage: _stage,
            handler: _handler,
            notes: _notes,
            timestamp: block.timestamp,
            dataHash: _dataHash
        }));
    }

    /**
     * @dev 获取回收任务信息
     */
    function getRecycleTask(string memory _batteryId) external view returns (RecycleTask memory) {
        require(recycleTasks[_batteryId].exists, "Task not found");
        return recycleTasks[_batteryId];
    }

    /**
     * @dev 获取阶段历史
     */
    function getStageHistory(string memory _batteryId) external view returns (StageRecord[] memory) {
        return stageHistory[_batteryId];
    }

    /**
     * @dev 获取材料回收结果
     */
    function getMaterialRecovery(string memory _batteryId) external view returns (MaterialRecoveryResult memory) {
        return recoveryResults[_batteryId];
    }

    /**
     * @dev 获取回收任务总数
     */
    function getTaskCount() external view returns (uint256) {
        return taskIds.length;
    }

    /**
     * @dev 根据阶段统计任务数量
     */
    function countByStage(RecycleStage _stage) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (recycleTasks[taskIds[i]].currentStage == _stage) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev 获取当前阶段名称
     */
    function getStageName(RecycleStage _stage) external pure returns (string memory) {
        if (_stage == RecycleStage.PendingRetirement) return "待退役";
        if (_stage == RecycleStage.PendingRecycle) return "待回收";
        if (_stage == RecycleStage.InTransit) return "运输中";
        if (_stage == RecycleStage.Received) return "已接收";
        if (_stage == RecycleStage.CascadeUse) return "梯次利用";
        if (_stage == RecycleStage.Dismantling) return "拆解中";
        if (_stage == RecycleStage.MaterialRecovery) return "材料回收";
        if (_stage == RecycleStage.Completed) return "已完成";
        return "未知";
    }
}
