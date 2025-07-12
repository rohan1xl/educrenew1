// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title EduCred
 * @dev Educational Credential NFT Contract
 * @notice This contract manages educational certificates as NFTs on the blockchain
 */
contract EduCred is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    struct Certificate {
        address student;
        address issuer;
        string metadataURI;
        uint256 issuedAt;
        bool isValid;
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(address => bool) public authorizedIssuers;

    event CertificateIssued(
        address indexed student,
        uint256 indexed tokenId,
        string metadataURI
    );

    event CertificateRevoked(uint256 indexed tokenId);

    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    modifier onlyAuthorizedIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "Not authorized to issue certificates"
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        // Owner is automatically an authorized issuer
        authorizedIssuers[msg.sender] = true;
    }

    /**
     * @dev Mint a new certificate NFT
     * @param student Address of the student receiving the certificate
     * @param metadataURI IPFS URI containing certificate metadata
     * @return tokenId The ID of the newly minted certificate
     */
    function mintCertificate(
        address student,
        string memory metadataURI
    ) public onlyAuthorizedIssuer returns (uint256) {
        require(student != address(0), "Invalid student address");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(student, tokenId);

        certificates[tokenId] = Certificate({
            student: student,
            issuer: msg.sender,
            metadataURI: metadataURI,
            issuedAt: block.timestamp,
            isValid: true
        });

        emit CertificateIssued(student, tokenId, metadataURI);

        return tokenId;
    }

    /**
     * @dev Revoke a certificate (mark as invalid)
     * @param tokenId The ID of the certificate to revoke
     */
    function revokeCertificate(uint256 tokenId) public {
        require(_exists(tokenId), "Certificate does not exist");
        require(
            certificates[tokenId].issuer == msg.sender || msg.sender == owner(),
            "Not authorized to revoke this certificate"
        );

        certificates[tokenId].isValid = false;
        emit CertificateRevoked(tokenId);
    }

    /**
     * @dev Get certificate data
     * @param tokenId The ID of the certificate
     * @return Certificate struct containing all certificate data
     */
    function getCertificateData(uint256 tokenId) public view returns (Certificate memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return certificates[tokenId];
    }

    /**
     * @dev Authorize an address to issue certificates
     * @param issuer Address to authorize
     */
    function authorizeIssuer(address issuer) public onlyOwner {
        require(issuer != address(0), "Invalid issuer address");
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @dev Revoke issuer authorization
     * @param issuer Address to revoke authorization from
     */
    function revokeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    /**
     * @dev Check if an address is an authorized issuer
     * @param issuer Address to check
     * @return bool True if authorized, false otherwise
     */
    function isAuthorizedIssuer(address issuer) public view returns (bool) {
        return authorizedIssuers[issuer] || issuer == owner();
    }

    /**
     * @dev Get the token URI for a certificate
     * @param tokenId The ID of the certificate
     * @return string The IPFS URI containing certificate metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return certificates[tokenId].metadataURI;
    }

    /**
     * @dev Get all certificates owned by an address
     * @param owner Address to query
     * @return uint256[] Array of token IDs owned by the address
     */
    function getCertificatesByOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev Batch mint certificates for multiple students
     * @param students Array of student addresses
     * @param metadataURIs Array of metadata URIs
     * @return uint256[] Array of token IDs for the minted certificates
     */
    function batchMintCertificates(
        address[] memory students,
        string[] memory metadataURIs
    ) public onlyAuthorizedIssuer returns (uint256[] memory) {
        require(students.length == metadataURIs.length, "Arrays length mismatch");
        require(students.length > 0, "Empty arrays");

        uint256[] memory tokenIds = new uint256[](students.length);

        for (uint256 i = 0; i < students.length; i++) {
            tokenIds[i] = mintCertificate(students[i], metadataURIs[i]);
        }

        return tokenIds;
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Prevent transfers of certificates (soulbound tokens)
     * Certificates should be non-transferable to maintain authenticity
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(
            from == address(0) || to == address(0),
            "Certificates are non-transferable"
        );
        super._beforeTokenTransfer(from, to, tokenId);
    }
}