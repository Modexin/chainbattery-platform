// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CarbonCredit
 * @dev 碳减排追踪合约 - 记录梯次利用、材料回收、维修延寿的碳减排量
 */
contract CarbonCredit {

    enum ReductionType { CascadeUtilization, MaterialRecycling, MaintenanceExtending, GreenTransport }

    struct CarbonRecord {
        string batteryId;
        ReductionType recordType;
        string description;
        uint256 carbonSaved;
        string unit;
        address verifier;
        bytes32 dataHash;
        uint256 recordDate;
        uint256 blockNumber;
    }

    mapping(string => CarbonRecord[]) private carbonHistory;
    mapping(ReductionType => uint256) private totalByType;
    mapping(string => uint256) private totalByBattery;

    address public admin;
    uint256 public totalCarbonSaved;
    uint256 public totalRecords;
    uint256 public totalTreesEquivalent;

    mapping(address => bool) private authorizedVerifiers;

    event CarbonRecorded(
        string indexed batteryId,
        ReductionType recordType,
        uint256 carbonSaved,
        address indexed verifier,
        bytes32 dataHash,
        uint256 blockNumber
    );

    event VerifierAuthorized(address indexed verifier, bool authorized);

    modifier onlyAuthorized() {
        require(authorizedVerifiers[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedVerifiers[msg.sender] = true;
    }

    function authorizeVerifier(address _verifier) external onlyAdmin {
        authorizedVerifiers[_verifier] = true;
        emit VerifierAuthorized(_verifier, true);
    }

    function revokeVerifier(address _verifier) external onlyAdmin {
        authorizedVerifiers[_verifier] = false;
        emit VerifierAuthorized(_verifier, false);
    }

    function recordCarbonReduction(
        string memory _batteryId,
        ReductionType _type,
        string memory _description,
        uint256 _carbonSaved,
        string memory _unit,
        bytes32 _dataHash
    ) external onlyAuthorized returns (uint256) {
        require(_carbonSaved > 0, "Carbon saved must be positive");
        uint256 blockNum = block.number;

        CarbonRecord memory record = CarbonRecord({
            batteryId: _batteryId,
            recordType: _type,
            description: _description,
            carbonSaved: _carbonSaved,
            unit: _unit,
            verifier: msg.sender,
            dataHash: _dataHash,
            recordDate: block.timestamp,
            blockNumber: blockNum
        });

        carbonHistory[_batteryId].push(record);
        totalByType[_type] += _carbonSaved;
        totalByBattery[_batteryId] += _carbonSaved;
        totalCarbonSaved += _carbonSaved;
        totalRecords++;
        totalTreesEquivalent = totalCarbonSaved / 20;

        emit CarbonRecorded(_batteryId, _type, _carbonSaved, msg.sender, _dataHash, blockNum);

        return carbonHistory[_batteryId].length - 1;
    }

    function getCarbonHistory(string memory _batteryId) external view returns (CarbonRecord[] memory) {
        return carbonHistory[_batteryId];
    }

    function getCarbonByBattery(string memory _batteryId) external view returns (uint256) {
        return totalByBattery[_batteryId];
    }

    function getCarbonByType(ReductionType _type) external view returns (uint256) {
        return totalByType[_type];
    }

    function getCarbonSummary() external view returns (
        uint256 _totalCarbonSaved,
        uint256 _totalRecords,
        uint256 _totalTrees,
        uint256 _cascadeTotal,
        uint256 _recyclingTotal,
        uint256 _maintenanceTotal,
        uint256 _transportTotal
    ) {
        return (
            totalCarbonSaved,
            totalRecords,
            totalTreesEquivalent,
            totalByType[ReductionType.CascadeUtilization],
            totalByType[ReductionType.MaterialRecycling],
            totalByType[ReductionType.MaintenanceExtending],
            totalByType[ReductionType.GreenTransport]
        );
    }

    function getCarbonRecordCount(string memory _batteryId) external view returns (uint256) {
        return carbonHistory[_batteryId].length;
    }

    function verifyCarbonRecord(
        string memory _batteryId,
        uint256 _index,
        bytes32 _dataHash
    ) external view returns (bool) {
        require(_index < carbonHistory[_batteryId].length, "Index out of range");
        return carbonHistory[_batteryId][_index].dataHash == _dataHash;
    }

    function getCarbonTrend(string[] memory _batteryIds) external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory amounts = new uint256[](_batteryIds.length);
        uint256[] memory counts = new uint256[](_batteryIds.length);
        for (uint256 i = 0; i < _batteryIds.length; i++) {
            amounts[i] = totalByBattery[_batteryIds[i]];
            counts[i] = carbonHistory[_batteryIds[i]].length;
        }
        return (amounts, counts);
    }
}
