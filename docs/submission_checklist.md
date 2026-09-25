# Project Meirei — Hackathon Submission Checklist & Package

Track: Build a Company with OKX.AI  
Project Name: Meirei (命令)  
Tagline: AI-Native Investment Mandate Architecture for Tokenized Equities on OKX X Layer  
Network: OKX X Layer Mainnet (Chain ID 196)  
Repository: https://github.com/ibochivincent-lang/meirei  

---

## 1. Submission Deliverables Summary

| Deliverable | Status | Location / Command |
| :--- | :--- | :--- |
| GitHub Repository | Active & Public | https://github.com/ibochivincent-lang/meirei |
| Production Web App | Deployed & Live | https://meirei.tella.cash/app |
| MandateRegistry Contract | Verified on X Layer | `0x5E7095cC40303b12A1047E0BF2D39CF797379012` |
| Health Endpoint | Verified Live | `GET /api/health` |
| OKX AI ASP Listing | Validated & Staged | `npm run asp:validate` |
| Demo Video Runbook | Complete | `demos/demo-script.md` |
| Unit Test Suite | 85/85 Passing | `npm run test:unit` |
| Multi-Channel Webhooks | Verified | `npm run test:webhooks` |
| 2FA OTP Security | Verified | `npm run test:otp` |
| Production Build | Zero Errors | `npm run build` |

---

## 2. Judge Verification Commands (One-Line Reproducibility)

Run the following commands in the repository root to verify all layers:

```bash
# 1. Verify all 85 unit tests
npm run test:unit

# 2. Verify live read-only X Layer DEX quotes (no keys required)
npm run smoke:live

# 3. Verify OKX AI ASP Marketplace listing specification
npm run asp:validate

# 4. Parse natural-language investment mandate
npm run parse -- "60% Mag7, 20% USDG, max 8%"

# 5. Plan mandate drift and quotes against on-chain wallet state
npm run plan -- "60% Mag7, 20% USDG, max 8%" -w 0x7f17d6224e7d48606598732c3f511412b5c1e922

# 6. Verify full production build
npm run build
```

---

## 3. Submission Form Copy-Paste Blocks

### Project Title
Meirei — AI-Native Investment Mandate Agent on OKX X Layer

### Short Pitch (140 characters)
Autonomous, non-custodial investment mandate agent executing tokenized equity rebalances on OKX X Layer via WhatsApp, Telegram, and Web.

### Detailed Description
Meirei (命令 - "Command / Order") bridges conversational AI interfaces with institutional-grade portfolio rebalancing on OKX X Layer. Rather than forcing users to manually calculate swap legs, approve multiple transactions, and monitor DEX slippage across fragmented pools, Meirei allows users to state high-level portfolio mandates in natural language (e.g., "60% Mag7, 20% USDG, max 8% per stock").

The engine parses the mandate into concrete mathematical allocations across 20 allowlisted tokenized equities (including Mag7, semiconductors, crypto-adjacent equities, and index ETFs) and USDG/USDC settlement stablecoins. It queries live on-chain balances from X Layer Mainnet, computes the rebalancing delta, requests real-time quotes via the OKX DEX aggregator, enforces user-defined guardrails (drawdown caps, 2FA OTP verification, timing-safe cryptographic checks), and routes execution through client-side signatures or OKX Onchain OS.

Meirei is fully packaged as an OKX AI Agent Service Provider (ASP), allowing autonomous agents on the OKX.AI marketplace to discover, request, and settle investment mandate executions programmatically.

### How It Works (Technical Architecture)
1. **Mandate Parsing & Expansion**:
   The parsing engine normalizes natural-language instructions into target weight vectors. Abstract baskets like "Mag7" automatically resolve into allowlisted asset contracts, with strict enforcement that total portfolio weights sum to 100%.

2. **On-Chain Balance Discovery & Drift Calculation**:
   Meirei reads the user's live holdings on X Layer Mainnet via Onchain OS and RPC calls. It calculates drift against target weights and generates exact rebalance legs in USDG.

3. **OKX DEX Liquidity Routing**:
   Swap quotes are fetched directly from the OKX DEX aggregator on X Layer, ensuring optimal price impact, route optimization, and minimum received slippage guards.

4. **Non-Custodial Client Verification**:
   Private keys are never stored or transmitted. Trades require explicit user confirmation via WebAuthn Passkeys, EIP-1193 wallet prompts, or 2FA OTP before execution.

5. **OKX AI ASP Integration**:
   Exposes an A2A (Agent-to-Agent) service endpoint on the OKX.AI marketplace for automated portfolio rebalancing tasks with micro-fee settlement.

### What We Learned & Key Innovations
- Implementing zero-custody mandate execution ensures user sovereignty while retaining autonomous agent execution efficiency.
- Operating exclusively on X Layer Mainnet (Chain ID 196) unlocks sub-second ZK-rollup settlement for high-frequency rebalances with negligible gas costs.
- Unifying multi-channel messaging (WhatsApp Cloud API, Telegram Bot API) with biometric Passkey authentication eliminates the friction of traditional Web3 portfolio management.

---

## 4. Demo Video Recording Checklist

Follow the timing in `demos/demo-script.md` (Total duration: 2 to 4 minutes):

1. **0:00 - 0:20**: Introduction to the problem: "xStocks trade 24/7 on X Layer, but nobody runs a mandate for you." Introduce Meirei for the Build a Company with OKX.AI track.
2. **0:20 - 0:40**: Input the mandate: `60% Mag7, 20% USDG, max 8%`.
3. **0:40 - 1:10**: Demonstrate parsed targets: 7 names at 8% each, 44% in USDG.
4. **1:10 - 1:40**: Display current holdings vs target weights: calculated drift and proposed trade legs with live OKX DEX quotes.
5. **1:40 - 2:40**: Execute: show explicit confirmation prompt, client-side signature / broadcast, and generated transaction hashes.
6. **2:40 - 3:20**: Verify on OKLink X Layer Explorer: open the live transaction link.
7. **3:20 - 3:50**: Show OKX.AI ASP Marketplace listing (`npm run asp:list` / `npm run asp:validate`).
8. **3:50 - 4:00**: Conclude with repository URL and project vision.
