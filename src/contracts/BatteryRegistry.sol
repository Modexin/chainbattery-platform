// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BatteryRegistry
 * @dev 动力电池身份登记合约
 * 为每块动力电池创建唯一数字身份
 */
contract BatteryRegistry {

    enum BatteryStatus {
        Produced,        // 已生产
        InService,      // 在役
        UnderRepair,    // 维修中
        PendingRetire,  // 待退役
        CascadeUse,     // 梯次利用
        Recycled,       // 已回收
        EndOfLife       // 生命周期结束
    }

    struct Battery {
        string batteryId;       // 电池唯一编号 BAT-2026-CATL-00001852
        string manufacturer;    // 制造商
        string model;           // 电池型号
        string batteryType;     // 电芯类型 三元锂/磷酸铁锂
        string capacity;        // 额定容量
        string batch;            // 生产批次
        uint256 productionDate; // 生产日期时间戳
        BatteryStatus status;   // 当前状态
        address currentOwner;   // 当前责任主体
        bool exists;             // 是否存在
        uint256 registeredAt;    // 登记时间
    }

    mapping(string => Battery) private batteries;
    mapping(string => string) private vehicleBindings; // batteryId => vehicleVIN
    string[] private batteryIds;

    event BatteryRegistered(
        string indexed batteryId,
        string manufacturer,
        string model,
        address indexed registrar,
        uint256 timestamp
    );

    event BatteryStatusUpdated(
        string indexed batteryId,
        BatteryStatus newStatus,
        address indexed updater,
        uint256 timestamp
    );

    event VehicleBound(
        string indexed batteryId,
        string vehicleVIN,
        address indexed binder,
        uint256 timestamp
    );

    /**
     * @dev 注册新电池，创建数字身份
     * @param _batteryId 电池唯一编号
     * @param _manufacturer 制造商
     * @param _model 电池型号
     * @param _batteryType 电芯类型
     * @param _capacity 额定容量
     * @param _batch 生产批次
     * @param _productionDate 生产日期时间戳
     */
    function registerBattery(
        string memory _batteryId,
        string memory _manufacturer,
        string memory _model,
        string memory _batteryType,
        string memory _capacity,
        string memory _batch,
        uint256 _productionDate
    ) external {
        require(!batteries[_batteryId].exists, "Battery already registered");
        require(bytes(_batteryId).length > 0, "Battery ID cannot be empty");

        batteries[_batteryId] = Battery({
            batteryId: _batteryId,
            manufacturer: _manufacturer,
            model: _model,
            batteryType: _batteryType,
            capacity: _capacity,
            batch: _batch,
            productionDate: _productionDate,
            status: BatteryStatus.Produced,
            currentOwner: msg.sender,
            exists: true,
            registeredAt: block.timestamp
        });

        batteryIds.push(_batteryId);

        emit BatteryRegistered(_batteryId, _manufacturer, _model, msg.sender, block.timestamp);
    }

    /**
     * @dev 查询电池信息
     */
    function getBattery(string memory _batteryId) external view returns (Battery memory) {
        require(batteries[_batteryId].exists, "Battery not found");
        return batteries[_batteryId];
    }

    /**
     * @dev 更新电池状态
     */
    function updateBatteryStatus(string memory _batteryId, BatteryStatus _status) external {
        require(batteries[_batteryId].exists, "Battery not found");
        batteries[_batteryId].status = _status;
        emit BatteryStatusUpdated(_batteryId, _status, msg.sender, block.timestamp);
    }

    /**
     * @dev 绑定电池与车辆
     */
    function bindVehicle(string memory _batteryId, string memory _vehicleVIN) external {
        require(batteries[_batteryId].exists, "Battery not found");
        require(bytes(_vehicleVIN).length > 0, "VIN cannot be empty");
        vehicleBindings[_batteryId] = _vehicleVIN;
        emit VehicleBound(_batteryId, _vehicleVIN, msg.sender, block.timestamp);
    }

    /**
     * @dev 查询电池绑定的车辆VIN
     */
    function getVehicleBinding(string memory _batteryId) external view returns (string memory) {
        return vehicleBindings[_batteryId];
    }

    /**
     * @dev 获取已注册电池总数
     */
    function getBatteryCount() external view returns (uint256) {
        return batteryIds.length;
    }

    /**
     * @dev 检查电池是否已注册
     */
    function batteryExists(string memory _batteryId) external view returns (bool) {
        return batteries[_batteryId].exists;
    }
}
