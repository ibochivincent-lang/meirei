# Changelog

All notable changes to Meirei are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-20

### Added

- **Autonomous AI Mandate Engine**: Converts natural-language investment directives into mathematically optimized portfolio rebalancing legs across 8 allowlisted equities on OKX X Layer (Chain ID 196).
- **Supported Tokenized Equities (xStocks)**: Full support for `NVDAx`, `AAPLx`, `MSFTx`, `METAx`, `GOOGLx`, `AMZNx`, and `TSLAx` with `USDG` and `USDC` settlement.
- **OKX Onchain OS Protocol Integration**: Seamless DEX aggregation quotes and swap execution on X Layer ZK-rollup infrastructure.
- **Two-Factor Authentication (2FA OTP)**: 6-digit cryptographic verification with HMAC-SHA256 authorization tokens and constant-time comparison (`crypto.timingSafeEqual`).
- **WebAuthn Hardware Biometric Signing**: Direct integration with browser `navigator.credentials.get` PublicKeyCredential hardware authentication and rawId cryptographic digest.
- **Multi-Channel Conversational Bots**: Native webhooks and polling handlers for Telegram, Meta WhatsApp, and interactive terminal simulators.
- **Emergency Circuit Breakers**: In-chat `/freeze` and `/unfreeze <code>` directives to embargo trading profiles and protect against unauthorized operations.
- **Real-Time 15-Second Spot Price Stream**: Dynamic live price polling on the trading terminal with green and red tick micro-animations and unit comparison calculator.
- **Zero-Database Architecture**: Complete operation decoupling from external databases using in-memory deterministic cryptographic state and on-chain verification.
- **OKX.AI Agent Service Provider (ASP)**: Validated Onchain OS ASP marketplace listing payload (`npm run asp:validate`).

[0.1.0]: https://github.com/ibochivincent-lang/meirei/releases/tag/v0.1.0
