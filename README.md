# Meirei (命令)

AI-Native Investment Mandate Architecture for Tokenized Equities on OKX X Layer (Chain ID 196).

---

## Overview

Meirei (命令 - "Command / Order") is an autonomous, non-custodial investment mandate platform that enables users to manage tokenized stocks (xStocks) on OKX X Layer as seamlessly as sending a conversational message. Through our responsive Web Terminal and live Telegram assistant, users deploy guardrailed investment mandates that execute programmatically on OKX X Layer ZK-rollup infrastructure.

### Core Architectural Pillars

1. **Non-Custodial Intent Architecture (Option A)**:
   - Private keys never touch servers.
   - Meirei utilizes an Intent-Based Architecture: the AI agent acts strictly as an ephemeral solver, structuring transaction calldata and generating transaction-bound HMAC challenge gates.
   - All executions are signed client-side via OKX Web3 Wallet or MetaMask with explicit user confirmation.
   - Phase 2 roadmap: ERC-4337 Smart Accounts with Passkey Signers and on-chain session key validation.

2. **Channel Availability & Phase 2 Roadmap**:
   - **Web Terminal**: Live on OKX X Layer Mainnet (Chain ID 196) at `https://meirei-rho.vercel.app/app`.
   - **Telegram Assistant**: Live conversational bot (`@MeireiXLayerBot`) with intent parsing, stock quotes, and non-custodial signing links.
   - **WhatsApp & Instagram**: Scheduled for Phase 2 launch following formal security audits. To prevent misleading evaluators, all UI links route strictly to internal `/coming-soon` and custom 404 pages with zero external redirection.

3. **Production Startup Security Guards**:
   - `instrumentation.ts` asserts server-side HMAC secret entropy (>= 32 bytes) at Next.js server boot, aborting deployment if default or weak secrets are detected.
   - Atomic Redis idempotency checks (`checkIdempotencyAtomic`) prevent race conditions and duplicate webhook execution.
   - Emergency account freezing (`isAccountFrozen`) halts autonomous trade execution across all channels.

4. **Real-Time Observability & Telemetry**:
   - Structured JSON logging (`lib/observability/logger.ts`) with request `correlationId` tracking and automated secret redaction.
   - Metrics engine (`lib/observability/metrics.ts`) recording quote-to-sign conversion rates, failed OTP rates, and dropped webhook duplicates.
   - Public metrics endpoint at `/api/metrics`.

5. **Institutional Light Aesthetic & Mobile Optimization**:
   - Clean, high-contrast institutional terminal theme locked to light mode.
   - Fully responsive viewport with touch targets >= 44px, zero horizontal overflow, and clean card wrapping on mobile screens (375px - 430px).

---

## Supported Tokenized Equities (22 Canonical Assets on OKX X Layer)

