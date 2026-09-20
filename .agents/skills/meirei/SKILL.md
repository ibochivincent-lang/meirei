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
| **AAPLx** | Apple xStock | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | 18 | Equity |
| **MSFTx** | Microsoft xStock | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | 18 | Equity |
| **NVDAx** | NVIDIA xStock | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | 18 | Equity |
| **GOOGLx**| Alphabet xStock | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | 18 | Equity |
| **AMZNx** | Amazon xStock | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | 18 | Equity |
| **METAx** | Meta xStock | `0x96702be57cd9777f835117a809c7124fe4ec989a` | 18 | Equity |
| **TSLAx** | Tesla xStock | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | 18 | Equity |
| **USDG**  | Global Dollar | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | 6 | Cash / Settlement |
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
Start the local web dashboard:
```bash
npm run serve
# Access dashboard at http://127.0.0.1:8787
```

---

## Safety & Invariant Rules
1. **Chain is X Layer Only (196)**: Never default to Ethereum or Solana.
2. **Cap-Aware Normalization**: When `maxSingle` binds (e.g. `max 8%`), any excess sleeve allocation is absorbed by **cash (USDG)** to protect capital, never spilled over to other stocks.
3. **Fail-Soft Per Leg**: If one swap leg reverts on-chain (e.g. due to temporary liquidity), other legs must proceed where safe.
4. **Live Data Guarantee**: Do not return fabricated prices or mock hashes during production execution.
