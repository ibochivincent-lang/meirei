# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Report privately:

- **Preferred:** Open a [GitHub security advisory](https://github.com/ibochivincent-lang/meirei/security/advisories/new).
- Responsible disclosure is honoured and reporters are credited in release notes unless anonymity is requested.

## Supported Versions

The `main` branch is the actively supported surface.

## Non-Custodial Architecture & Signing Model

Meirei is strictly **non-custodial**:

- **Live Implementation (Option A - EOA Signing)**: All transactions are signed client-side through standard EOA wallets (OKX Wallet, MetaMask, or WalletConnect). Private keys never leave the user's browser or device. The server acts purely as a deterministic solver synthesizing transaction parameters.
- **Phase 2 Roadmap (Option B - ERC-4337 Smart Accounts)**: Transitioning to ERC-4337 smart accounts governed by P-256 WebAuthn passkeys with on-chain session key permissions, daily spending caps, and cryptographic calldata validation.
- **Zero Server-Held Keys**: Meirei servers never generate, custody, or access private keys or recovery seed phrases.

## State Architecture

Meirei clearly separates ephemeral and durable state:

- **Ephemeral Security State (Upstash Redis)**:
  - **Account Freeze**: `SET freeze:{profileId} 1` with no expiry, cleared only upon verified `/unfreeze`.
  - **Atomic Idempotency**: `SET idem:{hash} 1 NX EX 86400` prevents webhook replay races.
  - **Rate Limiting**: Sliding window on Redis sorted sets defending against automated brute-force attempts.
  - **HMAC OTP State**: Stored as `HMAC-SHA256(server_secret, challengeId || code || tradeDigest)` preventing offline dictionary attacks against Redis dumps.
- **Durable Identity State (Supabase)**:
  - Stores non-financial records: mapping verified user communication channels (email, WhatsApp, Telegram) to public EVM wallet addresses.
  - Retains immutable audit trails for dispute resolution.

## Two-Factor Authorization (2FA) & Cryptographic OTP

- **Transaction Parameter Binding**: Every OTP is cryptographically bound to the exact transaction parameters (asset, notional amount, trade calldata hash). An OTP issued for a $100 purchase cannot approve an alternate or expanded trade.
- **Lockout & Cooldown**: Enforces a strict 3-attempt lockout. After 3 invalid attempts, a 15-minute profile cooldown is enforced in Redis (`cooldown:otp:{id}`).
- **True Second Factor**: On-chain wallet signatures over verified calldata remain the ultimate cryptographic authorization for all fund movements.

## Sanctions & Asset Integrity

- **Pre-Quote Sanctions Screening**: Every wallet address is verified against the Chainalysis Sanctions Oracle and known OFAC Specially Designated Nationals (SDN) lists before any quote or calldata is generated.
- **Strict Allowlist**: Trading is restricted to allowlisted demo tokenized equities and ETFs on OKX X Layer (`AAPLx`, `MSFTx`, `NVDAx`, `GOOGLx`, `AMZNx`, `METAx`, `TSLAx`, `COINx`, `SPYx`, `QQQx`, `AMDx`, `CRWDx`, `MSTRx`, `TSMx`, `AVGOx`, `INTCx`, `MUx`, `MRVLx`, `IWMx`, `DELLx`) and cash stablecoins (`USDG`, `USDC`).
- **Slippage Bounds**: Max slippage bounds are enforced to protect users from front-running and execution drift.
