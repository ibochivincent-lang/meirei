# Project Meirei | Messaging Bot Setup and Deployment Guide

Author: IboTV  
Network: OKX X Layer Mainnet (Chain ID 196)  
Protocol: OKX Onchain OS AI Mandate Protocol  

This document provides step-by-step instructions for operating Project Meirei across Telegram, Meta WhatsApp, and the interactive terminal simulator.

---

## 1. Architecture Overview

Project Meirei operates as an AI-native investment mandate agent connecting users from their daily messaging channels (Telegram, WhatsApp) to OKX X Layer smart contract rails.

- **Non-Custodial Guarantee**: Private keys and seed phrases are never ingested, generated, or stored in server databases.
- **Universal Identity Anchor**: User profile records are keyed by verified email address and linked to messaging channel IDs.
- **Two-Factor Authorization**: High-impact portfolio actions require 6-digit numeric OTP confirmation before execution.
- **Onchain Signing Bridge**: Web3 transactions and rebalancing batches are signed via OKX Wallet deep-links or ERC-4337 smart accounts.

---

## 2. Telegram Bot Configuration

### Step 2.1: Obtain Bot Token from Telegram @BotFather
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to choose a display name and unique username (e.g. `MeireiXLayerBot`).
3. Copy the HTTP API token provided by BotFather (format: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
4. Add the token to your local environment file (`.env.local`):
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   ```

### Step 2.2: Local Development with Long-Polling (No Webhook Tunnel Required)
To run and test the live Telegram bot locally without setting up public HTTPS tunnels or ngrok:
1. Ensure your Next.js application is running (`npm run dev`).
2. Run the dedicated long-polling process in a separate terminal:
   ```bash
   npm run bot:poll
   ```
3. Open Telegram, start your bot with `/start`, and send natural language investment mandates:
   - "Buy 100 USDG of NVDAx"
   - "Rebalance 50% TSLAx and 50% AAPLx with 500 USDG"
   - "Portfolio status"
   - "What are current tokenized stock prices?"

### Step 2.3: Production Webhook Configuration (Vercel Deployment)
When deploying Project Meirei to production on Vercel:
1. Add `TELEGRAM_BOT_TOKEN` to your Vercel Project Environment Variables.
2. After deployment, bind your live webhook with one command:
   ```bash
   npm run bot:webhook https://your-deployment.vercel.app
   ```
   The script verifies the registration directly with the Telegram Bot API and returns the active status.

---

## 3. Meta WhatsApp Cloud API Setup

### Step 3.1: Meta for Developers App Setup
1. Navigate to [Meta for Developers](https://developers.facebook.com/) and register a Business App.
2. Add the **WhatsApp** product to your application.
3. Under WhatsApp > API Setup, obtain:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Temporary or Permanent System User Access Token

### Step 3.2: Configure Environment Variables
Add the following variables to `.env.local` and your production hosting provider:
```env
WHATSAPP_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="109283746501928"
WHATSAPP_VERIFY_TOKEN="your_custom_webhook_secret_phrase"
```

### Step 3.3: Webhook Registration in Meta Dashboard
1. Under WhatsApp > Configuration in the Meta Developer Console, enter:
   - **Callback URL**: `https://your-deployment.vercel.app/api/webhooks/whatsapp`
   - **Verify Token**: The exact string specified in `WHATSAPP_VERIFY_TOKEN`.
2. Click **Verify and Save**.
3. Under Webhook Fields, subscribe to `messages`.

---

## 4. Interactive Terminal Simulator (Local Development & Testing)

Project Meirei includes a standalone CLI simulator allowing instant testing of natural-language mandates, 2FA flows, and simulated X Layer routing without connecting to third-party APIs:

```bash
npm run bot:chat
```

Commands supported in the simulator:
- Direct text queries: "What is NVDAx price?"
- Execution mandates: "Allocate 200 USDG into MSFTx"
- Security verification: Input OTP code when prompted
- Channel inspection: `/status`, `/help`, `/reset`

---

## 5. Security and Guardrails

1. **Allowlisted Assets**: Only verified tokenized equities on OKX X Layer (NVDAx, AAPLx, MSFTx, GOOGLx, AMZNx, METAx, TSLAx) and USDG/USDC settlement assets are recognized.
2. **Spending Caps**: Every user identity enforces a daily spending limit ($25,000 USDG default ceiling) to prevent runaway transactions.
3. **Non-Custodial Execution**: When an order is finalized, a non-custodial Web3 signing link is returned to the user, ensuring the user signs the transaction from their authenticated OKX Wallet.
