// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MandateSessionKeyValidator
 * @notice ERC-4337 Validation Module and On-Chain Guardrail for Meirei Mandate Execution.
 * @dev Enforces strict policy constraints on-chain for autonomous agent rebalancing sessions:
 *      1. Destination token MUST be in the verified OKX X Layer allowlist.
 *      2. Single-trade notional spend is capped by session limit.
 *      3. Daily cumulative spend cannot exceed configured allowance.
 *      4. Max slippage cannot exceed safe execution bounds (<= 100 bps / 1.00%).
 *      5. Session keys expire deterministically after configured validity window.
 *
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 * Settlement: USDG / USDC
 * Author: IboTV <290086463+ibochivincent-lang@users.noreply.github.com>
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

contract MandateSessionKeyValidator {
    // -------------------------------------------------------------------------
    // Constants & Configuration
    // -------------------------------------------------------------------------

    uint256 public constant VALIDATION_SUCCESS = 0;
    uint256 public constant VALIDATION_FAILED = 1;

    uint256 public constant MAX_PERMISSIBLE_SLIPPAGE_BPS = 100; // 1.00% absolute ceiling
    uint256 public constant BPS_DENOMINATOR = 10000;

    address public immutable protocolOwner;
    address public immutable treasuryAddress;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct SessionPolicy {
        address sessionKey;
        uint48 validUntil;
        uint48 validAfter;
        uint256 maxSpendPerTradeUsdg;
        uint256 dailySpendLimitUsdg;
        uint256 currentDailySpentUsdg;
        uint48 lastSpendDayTimestamp;
        uint16 maxSlippageBps;
        bool isActive;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    // accountAddress => sessionKey => SessionPolicy
    mapping(address => mapping(address => SessionPolicy)) public sessionPolicies;

    // tokenAddress => isAllowlisted
    mapping(address => bool) public allowlistedTokens;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event SessionKeyRegistered(
        address indexed account,
        address indexed sessionKey,
        uint48 validUntil,
        uint256 maxSpendPerTrade,
        uint256 dailyLimit
    );

    event SessionKeyRevoked(address indexed account, address indexed sessionKey);
    event AllowlistUpdated(address indexed token, bool isAllowed);
    event TradeValidated(address indexed account, address indexed sessionKey, address indexed token, uint256 amountUsdg);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == protocolOwner, "Only protocol owner can perform this action");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _treasury) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        protocolOwner = msg.sender;
        treasuryAddress = _treasury;
    }

    // -------------------------------------------------------------------------
    // Admin & Policy Management
    // -------------------------------------------------------------------------

    function setTokenAllowlist(address token, bool isAllowed) external onlyOwner {
        require(token != address(0), "Token cannot be zero address");
        allowlistedTokens[token] = isAllowed;
        emit AllowlistUpdated(token, isAllowed);
    }

    function registerSessionKey(
        address sessionKey,
        uint48 validUntil,
        uint48 validAfter,
        uint256 maxSpendPerTradeUsdg,
        uint256 dailySpendLimitUsdg,
        uint16 maxSlippageBps
    ) external {
        require(sessionKey != address(0), "Session key cannot be zero address");
        require(validUntil > block.timestamp, "validUntil must be in future");
        require(validUntil > validAfter, "validUntil must exceed validAfter");
        require(maxSlippageBps <= MAX_PERMISSIBLE_SLIPPAGE_BPS, "Slippage exceeds 100 bps max ceiling");

        sessionPolicies[msg.sender][sessionKey] = SessionPolicy({
            sessionKey: sessionKey,
            validUntil: validUntil,
            validAfter: validAfter,
            maxSpendPerTradeUsdg: maxSpendPerTradeUsdg,
            dailySpendLimitUsdg: dailySpendLimitUsdg,
            currentDailySpentUsdg: 0,
            lastSpendDayTimestamp: uint48(block.timestamp / 86400),
            maxSlippageBps: maxSlippageBps,
            isActive: true
        });

        emit SessionKeyRegistered(msg.sender, sessionKey, validUntil, maxSpendPerTradeUsdg, dailySpendLimitUsdg);
    }

    function revokeSessionKey(address sessionKey) external {
        sessionPolicies[msg.sender][sessionKey].isActive = false;
        emit SessionKeyRevoked(msg.sender, sessionKey);
    }

    // -------------------------------------------------------------------------
    // ERC-4337 Validation Hook
    // -------------------------------------------------------------------------

    /**
     * @notice Validates that a userOp adheres to session constraints.
     * @param userOp The ERC-4337 UserOperation struct.
     * @param userOpHash Hash of the userOp as defined by EntryPoint.
     * @return validationData Packed validation status, validUntil, and validAfter timestamps.
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) external returns (uint256 validationData) {
        address account = userOp.sender;
        bytes calldata sig = userOp.signature;

        // Signature layout: [32 bytes: sessionKey] [65 bytes: ECDSA signature] [32 bytes: token] [32 bytes: amountUsdg]
        if (sig.length < 161) {
            return _packValidationData(true, 0, 0);
        }

        address sessionKey = address(bytes20(sig[12:32]));
        bytes memory ecdsaSig = sig[32:97];
        address targetToken = address(bytes20(sig[109:129]));
        uint256 amountUsdg = abi.decode(sig[129:161], (uint256));

        SessionPolicy storage policy = sessionPolicies[account][sessionKey];

        // 1. Verify policy is active
        if (!policy.isActive) {
            return _packValidationData(true, 0, 0);
        }

        // 2. Verify target token is allowlisted
        if (!allowlistedTokens[targetToken]) {
            return _packValidationData(true, 0, 0);
        }

        // 3. Verify single-trade limit
        if (amountUsdg > policy.maxSpendPerTradeUsdg) {
            return _packValidationData(true, 0, 0);
        }

        // 4. Verify daily cumulative limit
        uint48 currentDay = uint48(block.timestamp / 86400);
        if (currentDay > policy.lastSpendDayTimestamp) {
            policy.currentDailySpentUsdg = 0;
            policy.lastSpendDayTimestamp = currentDay;
        }

        if (policy.currentDailySpentUsdg + amountUsdg > policy.dailySpendLimitUsdg) {
            return _packValidationData(true, 0, 0);
        }

        // 5. Verify ECDSA signature of sessionKey over userOpHash
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        address recoveredSigner = _recoverSigner(ethSignedHash, ecdsaSig);
        if (recoveredSigner != sessionKey) {
            return _packValidationData(true, 0, 0);
        }

        // Update spent quota
        policy.currentDailySpentUsdg += amountUsdg;
        emit TradeValidated(account, sessionKey, targetToken, amountUsdg);

        return _packValidationData(false, policy.validUntil, policy.validAfter);
    }

    // -------------------------------------------------------------------------
    // Internal Utilities
    // -------------------------------------------------------------------------

    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << (160 + 48));
    }

    function _recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);

        return ecrecover(messageHash, v, r, s);
    }
}
