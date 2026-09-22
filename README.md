# Meirei (命令)

AI-Native Investment Mandate Architecture for Tokenized Equities on OKX X Layer (Chain ID 196).

Author: IboTV

---

## Overview

Meirei (命令 - "Command / Order") is an autonomous, non-custodial investment mandate platform that enables users to manage tokenized stocks (xStocks) on OKX X Layer as seamlessly as sending a text message. Through conversational interfaces on WhatsApp and Telegram or via a responsive web terminal, users deploy guardrailed investment mandates that execute programmatically on OKX X Layer ZK-rollup infrastructure.

### Core Pillars

1. **Non-Custodial Intent Architecture**:
   - Private keys never touch servers.
   - Meirei utilizes an Intent-Based Architecture. The AI bot acts as a solver, structuring the calldata for the trade and pushing a one-click signing prompt to the user's client. Private keys never leave the OKX Wallet.
   - On-chain executions are signed client-side via OKX Wallet / MetaMask or Telegram Mini App (TMA).
2. **Multi-Channel Conversational Access**:
   - Direct bot webhooks for WhatsApp and Telegram (@MeireiXLayerBot).
   - Spot price lookups, portfolio rebalancing quotes, and unit calculations in natural language.
3. **Guardrailed Mandate Engine & Ephemeral State**:
   - Time-windowed execution, drawdown circuit breakers, and spending caps.
   - Two-Factor Authentication (2FA OTP) backed by Serverless Redis with 300-second TTL, SHA-256 hashing, and constant-time verification (`crypto.timingSafeEqual`).
4. **OKX AI Agent Service Provider (ASP)**:
   - Full implementation of OKX.AI marketplace protocol standards.
   - Automated mandate evaluation, signal execution, and onchainos routing.
5. **Universal Dark Mode & Responsive Design**:
   - High-specificity dark variants, chat client native themes (WhatsApp `#0b141a`, Telegram `#0e1621`), and mobile viewport optimization.

---

## Supported Tokenized Equities (xStocks) on OKX X Layer

