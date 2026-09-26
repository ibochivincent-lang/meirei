# Meirei Developer & Operational Scripts

This directory contains standalone operational, deployment, and testing utilities for the Meirei non-custodial investment mandate platform on OKX X Layer (Chain ID 196).

## Scripts Overview

### 1. `smoke-live.ts`
- **Purpose**: Performs real-time on-chain smoke tests against the OKX X Layer Mainnet RPC (`https://xlayerrpc.okx.com`).
- **Usage**: `npx tsx scripts/smoke-live.ts`
- **Actions**: Checks chain connectivity, queries block number, fetches live OKB gas balance, and queries allowlisted token contracts.

### 2. `deploy-tokens.ts`
- **Purpose**: Deploys standard OpenZeppelin mintable ERC-20 token contracts for hackathon testing and staging on OKX X Layer Testnet (Chain ID 195) or Mainnet (Chain ID 196).
- **Usage**:
  - Testnet: `npx tsx scripts/deploy-tokens.ts --network testnet`
  - Mainnet: `npx tsx scripts/deploy-tokens.ts --network mainnet`

### 3. `resolve-allowlist.mjs`
- **Purpose**: Utility script that verifies contract addresses against OKX Onchain OS CLI and outputs canonical allowlist entries with decimals and symbol mappings.
- **Usage**: `node scripts/resolve-allowlist.mjs`

### 4. `test_otp_flow.js`
- **Purpose**: End-to-end integration test validating the HMAC-SHA256 OTP challenge generation, transaction parameter digest binding, 3-attempt lockout, and 15-minute cooldown enforcement.
- **Usage**: `node scripts/test_otp_flow.js`

### 5. `test_webhooks.js`
- **Purpose**: Simulates incoming social messaging webhooks (Meta Cloud API for WhatsApp and Telegram Bot API) to verify natural language parsing, idempotency handling, and quote responses.
- **Usage**: `npm run test:webhooks` or `node scripts/test_webhooks.js`