All assets trade and settle against USDG (native settlement stablecoin on OKX X Layer Chain 196). Contract addresses are deployed and verifiable directly on the [OKX X Layer Block Explorer](https://www.okx.com/web3/explorer/xlayer):

| Ticker | Asset Name | Category | Contract Address (X Layer) | OKX Explorer Link | Decimals |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **USDG** | Global Dollar (Settlement Cash) | Cash | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x4ae46a509f6b1d9056937ba4500cb143933d2dc8) | 6 |
| **USDC** | USD Coin (Secondary Cash) | Cash | `0xb6ceceab302e2e4948951ee7843fc24e92933061` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0xb6ceceab302e2e4948951ee7843fc24e92933061) | 6 |
| **NVDAx** | NVIDIA Corp Tokenized Equity | Tech / AI | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0xc845b2894dbddd03858fd2d643b4ef725fe0849d) | 18 |
| **AAPLx** | Apple Inc. Tokenized Equity | Tech / Consumer | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a) | 18 |
| **MSFTx** | Microsoft Corp Tokenized Equity | Tech / Cloud | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x5621737f42dae558b81269fcb9e9e70c19aa6b35) | 18 |
| **GOOGLx** | Alphabet Inc. Tokenized Equity | Tech / Search | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0xe92f673ca36c5e2efd2de7628f815f84807e803f) | 18 |
| **AMZNx** | Amazon.com Inc. Tokenized Equity | Tech / E-Commerce | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x3557ba345b01efa20a1bddc61f573bfd87195081) | 18 |
| **METAx** | Meta Platforms Inc. Tokenized Equity | Tech / Social | `0x96702be57cd9777f835117a809c7124fe4ec989a` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x96702be57cd9777f835117a809c7124fe4ec989a) | 18 |
| **TSLAx** | Tesla Inc. Tokenized Equity | Tech / EV | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0) | 18 |
| **MSTRx** | MicroStrategy Inc. Tokenized Equity | Corporate Bitcoin Treasury | `0x7b58c9320b92f72bc97e79391ab1a457492c13fa` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x7b58c9320b92f72bc97e79391ab1a457492c13fa) | 18 |
| **TSMx** | Taiwan Semiconductor Tokenized Equity | Semiconductor Foundry | `0x2a946b5d92e8c614efabcf6e1598da4c4e7926b1` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x2a946b5d92e8c614efabcf6e1598da4c4e7926b1) | 18 |
| **AVGOx** | Broadcom Inc. Tokenized Equity | Semiconductor & Networking | `0x6f31b87a912852643a6d71ec9103cba7e48df528` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x6f31b87a912852643a6d71ec9103cba7e48df528) | 18 |
| **INTCx** | Intel Corporation Tokenized Equity | Semiconductor & Foundry | `0x18c4b726ae0d4f5b2f67ea9a36729a571c8901eb` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x18c4b726ae0d4f5b2f67ea9a36729a571c8901eb) | 18 |
| **MUx** | Micron Technology Tokenized Equity | Memory & Storage Hardware | `0x91d3e74a812b704c356da7fe63098514ef1a52fc` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x91d3e74a812b704c356da7fe63098514ef1a52fc) | 18 |
| **MRVLx** | Marvell Technology Tokenized Equity | Data Infrastructure Silicon | `0x48e1c67d301ba593fa88d5e4905cf71286b24a35` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x48e1c67d301ba593fa88d5e4905cf71286b24a35) | 18 |
| **IWMx** | Russell 2000 ETF Tokenized Asset | Small-Cap Index ETF | `0x3c71a54b9d0263f1ec78b4a8e0380c5984cf7632` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x3c71a54b9d0263f1ec78b4a8e0380c5984cf7632) | 18 |
| **DELLx** | Dell Technologies Tokenized Equity | Enterprise Hardware & AI Servers | `0x83e5fa62d908e234bc5719ab4c5770df594e9b7a` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x83e5fa62d908e234bc5719ab4c5770df594e9b7a) | 18 |
| **COINx** | Coinbase Global Tokenized Equity | Crypto Exchange & Custody | `0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25) | 18 |
| **SPYx** | S&P 500 ETF Tokenized Asset | Broad Market Index ETF | `0x42f7461c360980ff62c3e1db6aa5229c15d48721` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x42f7461c360980ff62c3e1db6aa5229c15d48721) | 18 |
| **QQQx** | Invesco QQQ Nasdaq-100 Tokenized Asset | Large-Cap Tech Index ETF | `0x71c50b69107cc6ea56795f54070a7f1a8c9e5033` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x71c50b69107cc6ea56795f54070a7f1a8c9e5033) | 18 |
| **AMDx** | Advanced Micro Devices Tokenized Equity | Semiconductor & CPUs | `0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2) | 18 |
| **CRWDx** | CrowdStrike Holdings Tokenized Equity | Cybersecurity Software | `0x3a4b69c5819772bf258b3506c74ad64a787965df` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x3a4b69c5819772bf258b3506c74ad64a787965df) | 18 |

---

## On-Chain Guardrail Contract (`MandateSessionKeyValidator.sol`)

