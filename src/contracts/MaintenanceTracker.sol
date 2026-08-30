// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MaintenanceTracker
 * @dev 电池维护保养追踪合约 - 记录维护历史、追踪维护成本、管理保养周期
 */
contract MaintenanceTracker {

    enum MaintenanceType { Routine, CellReplacement, BMSUpdate, CoolingSystem, AccidentRepair, CascadeReassembly, Other }

    struct MaintenanceRecord {
        string batteryId;
        MaintenanceType maintType;
        string description;
        address provider;
        uint256 cost;
        uint256 maintenanceDate;
        uint256 nextMaintenanceDate;
        bytes32 dataHash;
        uint256 blockNumber;
        bool verified;
    }

    mapping(string => MaintenanceRecord[]) private maintenanceHistory;
    mapping(string => uint256) private lastMaintenanceDate;
    mapping(address => bool) private authorizedProviders;
    mapping(string => uint256) private totalMaintenanceCost;

    address public admin;
    uint256 public totalRecords;

    event MaintenanceLogged(
        string indexed batteryId,
        MaintenanceType maintType,
        address indexed provider,
        uint256 cost,
        bytes32 dataHash,
        uint256 blockNumber
    );

    event ProviderAuthorized(address indexed provider, bool authorized);

    modifier onlyAuthorized() {
        require(authorizedProviders[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedProviders[msg.sender] = true;
    }

    function authorizeProvider(address _provider) external onlyAdmin {
        authorizedProviders[_provider] = true;
        emit ProviderAuthorized(_provider, true);
    }

    function revokeProvider(address _provider) external onlyAdmin {
        authorizedProviders[_provider] = false;
        emit ProviderAuthorized(_provider, false);
    }

    function logMaintenance(
        string memory _batteryId,
        MaintenanceType _type,
        string memory _description,
        uint256 _cost,
        uint256 _maintenanceDate,
        uint256 _nextMaintenanceDate,
        bytes32 _dataHash
    ) external onlyAuthorized returns (uint256) {
        uint256 blockNum = block.number;

        MaintenanceRecord memory record = MaintenanceRecord({
            batteryId: _batteryId,
            maintType: _type,
            description: _description,
            provider: msg.sender,
            cost: _cost,
            maintenanceDate: _maintenanceDate,
            nextMaintenanceDate: _nextMaintenanceDate,
            dataHash: _dataHash,
            blockNumber: blockNum,
            verified: true
        });

        maintenanceHistory[_batteryId].push(record);
        lastMaintenanceDate[_batteryId] = _maintenanceDate;
        totalMaintenanceCost[_batteryId] += _cost;
        totalRecords++;

        emit MaintenanceLogged(_batteryId, _type, msg.sender, _cost, _dataHash, blockNum);

        return maintenanceHistory[_batteryId].length - 1;
    }

    function getMaintenanceHistory(string memory _batteryId) external view returns (MaintenanceRecord[] memory) {
        return maintenanceHistory[_batteryId];
    }

    function getMaintenanceCount(string memory _batteryId) external view returns (uint256) {
        return maintenanceHistory[_batteryId].length;
    }

    function getLastMaintenanceDate(string memory _batteryId) external view returns (uint256) {
        return lastMaintenanceDate[_batteryId];
    }

    function getTotalMaintenanceCost(string memory _batteryId) external view returns (uint256) {
        return totalMaintenanceCost[_batteryId];
    }

    function getMaintenanceByType(string memory _batteryId, MaintenanceType _type) external view returns (MaintenanceRecord[] memory) {
        MaintenanceRecord[] storage allRecords = maintenanceHistory[_batteryId];
        uint256 count = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].maintType == _type) count++;
        }
        MaintenanceRecord[] memory filtered = new MaintenanceRecord[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (allRecords[i].maintType == _type) {
                filtered[idx] = allRecords[i];
                idx++;
            }
        }
        return filtered;
    }

    function getUpcomingMaintenance(string[] memory _batteryIds, uint256 _beforeDate) external view returns (string[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _batteryIds.length; i++) {
            uint256 nextDate = maintenanceHistory[_batteryIds[i]].length > 0
                ? maintenanceHistory[_batteryIds[i]][maintenanceHistory[_batteryIds[i]].length - 1].nextMaintenanceDate
                : 0;
            if (nextDate > 0 && nextDate <= _beforeDate) count++;
        }
        string[] memory result = new string[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _batteryIds.length; i++) {
            uint256 nextDate = maintenanceHistory[_batteryIds[i]].length > 0
                ? maintenanceHistory[_batteryIds[i]][maintenanceHistory[_batteryIds[i]].length - 1].nextMaintenanceDate
                : 0;
            if (nextDate > 0 && nextDate <= _beforeDate) {
                result[idx] = _batteryIds[i];
                idx++;
            }
        }
        return result;
    }

    function verifyMaintenanceRecord(
        string memory _batteryId,
        uint256 _index,
        bytes32 _dataHash
    ) external view returns (bool) {
        require(_index < maintenanceHistory[_batteryId].length, "Index out of range");
        return maintenanceHistory[_batteryId][_index].dataHash == _dataHash;
    }
}
