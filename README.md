# Meirei (命令)

AI-Native Investment Mandate Architecture for Tokenized Equities on OKX X Layer (Chain ID 196).

Author: IboTV

---

## Overview

Meirei (命令 - "Command / Order") is an autonomous, non-custodial investment mandate platform that enables users to manage tokenized stocks (xStocks) on OKX X Layer as seamlessly as sending a text message. Through conversational interfaces on WhatsApp and Telegram or via a responsive web terminal, users deploy guardrailed investment mandates that execute programmatically on OKX X Layer ZK-rollup infrastructure.

### Core Pillars

1. **Non-Custodial Architecture**:
   - Private keys never touch servers.
   - On-chain executions are signed client-side via OKX Wallet / MetaMask or device WebAuthn passkey enclaves.
2. **Multi-Channel Conversational Access**:
   - Direct bot webhooks for WhatsApp and Telegram.
   - Spot price lookups, portfolio rebalancing quotes, and unit calculations in natural language.
3. **Guardrailed Mandate Engine**:
   - Time-windowed execution, drawdown circuit breakers, and spending caps.
   - Two-Factor Authentication (2FA OTP) with HMAC-SHA256 tokens and constant-time verification (`crypto.timingSafeEqual`).
4. **OKX AI Agent Service Provider (ASP)**:
   - Full implementation of OKX.AI marketplace protocol standards.
   - Automated mandate evaluation, signal execution, and onchainos routing.
5. **Universal Dark Mode & Responsive Design**:
   - High-specificity dark variants, chat client native themes (WhatsApp `#0b141a`, Telegram `#0e1621`), and mobile viewport optimization.

---

## Supported Tokenized Equities (xStocks)

All assets trade against USDG (native stablecoin on X Layer):

| Ticker | Asset Name | Contract Address (X Layer) |
| :--- | :--- | :--- |
| **NVDAx** | NVIDIA Corp Tokenized Equity | `0x1960000000000000000000000000000000000001` |
| **AAPLx** | Apple Inc. Tokenized Equity | `0x1960000000000000000000000000000000000002` |
| **MSFTx** | Microsoft Corp Tokenized Equity | `0x1960000000000000000000000000000000000003` |
| **GOOGLx** | Alphabet Inc. Tokenized Equity | `0x1960000000000000000000000000000000000004` |
| **AMZNx** | Amazon.com Inc. Tokenized Equity | `0x1960000000000000000000000000000000000005` |
| **METAx** | Meta Platforms Inc. Tokenized Equity | `0x1960000000000000000000000000000000000006` |
| **TSLAx** | Tesla Inc. Tokenized Equity | `0x1960000000000000000000000000000000000007` |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 with custom dark mode variants
- **Animations**: Framer Motion, Lenis smooth scroll
- **Architecture**: Zero-database in-memory deterministic cryptographic security with client-side WebAuthn enclaves & non-custodial X Layer smart accounts
- **Execution Network**: OKX X Layer Mainnet (Chain ID 196, RPC `https://rpc.xlayer.tech`)
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

The web application will be accessible at `http://localhost:3000`.

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
- **Constant-Time Cryptography**: HMAC-SHA256 signature checks and OTP verifications utilize timing-safe equality to defend against side-channel analysis.
- **Circuit Breakers**: Spending limits, sliding-window rate limiters, and automated trade quote expirations protect user funds.
- **Audit Documentation**: Review detailed specifications in `docs/architecture.md` and `docs/implementation-plan.md`.

---

## License

MIT License. Developed by IboTV.
