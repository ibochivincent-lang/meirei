# Meirei (命令)

> AI Native Investment Mandate Architecture for Tokenized Equities on OKX X Layer (Chain ID 196)
> Sole Author: IboTV

[![Live App](https://img.shields.io/badge/Live%20App-meirei.tella.cash%2Fapp-0052FF?style=flat-square)](https://meirei.tella.cash/app)
[![Website](https://img.shields.io/badge/Website-meirei.tella.cash-10B981?style=flat-square)](https://meirei.tella.cash)
[![Network](https://img.shields.io/badge/Network-OKX%20X%20Layer%20(Chain%20196)-0052FF?style=flat-square)](https://www.okx.com/web3/explorer/xlayer)
[![MandateRegistry](https://img.shields.io/badge/Contract-0x5E7095cC40303b12A1047E0BF2D39CF797379012-8B5CF6?style=flat-square)](https://www.oklink.com/xlayer/address/0x5E7095cC40303b12A1047E0BF2D39CF797379012)
[![Assets](https://img.shields.io/badge/Equities-22%20Allowlisted%20xStocks-10B981?style=flat-square)](https://www.okx.com/web3/explorer/xlayer)
[![Settlement](https://img.shields.io/badge/Settlement-USDG%20%7C%20USDC-F59E0B?style=flat-square)](https://www.okx.com/web3/explorer/xlayer)
[![Tests](https://img.shields.io/badge/Tests-90%2F90%20Passing-emerald?style=flat-square)](./src)
[![Gas](https://img.shields.io/badge/Gas-100%25%20Sponsored%20(Paymaster)-FF5B3E?style=flat-square)](https://www.okx.com/web3)

---

## 1. Executive Summary

Meirei is an AI-native investment mandate agent built natively on OKX X Layer (Chain ID 196) that translates natural-language portfolio instructions into guardrailed, non-custodial rebalancing executions settled in USDG.

Investors issue institutional-grade investment directives in plain language, such as:
- "60% MAG7, 20% USDG, max 8% single stock"
- "Put $50 into NVDAx and AAPLx weekly"
- "Rebalance to 50% NVDAx and 50% USDG when drift exceeds 5%"

Meirei parses the directive, queries authentic on-chain balances and live OKX DEX order-book benchmark prices, calculates minimal-transaction drift legs, enforces daily spending caps and non-custodial 2FA session safeguards, and broadcasts swaps across OKX DEX Aggregator pools with zero user gas friction.

---

## 2. Execution Model

* **Client-Signed Web3 Execution (Web App `/app`)**: Fully non-custodial. The web terminal formulates unsigned swap and mandate calldata for the OKX X Layer DEX aggregator router (`0x4ae4E9B8D0d5248A31A980998F4aA3F631167BA4`); transactions are reviewed, signed, and broadcast directly in the user's Web3 wallet (OKX Wallet, MetaMask) with post-broadcast on-chain confirmation verification.
* **Delegated Agent & Bot Execution (WhatsApp, Telegram, Cron)**: Bot channels generate swap calldata with one-tap client signing deep links (`https://meirei.tella.cash/app?action=sign&...`), alongside delegated execution via an authenticated Onchain OS agent wallet secured by SIWE wallet ownership verification, HMAC-SHA256 Two-Factor Authentication (OTP), and strict daily spend limits.

---

## 3. Core Architecture

```
+-----------------------------------------------------------------------------------+
|                                   USER INTERFACES                                 |
|   Web Terminal (/app)   |   Telegram (@MeireiXLayerBot)   |   Agent-to-Agent API  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                MEIREI RUNTIME LAYER                               |
|   /api/chat: Sanctions Check -> Account Freeze Check -> Rate Limiter (Redis)     |
|   Mandate Parser: Regex + Constraint Solver (Targets, Single-Stock Caps, Drift)   |
|   Security Guards: Idempotency Keys (Redis NX), Daily Spend Limits, OTP 2FA       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                OKX ONCHAIN OS LAYER                               |
|   OKX DEX Aggregator: Optimal swap routing, slippage control, quote estimation    |
|   OKX Agentic Wallet: Autonomous execution, balance queries, price feeds          |
|   OKX AI ASP: Registered Agent Service Provider for A2A paid mandate delivery     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                           OKX X LAYER ON-CHAIN STATE (196)                        |
|   MandateRegistry.sol: On-chain hash commitment of user portfolio mandates       |
|   MandateSessionKeyValidator.sol: ERC-4337 daily spend and slippage guardrails     |
|   22 Tokenized Equities (xStocks): AAPLx, NVDAx, MSFTx, GOOGLx, TSLAx, SPYx...   |
|   Settlement Tokens: USDG (Primary OKX Global Dollar) and USDC                    |
+-----------------------------------------------------------------------------------+
```

---

## 4. Key OKX Dev Day Integrations

1. **OKX X Layer (Chain ID 196)**:
   All operations execute natively on X Layer mainnet. Zero cross-chain bridge friction for tokenized equity swaps.
2. **OKX DEX Aggregator**:
   Every swap leg executes through OKX DEX Aggregator smart contracts, discovering optimal on-chain liquidity paths with tight slippage tolerance (max 100 bps).
3. **USDG Native Settlement**:
   OKX's Global Dollar (USDG) is the foundational base settlement currency for all equity quotes, cash rebalancing, and fee collections.
4. **OKX AI Agent Service Provider (ASP)**:
   Meirei is packaged as an autonomous ASP offering A2A (Agent to Agent) mandate execution for a flat $0.10 USDG protocol fee.
5. **On-Chain Smart Contracts**:
   - `contracts/MandateRegistry.sol`: On-chain registry mapping user addresses to mandate commitments (`setMandate(bytes32)`). Deployed on OKX X Layer (Chain ID 196) at `0x5E7095cC40303b12A1047E0BF2D39CF797379012`.
   - `contracts/MandateSessionKeyValidator.sol`: Non-custodial ERC-4337 validation module enforcing daily spend allowances and token allowlists.

---

## 5. Allowlisted Equities on OKX X Layer

All 22 tokenized equities and stablecoins are live on OKX X Layer (Chain ID 196):

| Symbol | Company / Benchmark | Category | Contract Address | Decimals |
| :--- | :--- | :--- | :--- | :--- |
| **USDG** | Global Dollar (Cash) | Settlement Stablecoin | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | 6 |
| **USDC** | USD Coin (Secondary) | Stablecoin Cash | `0xb6ceceab302e2e4948951ee7843fc24e92933061` | 6 |
| **NVDAx** | NVIDIA Corp | AI & Semiconductors | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | 18 |
| **AAPLx** | Apple Inc. | Consumer Tech | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | 18 |
| **MSFTx** | Microsoft Corp | Enterprise Software & Cloud | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | 18 |
| **GOOGLx**| Alphabet Inc. | Search & AI Infrastructure | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | 18 |
| **AMZNx** | Amazon.com Inc. | Cloud Computing & Commerce | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | 18 |
| **METAx** | Meta Platforms | Social Media & AI Compute | `0x96702be57cd9777f835117a809c7124fe4ec989a` | 18 |
| **TSLAx** | Tesla Inc. | Autonomous Vehicles & Clean Tech | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | 18 |
| **COINx** | Coinbase Global | Digital Asset Infrastructure | `0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25` | 18 |
| **TSMx** | Taiwan Semiconductor | Semiconductor Manufacturing | `0x2a946b5d92e8c614efabcf6e1598da4c4e7926b1` | 18 |
| **AVGOx** | Broadcom Inc. | Networking & Custom ASICs | `0x6f31b87a912852643a6d71ec9103cba7e48df528` | 18 |
| **AMDx** | Advanced Micro Devices | High Performance Compute | `0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2` | 18 |
| **INTCx** | Intel Corp | Foundry & Silicon | `0x18c4b726ae0d4f5b2f67ea9a36729a571c8901eb` | 18 |
| **MUx** | Micron Technology | Memory & Storage Solutions | `0x91d3e74a812b704c356da7fe63098514ef1a52fc` | 18 |
| **MRVLx** | Marvell Technology | Data Infrastructure Semiconductors| `0x48e1c67d301ba593fa88d5e4905cf71286b24a35` | 18 |
| **CRWDx** | CrowdStrike Holdings | Cybersecurity Cloud Architecture | `0x3a4b69c5819772bf258b3506c74ad64a787965df` | 18 |
| **MSTRx** | MicroStrategy | Corporate Treasury Asset | `0x7b58c9320b92f72bc97e79391ab1a457492c13fa` | 18 |
| **DELLx** | Dell Technologies | AI Infrastructure Servers | `0x83e5fa62d908e234bc5719ab4c5770df594e9b7a` | 18 |
| **SPYx** | S&P 500 ETF | Broad Market US Equities | `0x42f7461c360980ff62c3e1db6aa5229c15d48721` | 18 |
| **QQQx** | Invesco QQQ | Nasdaq-100 Large-Cap Tech | `0x71c50b69107cc6ea56795f54070a7f1a8c9e5033` | 18 |
| **IWMx** | Russell 2000 ETF | Small-Cap US Benchmark | `0x3c71a54b9d0263f1ec78b4a8e0380c5984cf7632` | 18 |

---

## 6. Security & Risk Engineering

- **Timing-Safe Cryptography**: Token and signature verifications use constant-time comparisons (`crypto.timingSafeEqual`) to prevent timing side channels.
- **Fail-Closed Account Freezing**: If security checks or state stores encounter anomalies, accounts default to fail-closed state.
- **Sanctions Screening**: Wallets are screened against local OFAC caches; malformed non-EVM addresses are rejected with 400 Bad Request before processing.
- **Atomic Idempotency**: Trade orders utilize Redis atomic reservations (`SET key NX EX 86400`) to guarantee that rapid double-clicks or duplicate network retries never double-execute trades.
- **Daily Spending Limits**: Configurable per-wallet 24-hour notional volume limits tracked in Redis with automatic day-boundary rollover.
- **Throttled Concurrency**: Subprocess execution against OnchainOS is governed by an asynchronous concurrency semaphore (max 4 concurrent child processes).

---

## 7. Verification & Test Suite

Meirei includes automated testing across unit logic, mandate parsing, security bounds, and X Layer asset configurations:

```bash
# Run all vitest unit tests (90 passing)
npm test

# Verify all 22 X Layer equity contracts and decimals
npm run verify:stocks

# Validate OKX AI ASP listing manifest
npm run asp:validate
```

---

## 8. Local Development & Demo Setup

### Prerequisites
- Node.js 20+
- npm or pnpm

### Quickstart

```bash
# Clone the repository
git clone https://github.com/ibochivincent-lang/meirei.git
cd meirei

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Run Next.js development server
npm run dev
```

### Environment Configuration

| Variable | Description | Default / Requirement |
| :--- | :--- | :--- |
| `MEIREI_CHAIN_ID` | OKX X Layer chain ID | `196` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for distributed state | Production requirement |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis authentication token | Production requirement |
| `OTP_SECRET` | HMAC secret for 2FA token generation | 32+ char random string |
| `MEIREI_MOCK_ONCHAINOS` | Set to 1 for offline sandbox demonstration | `0` in production |
| `MEIREI_WALLET` | Dev execution wallet address | Optional |

---

## 9. Authorship & License

- **Sole Author**: IboTV
- **License**: MIT License (c) 2026 IboTV
