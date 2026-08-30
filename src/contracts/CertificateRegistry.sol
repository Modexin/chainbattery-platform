// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @dev 证书登记合约 - 签发、验证、撤销电池相关数字证书
 */
contract CertificateRegistry {

    enum CertType { QualityCertificate, MaintenanceCert, RetirementReport, CascadeUtilizationCert, RecycleProof, ComplianceCert }

    struct Certificate {
        string batteryId;
        CertType certType;
        string certNumber;
        address issuer;
        uint256 issueDate;
        uint256 expiryDate;
        bytes32 dataHash;
        uint256 blockNumber;
        bool isValid;
    }

    mapping(string => Certificate) private certificates;
    mapping(string => string[]) private batteryCerts;
    mapping(address => bool) private authorizedIssuers;
    mapping(CertType => uint256) private certTypeCount;

    address public admin;
    uint256 public totalCertificates;
    uint256 public validCertificates;

    event CertificateIssued(
        string indexed certId,
        string indexed batteryId,
        CertType certType,
        string certNumber,
        address indexed issuer,
        uint256 blockNumber
    );

    event CertificateRevoked(
        string indexed certId,
        address indexed revoker,
        uint256 blockNumber
    );

    event IssuerAuthorized(address indexed issuer, bool authorized);

    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender] || msg.sender == admin, "Not authorized issuer");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    function authorizeIssuer(address _issuer) external onlyAdmin {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer, true);
    }

    function revokeIssuer(address _issuer) external onlyAdmin {
        authorizedIssuers[_issuer] = false;
        emit IssuerAuthorized(_issuer, false);
    }

    function issueCertificate(
        string memory _certId,
        string memory _batteryId,
        CertType _certType,
        string memory _certNumber,
        uint256 _expiryDate,
        bytes32 _dataHash
    ) external onlyAuthorized returns (bool) {
        require(bytes(_certId).length > 0, "Cert ID required");
        require(bytes(_batteryId).length > 0, "Battery ID required");
        require(bytes(_certNumber).length > 0, "Cert number required");
        require(!isCertExists(_certId), "Certificate already exists");

        uint256 blockNum = block.number;
        uint256 issueDate = block.timestamp;

        certificates[_certId] = Certificate({
            batteryId: _batteryId,
            certType: _certType,
            certNumber: _certNumber,
            issuer: msg.sender,
            issueDate: issueDate,
            expiryDate: _expiryDate,
            dataHash: _dataHash,
            blockNumber: blockNum,
            isValid: true
        });

        batteryCerts[_batteryId].push(_certId);
        certTypeCount[_certType]++;
        totalCertificates++;
        validCertificates++;

        emit CertificateIssued(_certId, _batteryId, _certType, _certNumber, msg.sender, blockNum);

        return true;
    }

    function revokeCertificate(string memory _certId) external onlyAdmin returns (bool) {
        require(isCertExists(_certId), "Certificate not found");
        require(certificates[_certId].isValid, "Already revoked");

        certificates[_certId].isValid = false;
        validCertificates--;

        emit CertificateRevoked(_certId, msg.sender, block.number);

        return true;
    }

    function getCertificate(string memory _certId) external view returns (Certificate memory) {
        require(isCertExists(_certId), "Certificate not found");
        return certificates[_certId];
    }

    function verifyCertificate(string memory _certId, bytes32 _dataHash) external view returns (bool) {
        if (!isCertExists(_certId)) return false;
        if (!certificates[_certId].isValid) return false;
        if (certificates[_certId].expiryDate > 0 && block.timestamp > certificates[_certId].expiryDate) return false;
        return certificates[_certId].dataHash == _dataHash;
    }

    function isCertExists(string memory _certId) public view returns (bool) {
        return bytes(certificates[_certId].certNumber).length > 0;
    }

    function isCertValid(string memory _certId) external view returns (bool) {
        if (!isCertExists(_certId)) return false;
        if (!certificates[_certId].isValid) return false;
        if (certificates[_certId].expiryDate > 0 && block.timestamp > certificates[_certId].expiryDate) return false;
        return true;
    }

    function getBatteryCertificates(string memory _batteryId) external view returns (string[] memory) {
        return batteryCerts[_batteryId];
    }

    function getCertCountByType(CertType _type) external view returns (uint256) {
        return certTypeCount[_type];
    }

    function getCertificateStats() external view returns (
        uint256 _total,
        uint256 _valid,
        uint256 _qualityCerts,
        uint256 _maintenanceCerts,
        uint256 _retirementReports,
        uint256 _cascadeCerts,
        uint256 _recycleProofs,
        uint256 _complianceCerts
    ) {
        return (
            totalCertificates,
            validCertificates,
            certTypeCount[CertType.QualityCertificate],
            certTypeCount[CertType.MaintenanceCert],
            certTypeCount[CertType.RetirementReport],
            certTypeCount[CertType.CascadeUtilizationCert],
            certTypeCount[CertType.RecycleProof],
            certTypeCount[CertType.ComplianceCert]
        );
    }
}
