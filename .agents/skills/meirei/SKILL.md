---
name: meirei
description: "AI-Native Investment Mandate Agent for X Layer (chain 196). Use when the user wants to trade tokenized stocks (xStocks) such as AAPLx, NVDAx, MSFTx, GOOGLx, AMZNx, METAx, TSLAx, and USDG/USDC on X Layer; create, plan, or execute natural-language portfolio rebalancing mandates; query live xStock prices and allowlisted assets; or operate the Meirei OKX AI ASP service."
license: MIT
metadata:
  author: meirei
  version: "0.2.0"
---

# 命令 Meirei — AI Investment Mandate Agent

Meirei is an AI-native orchestration layer built over **OKX Onchain OS** and executing exclusively on **X Layer (chain 196)**. It translates natural-language investment mandates into live tokenized stock (xStocks) and stablecoin portfolios.

Mental Model: **Frontend = Face · Backend = Brain · Onchain OS = Hands · X Layer = Ground.**

---

## Tradable Allowlist on X Layer (Chain 196)

Only the following allowlisted tokens are tradable. Never swap into unlisted tokens, memecoins, or wrapped duplicates:

| Symbol | Name | Address | Decimals | Type |
|---|---|---|---|---|
| **AAPLx** | Apple xStock | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | 18 | Equity (Consumer Tech) |
| **MSFTx** | Microsoft xStock | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | 18 | Equity (Cloud & Enterprise) |
| **NVDAx** | NVIDIA xStock | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | 18 | Equity (AI & GPUs) |
| **GOOGLx**| Alphabet xStock | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | 18 | Equity (Search & Cloud) |
| **AMZNx** | Amazon xStock | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | 18 | Equity (E-Commerce & AWS) |
| **METAx** | Meta xStock | `0x96702be57cd9777f835117a809c7124fe4ec989a` | 18 | Equity (Social & AI) |
| **TSLAx** | Tesla xStock | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | 18 | Equity (EV & Robotics) |
| **COINx** | Coinbase xStock | `0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25` | 18 | Equity (Crypto Infrastructure) |
| **SPYx** | S&P 500 ETF xStock | `0x42f7461c360980ff62c3e1db6aa5229c15d48721` | 18 | ETF (US Broad Market) |
| **QQQx** | Invesco QQQ xStock | `0x71c50b69107cc6ea56795f54070a7f1a8c9e5033` | 18 | ETF (Nasdaq-100 Tech) |
| **AMDx** | Advanced Micro Devices xStock | `0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2` | 18 | Equity (Semiconductors) |
| **CRWDx** | CrowdStrike xStock | `0x3a4b69c5819772bf258b3506c74ad64a787965df` | 18 | Equity (Cybersecurity) |
| **MSTRx** | MicroStrategy xStock | `0x7b58c9320b92f72bc97e79391ab1a457492c13fa` | 18 | Equity (Bitcoin Treasury) |
| **TSMx** | Taiwan Semiconductor xStock | `0x2a946b5d92e8c614efabcf6e1598da4c4e7926b1` | 18 | Equity (Foundry & Silicon) |
| **AVGOx** | Broadcom xStock | `0x6f31b87a912852643a6d71ec9103cba7e48df528` | 18 | Equity (Networking & Custom Silicon) |
| **INTCx** | Intel Corporation xStock | `0x18c4b726ae0d4f5b2f67ea9a36729a571c8901eb` | 18 | Equity (Foundry & Processors) |
| **MUx** | Micron Technology xStock | `0x91d3e74a812b704c356da7fe63098514ef1a52fc` | 18 | Equity (HBM3e & Memory) |
| **MRVLx** | Marvell Technology xStock | `0x48e1c67d301ba593fa88d5e4905cf71286b24a35` | 18 | Equity (Data Center Optical) |
| **IWMx** | Russell 2000 ETF xStock | `0x3c71a54b9d0263f1ec78b4a8e0380c5984cf7632` | 18 | ETF (US Small-Cap Benchmark) |
| **DELLx** | Dell Technologies xStock | `0x83e5fa62d908e234bc5719ab4c5770df594e9b7a` | 18 | Equity (AI Servers & Infrastructure) |
| **USDG**  | Global Dollar | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | 6 | Cash / Native Settlement |
| **USDC**  | USD Coin | `0xb6ceceab302e2e4948951ee7843fc24e92933061` | 6 | Cash / Settlement |

*Note: `GOOGx` does not exist on X Layer; the canonical token is `GOOGLx`. Wrapped tokens (`wAAPLx`, `SY-USDG`) are routing intermediaries only.*

---

## Core Agent Workflows

### 1. Querying Live Stocks and Market Prices
Always return real live prices from OKX market feed:
```bash
# Query spot price directly on X Layer
onchainos market price --address 0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a --chain xlayer

# Or via Meirei HTTP API:
GET http://127.0.0.1:8787/api/stocks
```

### 2. Inspecting Wallet Portfolio
Reads real balances on X Layer:
```bash
npx tsx src/cli.ts balance <wallet_address>
# or
onchainos portfolio all-balances --address <wallet_address> --chains xlayer
```

### 3. Parsing and Planning an Investment Mandate
Transforms natural language (e.g. `"60% mag7, 20% USDG, max 8%"`) into target weights, computes rebalance drift against wallet holdings, and fetches live quotes from the OKX DEX aggregator:
```bash
# Preview rebalance plan and quotes (NO BROADCAST)
npx tsx src/cli.ts plan "60% mag7, 20% USDG, max 8%" -w <wallet_address>

# Machine readable preview
npx tsx src/cli.ts plan "60% mag7, 20% USDG, max 8%" -w <wallet_address> --json
```

### 4. Executing Trades (Confirmation Gate Mandatory)
**CRITICAL SAFETY RULE**: Never broadcast without explicit user confirmation.
```bash
npx tsx src/cli.ts execute "60% mag7, 20% USDG, max 8%" -w <wallet_address> --confirm
```

### 5. OKX.AI ASP (Agent Service Provider) Management
```bash
# Pre-check ASP registration status & consent
npx tsx src/cli.ts asp precheck

# Inspect service registration payload
npx tsx src/cli.ts asp payload

# List registered ASP agents
npx tsx src/cli.ts asp list
```

### 6. Interactive Web Dashboard & Chat Server
- **Production Web Terminal**: https://meirei.tella.cash/app
- **Production Website**: https://meirei.tella.cash

Start the local web dashboard:
```bash
npm run dev
# Access local terminal at http://localhost:3000/app
```

---

## Safety & Invariant Rules
1. **Chain is X Layer Only (196)**: Never default to Ethereum or Solana.
2. **Cap-Aware Normalization**: When `maxSingle` binds (e.g. `max 8%`), any excess sleeve allocation is absorbed by **cash (USDG)** to protect capital, never spilled over to other stocks.
3. **Fail-Soft Per Leg**: If one swap leg reverts on-chain (e.g. due to temporary liquidity), other legs must proceed where safe.
4. **Live Data Guarantee**: Do not return fabricated prices or mock hashes during production execution.
