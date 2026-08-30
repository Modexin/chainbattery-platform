// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RoleManager
 * @dev 机构身份与权限管理合约
 * 不同机构只能提交对应类型的数据
 */
contract RoleManager {

    enum Role {
        None,                  // 无角色
        BatteryManufacturer,   // 电池生产企业
        VehicleManufacturer,   // 汽车生产企业
        MaintenanceProvider,   // 维修机构
        TestingProvider,       // 检测机构
        Recycler,              // 回收企业
        Regulator              // 监管机构
    }

    struct Enterprise {
        string name;            // 企业名称
        string enterpriseType;  // 企业类型
        Role role;              // 角色
        address enterpriseAddr; // 企业地址
        bool isVerified;        // 是否已认证
        uint256 registeredAt;    // 注册时间
    }

    mapping(address => Enterprise) private enterprises;
    mapping(address => Role) private roles;
    mapping(address => bool) private isRegistered;
    address[] private enterpriseList;

    address public admin;

    event RoleAssigned(address indexed account, Role role, uint256 timestamp);
    event EnterpriseRegistered(address indexed account, string name, Role role, uint256 timestamp);
    event EnterpriseVerified(address indexed account, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Role not permitted");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev 注册企业并分配角色
     * @param _addr 企业地址
     * @param _name 企业名称
     * @param _enterpriseType 企业类型
     * @param _role 分配角色
     */
    function registerEnterprise(
        address _addr,
        string memory _name,
        string memory _enterpriseType,
        Role _role
    ) external onlyAdmin {
        require(!isRegistered[_addr], "Enterprise already registered");
        require(_role != Role.None, "Invalid role");

        enterprises[_addr] = Enterprise({
            name: _name,
            enterpriseType: _enterpriseType,
            role: _role,
            enterpriseAddr: _addr,
            isVerified: false,
            registeredAt: block.timestamp
        });

        roles[_addr] = _role;
        isRegistered[_addr] = true;
        enterpriseList.push(_addr);

        emit EnterpriseRegistered(_addr, _name, _role, block.timestamp);
    }

    /**
     * @dev 验证企业
     */
    function verifyEnterprise(address _addr) external onlyAdmin {
        require(isRegistered[_addr], "Enterprise not registered");
        enterprises[_addr].isVerified = true;
        emit EnterpriseVerified(_addr, block.timestamp);
    }

    /**
     * @dev 检查权限
     * @param _addr 待检查地址
     * @param _requiredRole 需要的角色
     */
    function checkPermission(address _addr, Role _requiredRole) external view returns (bool) {
        return roles[_addr] == _requiredRole && enterprises[_addr].isVerified;
    }

    /**
     * @dev 获取企业角色
     */
    function getRole(address _addr) external view returns (Role) {
        return roles[_addr];
    }

    /**
     * @dev 获取企业信息
     */
    function getEnterprise(address _addr) external view returns (Enterprise memory) {
        require(isRegistered[_addr], "Enterprise not registered");
        return enterprises[_addr];
    }

    /**
     * @dev 获取已注册企业总数
     */
    function getEnterpriseCount() external view returns (uint256) {
        return enterpriseList.length;
    }

    /**
     * @dev 检查企业是否已注册
     */
    function isEnterpriseRegistered(address _addr) external view returns (bool) {
        return isRegistered[_addr];
    }
}
