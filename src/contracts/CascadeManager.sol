// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * CascadeManager - 梯次利用管理合约
 * 管理退役电池的梯次利用全流程：评估、安装、运行、结束
 */
contract CascadeManager {

    enum CascadeStatus {
        Evaluating,      // 评估中
        Evaluated,       // 已评估
        Installing,      // 梯次安装
        Operating,       // 运行中
        Completed,       // 已完成
        Terminated       // 已终止
    }

    enum ScenarioType {
        EnergyStorage,       // 储能电站
        BackupPower,         // 备用电源
        LowSpeedVehicle,     // 低速电动车
        CommunicationBase,   // 通信基站
        HomeStorage,         // 家庭储能
        Other               // 其他
    }

    struct CascadeRecord {
        string batteryId;
        string sourceVehicleVin;
        ScenarioType scenario;
        string targetProject;
        uint256 evaluationScore;
        CascadeStatus status;
        uint256 startDate;
        uint256 expectedEndDate;
        uint256 actualEndDate;
        bytes32 dataHash;
        address operator;
        uint256 blockNumber;
    }

    mapping(string => CascadeRecord[]) public cascadeHistory;
    mapping(string => uint256) public cascadeCount;
    string[] public cascadedBatteries;

    address public admin;
    mapping(address => bool) public authorizedOperators;

    event CascadeCreated(
        string batteryId,
        ScenarioType scenario,
        string targetProject,
        address operator,
        bytes32 dataHash,
        uint256 blockNumber
    );

    event CascadeStatusUpdated(
        string batteryId,
        CascadeStatus prevStatus,
        CascadeStatus newStatus,
        address operator,
        uint256 blockNumber
    );

    event CascadeEvaluated(
        string batteryId,
        uint256 score,
        bool passed,
        uint256 blockNumber
    );

    modifier onlyAuthorized() {
        require(authorizedOperators[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedOperators[msg.sender] = true;
    }

    function addOperator(address _operator) external {
        require(msg.sender == admin, "Only admin");
        authorizedOperators[_operator] = true;
    }

    function createCascade(
        string memory _batteryId,
        string memory _sourceVehicleVin,
        ScenarioType _scenario,
        string memory _targetProject,
        uint256 _expectedEndDate,
        bytes32 _dataHash
    ) external onlyAuthorized returns (uint256) {
        CascadeRecord memory record = CascadeRecord({
            batteryId: _batteryId,
            sourceVehicleVin: _sourceVehicleVin,
            scenario: _scenario,
            targetProject: _targetProject,
            evaluationScore: 0,
            status: CascadeStatus.Evaluating,
            startDate: 0,
            expectedEndDate: _expectedEndDate,
            actualEndDate: 0,
            dataHash: _dataHash,
            operator: msg.sender,
            blockNumber: block.number
        });

        cascadeHistory[_batteryId].push(record);
        uint256 index = cascadeCount[_batteryId];
        cascadeCount[_batteryId]++;

        if (index == 0) {
            cascadedBatteries.push(_batteryId);
        }

        emit CascadeCreated(_batteryId, _scenario, _targetProject, msg.sender, _dataHash, block.number);
        return index;
    }

    function recordEvaluation(
        string memory _batteryId,
        uint256 _index,
        uint256 _score,
        bool _passed
    ) external onlyAuthorized {
        require(_index < cascadeCount[_batteryId], "Invalid index");
        CascadeRecord storage record = cascadeHistory[_batteryId][_index];
        require(record.status == CascadeStatus.Evaluating, "Not in evaluation stage");

        record.evaluationScore = _score;
        record.status = _passed ? CascadeStatus.Evaluated : CascadeStatus.Terminated;

        emit CascadeEvaluated(_batteryId, _score, _passed, block.number);
    }

    function advanceStatus(
        string memory _batteryId,
        uint256 _index
    ) external onlyAuthorized {
        require(_index < cascadeCount[_batteryId], "Invalid index");
        CascadeRecord storage record = cascadeHistory[_batteryId][_index];

        CascadeStatus prev = record.status;
        require(uint256(prev) < uint256(CascadeStatus.Completed), "Already completed");

        if (prev == CascadeStatus.Evaluated) {
            record.status = CascadeStatus.Installing;
        } else if (prev == CascadeStatus.Installing) {
            record.status = CascadeStatus.Operating;
            record.startDate = block.timestamp;
        } else if (prev == CascadeStatus.Operating) {
            record.status = CascadeStatus.Completed;
            record.actualEndDate = block.timestamp;
        }

        emit CascadeStatusUpdated(_batteryId, prev, record.status, msg.sender, block.number);
    }

    function terminateCascade(
        string memory _batteryId,
        uint256 _index
    ) external onlyAuthorized {
        require(_index < cascadeCount[_batteryId], "Invalid index");
        CascadeRecord storage record = cascadeHistory[_batteryId][_index];

        CascadeStatus prev = record.status;
        require(prev != CascadeStatus.Completed && prev != CascadeStatus.Terminated, "Already finished");

        record.status = CascadeStatus.Terminated;
        record.actualEndDate = block.timestamp;

        emit CascadeStatusUpdated(_batteryId, prev, CascadeStatus.Terminated, msg.sender, block.number);
    }

    function getCascadeCount(string memory _batteryId) external view returns (uint256) {
        return cascadeCount[_batteryId];
    }

    function getCascadeRecord(string memory _batteryId, uint256 _index)
        external view returns (CascadeRecord memory)
    {
        require(_index < cascadeCount[_batteryId], "Invalid index");
        return cascadeHistory[_batteryId][_index];
    }

    function getTotalCascadedBatteries() external view returns (uint256) {
        return cascadedBatteries.length;
    }
}
