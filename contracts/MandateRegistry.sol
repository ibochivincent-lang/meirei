// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title MandateRegistry
 * @author IboTV
 * @notice On-chain registry for AI-native investment mandates on OKX X Layer (Chain ID 196).
 * @dev Stores commitment hashes of natural-language and structured portfolio mandates.
 *      Enables non-custodial auditability, state verification, and historical provenance.
 */
contract MandateRegistry {
    struct MandateRecord {
        bytes32 mandateHash;
        uint48 registeredAt;
        uint48 updatedAt;
        bool isActive;
    }

    /// @notice Address of the registry owner / operator
    address public immutable owner;

    /// @notice Mapping from user wallet address to their primary active mandate hash
    mapping(address => bytes32) public mandateHash;

    /// @notice Detailed mandate records mapped by user wallet and mandate ID
    mapping(address => mapping(bytes32 => MandateRecord)) public mandateRecords;

    /// @notice List of all mandate IDs registered for a given user wallet
    mapping(address => bytes32[]) private userMandateIds;

    /// @notice Emitted when a user sets or updates their active mandate
    event MandateSet(
        address indexed wallet,
        bytes32 indexed mandateId,
        bytes32 indexed hash,
        uint48 timestamp
    );

    /// @notice Emitted when a user revokes or deactivates an existing mandate
    event MandateRevoked(
        address indexed wallet,
        bytes32 indexed mandateId,
        uint48 timestamp
    );

    /// @notice Restricts invocation to contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner permitted");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registers or updates the active investment mandate for the sender.
     * @param hash The keccak256 hash commitment of the mandate targets, caps, and parameters.
     */
    function setMandate(bytes32 hash) external {
        require(hash != bytes32(0), "Invalid mandate hash");

        bytes32 mandateId = keccak256(abi.encodePacked(msg.sender, block.timestamp, hash));
        uint48 currentTime = uint48(block.timestamp);

        mandateHash[msg.sender] = hash;

        mandateRecords[msg.sender][mandateId] = MandateRecord({
            mandateHash: hash,
            registeredAt: currentTime,
            updatedAt: currentTime,
            isActive: true
        });

        userMandateIds[msg.sender].push(mandateId);

        emit MandateSet(msg.sender, mandateId, hash, currentTime);
    }

    /**
     * @notice Registers a mandate with an explicit client-specified mandate ID.
     * @param mandateId Deterministic or client-assigned identifier for the mandate.
     * @param hash The keccak256 hash commitment of the mandate parameters.
     */
    function setMandateWithId(bytes32 mandateId, bytes32 hash) external {
        require(mandateId != bytes32(0), "Invalid mandate ID");
        require(hash != bytes32(0), "Invalid mandate hash");

        uint48 currentTime = uint48(block.timestamp);
        MandateRecord storage record = mandateRecords[msg.sender][mandateId];

        if (record.registeredAt == 0) {
            record.registeredAt = currentTime;
            userMandateIds[msg.sender].push(mandateId);
        }

        record.mandateHash = hash;
        record.updatedAt = currentTime;
        record.isActive = true;

        mandateHash[msg.sender] = hash;

        emit MandateSet(msg.sender, mandateId, hash, currentTime);
    }

    /**
     * @notice Revokes an active mandate for the sender.
     * @param mandateId The identifier of the mandate to revoke.
     */
    function revokeMandate(bytes32 mandateId) external {
        require(mandateRecords[msg.sender][mandateId].isActive, "Mandate not active");

        mandateRecords[msg.sender][mandateId].isActive = false;
        mandateRecords[msg.sender][mandateId].updatedAt = uint48(block.timestamp);

        if (mandateHash[msg.sender] == mandateRecords[msg.sender][mandateId].mandateHash) {
            delete mandateHash[msg.sender];
        }

        emit MandateRevoked(msg.sender, mandateId, uint48(block.timestamp));
    }

    /**
     * @notice Retrieves all registered mandate IDs for a given user wallet.
     * @param wallet The user address to query.
     */
    function getMandateIds(address wallet) external view returns (bytes32[] memory) {
        return userMandateIds[wallet];
    }

    /**
     * @notice Verifies if a given hash matches the user's currently active mandate commitment.
     * @param wallet The user address to verify.
     * @param hash The hash commitment to check against on-chain state.
     */
    function verifyMandate(address wallet, bytes32 hash) external view returns (bool) {
        return mandateHash[wallet] == hash && hash != bytes32(0);
    }
}
