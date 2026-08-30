// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BatteryTransfer
 * @dev 电池责任主体转移合约
 * 记录电池责任链：企业 → 车企 → 用户 → 回收机构 → 梯次利用企业
 */
contract BatteryTransfer {

    enum TransferType {
        ProductionToVehicle,    // 电池厂 → 车企
        VehicleToOwner,         // 车企 → 用户
        OwnerToRecycler,        // 用户 → 回收机构
        RecyclerToCascade,      // 回收机构 → 梯次利用企业
        CascadeToDismantler,     // 梯次利用 → 拆解企业
        EmergencyTransfer       // 紧急转移
    }

    struct TransferRecord {
        string batteryId;        // 电池编号
        address from;            // 转出方
        address to;              // 转入方
        TransferType transferType; // 转移类型
        string reason;           // 转移原因
        uint256 timestamp;       // 时间戳
        bytes32 dataHash;        // 转移文件Hash
    }

    mapping(string => address) private currentOwner;
    mapping(string => TransferRecord[]) private transferHistory;

    event BatteryTransferred(
        string indexed batteryId,
        address indexed from,
        address indexed to,
        TransferType transferType,
        uint256 timestamp
    );

    /**
     * @dev 初始化电池所有者（通常在注册时调用）
     */
    function initOwner(string memory _batteryId, address _owner) external {
        require(currentOwner[_batteryId] == address(0), "Owner already set");
        currentOwner[_batteryId] = _owner;
    }

    /**
     * @dev 转移电池责任主体
     * @param _batteryId 电池编号
     * @param _to 接收方地址
     * @param _transferType 转移类型
     * @param _reason 转移原因
     * @param _dataHash 转移文件Hash
     */
    function transferBattery(
        string memory _batteryId,
        address _to,
        TransferType _transferType,
        string memory _reason,
        bytes32 _dataHash
    ) external {
        address current = currentOwner[_batteryId];
        require(current != address(0), "Battery not initialized");
        require(current == msg.sender, "Only current owner can transfer");
        require(_to != address(0), "Invalid recipient");
        require(_to != msg.sender, "Cannot transfer to self");

        TransferRecord memory record = TransferRecord({
            batteryId: _batteryId,
            from: msg.sender,
            to: _to,
            transferType: _transferType,
            reason: _reason,
            timestamp: block.timestamp,
            dataHash: _dataHash
        });

        transferHistory[_batteryId].push(record);
        currentOwner[_batteryId] = _to;

        emit BatteryTransferred(_batteryId, msg.sender, _to, _transferType, block.timestamp);
    }

    /**
     * @dev 获取电池当前所有者
     */
    function getCurrentOwner(string memory _batteryId) external view returns (address) {
        return currentOwner[_batteryId];
    }

    /**
     * @dev 获取电池所有转移记录
     */
    function getTransferHistory(string memory _batteryId) external view returns (TransferRecord[] memory) {
        return transferHistory[_batteryId];
    }

    /**
     * @dev 获取转移记录数量
     */
    function getTransferCount(string memory _batteryId) external view returns (uint256) {
        return transferHistory[_batteryId].length;
    }

    /**
     * @dev 验证某地址是否曾拥有该电池
     */
    function hasOwned(string memory _batteryId, address _addr) external view returns (bool) {
        TransferRecord[] memory history = transferHistory[_batteryId];
        if (currentOwner[_batteryId] == _addr) return true;
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i].to == _addr) return true;
        }
        return false;
    }
}