All assets trade against USDG (native settlement stablecoin on OKX X Layer Chain 196). Contract addresses are deployed and verifiable directly on the [OKX X Layer Block Explorer](https://www.okx.com/web3/explorer/xlayer):

| Ticker | Asset Name | Contract Address (X Layer) | OKX Block Explorer Link | Decimals |
| :--- | :--- | :--- | :--- | :--- |
| **USDG** | Global Dollar (Settlement) | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x4ae46a509f6b1d9056937ba4500cb143933d2dc8) | 6 |
| **USDC** | USD Coin | `0xb6ceceab302e2e4948951ee7843fc24e92933061` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0xb6ceceab302e2e4948951ee7843fc24e92933061) | 6 |
| **NVDAx** | NVIDIA Corp Tokenized Equity | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0xc845b2894dbddd03858fd2d643b4ef725fe0849d) | 18 |
| **AAPLx** | Apple Inc. Tokenized Equity | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a) | 18 |
| **MSFTx** | Microsoft Corp Tokenized Equity | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x5621737f42dae558b81269fcb9e9e70c19aa6b35) | 18 |
| **GOOGLx** | Alphabet Inc. Tokenized Equity | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0xe92f673ca36c5e2efd2de7628f815f84807e803f) | 18 |
| **AMZNx** | Amazon.com Inc. Tokenized Equity | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x3557ba345b01efa20a1bddc61f573bfd87195081) | 18 |
| **METAx** | Meta Platforms Inc. Tokenized Equity | `0x96702be57cd9777f835117a809c7124fe4ec989a` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x96702be57cd9777f835117a809c7124fe4ec989a) | 18 |
| **TSLAx** | Tesla Inc. Tokenized Equity | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0) | 18 |
| **COINx** | Coinbase Global Tokenized Equity | `0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25` | [Verify on OKX Explorer](https://www.okx.com/web3/explorer/xlayer/address/0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25) | 18 |

> OpenZeppelin mintable & burnable ERC20 source code is available in [`contracts/MockERC20.sol`](file:///contracts/MockERC20.sol) with deployment scripts in [`scripts/deploy-tokens.ts`](file:///scripts/deploy-tokens.ts) for both X Layer Mainnet (196) and X Layer Testnet (195).

---

## Liquidity & Execution Routing

While currently operating with synthetic mock assets for the hackathon, Meirei's routing engine is architecturally designed to plug directly into OKX Exchange OS on X Layer. By aggregating decentralized liquidity via Exchange OS, Meirei ensures that bot-driven mandates receive optimal spot execution with minimal slippage.

---

## Intent-to-Sign Architecture & Custody Model

Meirei utilizes an Intent-Based Architecture. The AI bot acts as a solver, structuring the calldata for the trade and pushing a one-click signing prompt to the user's client. Private keys never leave the OKX Wallet.

1. **User Mandate Submission**: The user texts an instruction in Telegram or WhatsApp (e.g. `"Buy 100 USDG NVDAx"`).
2. **AI Solver Calldata Generation**: The bot parses the command, checks the X Layer allowlist, quotes live spot price from OKX onchainos, and generates the transaction calldata.
3. **Approve Trade Prompt**: The bot responds with an interactive **"Approve Trade"** button containing an intent link.
4. **Client-Side Execution**: Clicking the button opens the Telegram Mini App (TMA) or deep-links to the Next.js Web Terminal (`https://meirei-rho.vercel.app/app`). The user connects their OKX Web3 Wallet, reviews the calldata, and signs client-side. The user's private keys never leave their device.

---

## Ephemeral State & Serverless Architecture

To prevent the serverless "in-memory" state loss trap on platforms like Vercel, Meirei handles temporary 2FA OTP state using serverless **Upstash Redis**:
- **5-Minute TTL (`ex: 300`)**: OTP challenges expire automatically after 300 seconds.
- **SHA-256 Hashing**: Plaintext OTP codes are never stored; only SHA-256 digests are retained in the datastore.
- **Constant-Time Verification**: Verification utilizes `crypto.timingSafeEqual` against the hash to prevent timing side-channel attacks.
- **Immediate Invalidation**: Upon verification or exceeding 3 failed attempts, records are purged instantly, maintaining our non-custodial, zero-persistent-database guarantee.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 with custom dark mode variants
- **State & Caching**: Serverless Upstash Redis (300s TTL) with graceful in-memory fallback
- **Smart Contracts**: OpenZeppelin Contracts v5.0 (ERC20, Mintable, Burnable, Ownable)
- **Execution Network**: OKX X Layer Mainnet (Chain ID 196, RPC `https://rpc.xlayer.tech`) & Testnet (Chain ID 195)
- **Testing**: Vitest, native node assertion suites

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

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev
```

The web application will be accessible at `http://localhost:3000` (or `https://meirei-rho.vercel.app`).

---

## Verification & Testing

Meirei includes comprehensive verification test suites:

```bash
# Run OKX AI ASP unit tests (54/54 passing)
npm run test:unit

# Test live read-only X Layer DEX quotes
npm run smoke:live

# Validate OKX AI ASP listing configuration
npm run asp:validate

# Parse natural language mandate into target weights
npm run parse -- "60% Mag7, 20% USDG, max 8%"

# Plan portfolio drift and quotes against real on-chain balances
npm run plan -- "60% Mag7, 20% USDG, max 8%" -w 0x7f17d6224e7d48606598732c3f511412b5c1e922

# Test WhatsApp and Telegram multi-channel webhooks
node scratch/test_webhooks.js

# Test 2FA OTP challenge and security flow
node scratch/test_otp_flow.js

# Compile production build
npm run build
```

---

## Architecture & Security

- **Zero Key Custody**: Private keys remain strictly within client devices.
- **Intent-Based Execution**: All bot interactions require explicit user signing in the client terminal or Telegram Mini App.
- **Constant-Time Cryptography**: HMAC-SHA256 signature checks and OTP verifications utilize timing-safe equality to defend against side-channel analysis.
- **Circuit Breakers**: Spending limits, sliding-window rate limiters, and automated trade quote expirations protect user funds.

---

## License

MIT License. Developed by IboTV.
