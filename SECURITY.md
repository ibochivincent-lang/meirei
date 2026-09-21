# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Report privately:

- **Preferred:** Open a [GitHub security advisory](https://github.com/ibochivincent-lang/meirei/security/advisories/new).
- Responsible disclosure is honoured and reporters are credited in release notes unless anonymity is requested.

## Supported Versions

The `main` branch is the actively supported surface.

## Non-Custodial Security Architecture

Meirei is strictly **non-custodial**:

- **Zero Server-Held Keys**: Private keys and seed phrases are never generated, ingested, or stored on servers.
- **Client-Side Hardware Signing**: Transaction signatures are performed directly in user client environments via WebAuthn hardware passkeys (Face ID, Touch ID, security keys) or through connected Web3 wallets (OKX Wallet, MetaMask).
- **OKX Onchain OS Protocol Bridge**: Swaps and portfolio rebalances execute on OKX X Layer (Chain ID 196) via the OKX DEX Aggregator router using verified contract allowlists.

## Two-Factor Authorization (2FA)

High-impact transactions require explicit two-factor confirmation:

- **2FA OTP Challenge**: Executing swaps or deploying active mandates requires a 6-digit cryptographic OTP challenge.
- **HMAC-SHA256 Session Tokens**: Verified OTP challenges issue short-lived (10-minute validity horizon) HMAC-SHA256 authorization tokens.
- **Constant-Time Verification**: All security tokens and challenge codes are validated using constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Rate Limiting & Tiered Throttle**: In-memory token-bucket rate limiters enforce distinct tiers for read queries versus trade execution intents.

## Emergency Circuit Breakers

- **In-Chat Freeze**: Users can freeze their trading profile from any channel (Telegram, WhatsApp, or Web) by sending `/freeze`.
- **Immediate Embargo**: Freezing invalidates all active 2FA authorization tokens and prevents any on-chain mandate executions.
- **Cryptographic Unfreeze**: Unfreezing requires providing the specific 6-digit recovery code issued at freeze time (`/unfreeze <code>`).

## Network & Asset Integrity

- **Strict Allowlist**: Trading is restricted to allowlisted tokenized equities on OKX X Layer (`NVDAx`, `AAPLx`, `MSFTx`, `METAx`, `GOOGLx`, `AMZNx`, `TSLAx`) and native stablecoins (`USDG`, `USDC`).
- **Slippage Bounds**: Max slippage bounds are enforced on swap quotes to protect against front-running and illiquidity.
- **Idempotency & Replay Protection**: Inbound webhook messages and trade instructions are tracked using cryptographic operation hashes to eliminate duplicate execution.