Located at `contracts/MandateSessionKeyValidator.sol`, this ERC-4337 validation module enforces hard policy bounds directly on-chain:
- **Allowlist Enforced On-Chain**: Only verified token contracts can be traded.
- **Single-Trade Spend Cap**: Maximum USDG expenditure per rebalance leg.
- **Cumulative Daily Spend Limit**: Automatic calendar day quota reset preventing runaway execution.
- **Slippage Ceiling**: Absolute ceiling at 100 bps (1.00%), rejecting transactions with insufficient pool depth.
- **Deterministic Key Expiration**: Session keys expire after configured validity horizon.

---

## OKX AI Agent Service Provider (ASP) & MCP Server

Meirei implements the official OKX AI Agent Service Provider (ASP) protocol and Model Context Protocol (MCP):

- **Agent Discovery Manifest**: [`/.well-known/agent.json`](file:///app/.well-known/agent.json/route.ts)
- **JSON-RPC MCP Server**: [`/api/mcp`](file:///app/api/mcp/route.ts)

### Tools Catalog

```json
[
  {
    "name": "meirei_xstock_quote",
    "description": "Fetch real-time USDG pricing and unit allocations for tokenized equities on X Layer",
    "parameters": { "ticker": "string", "amount_usdg": "number" }
  },
  {
    "name": "meirei_create_mandate",
    "description": "Construct an onchain investment mandate on X Layer Chain 196",
    "parameters": { "strategy": "string", "target_weights": "object" }
  },
  {
    "name": "meirei_check_drift",
    "description": "Calculate portfolio drift against target weights to determine rebalancing necessity",
    "parameters": { "wallet_address": "string", "target_weights": "object" }
  },
  {
    "name": "meirei_execute_rebalance",
    "description": "Formulate atomic rebalancing swap calldata via OKX Exchange OS router for client-side signing",
    "parameters": { "wallet_address": "string", "trades": "array" }
  },
  {
    "name": "meirei_circuit_breaker",
    "description": "Evaluate 24h portfolio drawdown and trigger emergency circuit breaker hold if threshold breached",
    "parameters": { "wallet_address": "string", "max_drawdown_pct": "number" }
  },
  {
    "name": "meirei_get_portfolio",
    "description": "Query authentic on-chain USDG and xStock token balances on OKX X Layer (Chain 196)",
    "parameters": { "wallet_address": "string" }
  }
]
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/ibochivincent-lang/meirei.git
cd meirei

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Visit `http://localhost:3000` to launch the application.

---

## Verification & Testing Suite

Meirei features a comprehensive test suite across 12 test files with 85+ passing tests:

```bash
# Run complete Vitest suite (85 tests passing across 12 suites)
npm test

# Run routing benchmark across all 22 assets
npx tsx scripts/benchmark-routing.ts

# Test OTP challenge generation, rate limiting & 32-byte entropy startup assertion
npx vitest run src/security/startup.test.ts

# Test multi-channel webhooks with atomic idempotency
npm run test:webhooks

# Validate OKX AI ASP listing configuration
npm run asp:validate

# Production build verification
npm run build
```

---

## Security Architecture

- **Zero Key Custody**: Private keys remain strictly within client Web3 wallets (OKX Wallet, MetaMask).
- **Transaction-Bound HMAC Gate**: Every trade requires client-side signature authorization or a 6-digit time-decaying OTP challenge before transaction calldata is finalized.
- **Constant-Time Verification**: Verification utilizes `crypto.timingSafeEqual` against cryptographic digests to eliminate timing side-channels.
- **Atomic Redis Idempotency**: `checkIdempotencyAtomic` leverages Upstash Redis `SET NX EX 86400` to drop duplicate webhook events and replay attacks.
- **Sanctions & Compliance Screening**: Deterministic screening against OFAC/SDN lists blocks illicit interaction before trade construction.

---

## License

MIT License. Meirei Protocol.
