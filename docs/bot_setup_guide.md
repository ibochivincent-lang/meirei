# Project Meirei | Messaging Bot Setup and Deployment Guide

Network: OKX X Layer Mainnet (Chain ID 196)  
Protocol: OKX Onchain OS AI Mandate Protocol  

This document provides exhaustive, step-by-step instructions for creating, configuring, and operating Project Meirei across **Telegram**, **Meta WhatsApp Cloud API**, and the **Interactive Terminal Simulator**.

---

## 1. Architecture Overview

Project Meirei operates as an AI-native investment mandate agent connecting users from their daily messaging channels (Telegram, WhatsApp) to OKX X Layer smart contract rails:

- **Non-Custodial Guarantee**: Private keys and seed phrases are never ingested, generated, or stored on servers.
- **Zero-Database Architecture**: User identities are derived deterministically in-memory using cryptographic SHA-256 anchors with no database requirements.
- **Two-Factor Authorization (2FA)**: High-impact portfolio actions require 6-digit numeric OTP confirmation before execution.
- **Onchain Signing Bridge**: Web3 transactions and rebalancing batches are signed via WebAuthn hardware passkeys or OKX Wallet deep-links.

---

## 2. Telegram Bot Configuration (Full Steps)

### Step 2.1: Create Bot with Telegram @BotFather
1. Open your Telegram client and search for the official account **`@BotFather`** (verified with blue checkmark).
2. Start the conversation and send the command:
   ```text
   /newbot
   ```
3. BotFather will prompt you for a display name. Enter:
   ```text
   Meirei AI Mandate Agent
   ```
4. BotFather will prompt you for a unique username (must end in `bot`). Enter:
   ```text
   MeireiXLayerBot
   ```
   *(If already taken, choose a unique variant like `MeireiTradeBot` or `Meirei_XLayer_Bot`)*.
5. BotFather will confirm creation and provide your **HTTP API Token** formatted as:
   ```text
   7890123456:AAFlk9j238fhsad89fhasdf9823hfasdf
   ```
6. Copy this token and save it in your project's `.env` or `.env.local` file:
   ```env
   TELEGRAM_BOT_TOKEN="7890123456:AAFlk9j238fhsad89fhasdf9823hfasdf"
   ```

### Step 2.2: Configure Bot Commands Menu
In your chat with `@BotFather`, set up the command shortcuts:
1. Send command:
   ```text
   /setcommands
   ```
2. Select your newly created bot.
3. Paste the following command list:
   ```text
   start - Start conversational trading on OKX X Layer
   stocks - List all 8 allowlisted xStocks and live spot prices
   price - Get real-time spot price of any tokenized equity
   compare - Compare spot prices between two tokenized equities
   calculate - Calculate units received for an amount of USDG
   freeze - Trigger immediate emergency account freeze
   unfreeze - Lift freeze using your 6-digit recovery code
   help - Show trading mandate syntax and examples
   ```

### Step 2.3: Local Development & Long-Polling (No Webhook Tunnel Required)
To run and test the Telegram bot locally without needing public HTTPS tunnels or ngrok:
1. Ensure your Next.js application is running:
   ```bash
   npm run dev
   ```
2. In a separate terminal, launch the dedicated long-poller:
   ```bash
   npm run bot:poll
   ```
3. Open Telegram, start your bot with `/start`, and send natural language prompts:
   - `stocks`
   - `price of NVDAx`
   - `Buy 250 USDG of NVDAx`
   - `Compare NVDAx vs MSFTx`
   - `How many units of AAPLx for 500 USDG?`
   - `/freeze`

### Step 2.4: Production Webhook Registration (Vercel Deployment)
When deploying your Meirei instance to production:
1. Add `TELEGRAM_BOT_TOKEN` to your Vercel Project Environment Variables.
2. Deploy the application to Vercel (or your custom domain).
3. Bind the live webhook with our built-in CLI:
   ```bash
   npm run bot:webhook https://meirei.tella.cash
   ```
   *(Or pass the token directly as an argument: `npm run bot:webhook https://meirei.tella.cash 7890123456:AAFlk...`)*.
4. The CLI will register `https://meirei.tella.cash/api/webhooks/telegram` directly with the Telegram Bot API and return confirmation:
   ```json
   { "ok": true, "result": true, "description": "Webhook was set" }
   ```

---

## 3. Meta WhatsApp Cloud API Setup (Full Steps)

### Step 3.1: Meta for Developers App Setup
1. Navigate to [Meta for Developers](https://developers.facebook.com/) and sign in with your Facebook account.
2. Click **My Apps** > **Create App**.
3. For Use Case, select **Other**, then click **Next**.
4. Select **Business** as the App Type and provide an App Name (e.g. `Meirei AI Mandates`).
5. In the App Dashboard, scroll to **Add products to your app**, find **WhatsApp**, and click **Set up**.

### Step 3.2: Obtain Credentials from API Setup
In the left sidebar, navigate to **WhatsApp** > **API Setup**:
1. Locate **Phone number ID** (e.g. `102938475610293`).
2. Locate **WhatsApp Business Account ID** (e.g. `109283746501928`).
3. For local testing, copy the **Temporary access token**.
4. For production, generate a permanent System User Token:
   - Go to **Business Settings** > **System Users**.
   - Create a System User with Admin role.
   - Click **Generate New Token**, select your WhatsApp app, and check:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Copy the permanent access token.

### Step 3.3: Configure Environment Variables
Add the credentials to your `.env` or `.env.local` file:
```env
WHATSAPP_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="102938475610293"
WHATSAPP_VERIFY_TOKEN="meirei_secure_webhook_verify_token_2026"
```

### Step 3.4: Register Webhook in Meta Developer Dashboard
1. In the Meta Developer Console, navigate to **WhatsApp** > **Configuration**.
2. Under the **Webhook** section, click **Edit**:
   - **Callback URL**: `https://meirei.tella.cash/api/webhooks/whatsapp`
   - **Verify Token**: The exact phrase from `WHATSAPP_VERIFY_TOKEN` (`meirei_secure_webhook_verify_token_2026`).
3. Click **Verify and Save**. Meta will send an automated GET handshake request to your endpoint.
4. Under **Webhook fields**, click **Manage** and click **Subscribe** next to **`messages`**.

### Step 3.5: Testing WhatsApp Inbound Messages
1. In **WhatsApp** > **API Setup**, add your personal phone number to the **Recipient Phone Number** list (required in Development mode).
2. Send an initial message from the sandbox phone number to your device.
3. Reply from your WhatsApp app with:
   - `stocks`
   - `What is the price of TSLAx?`
   - `Buy 100 USDG of NVDAx`
   - `/freeze`
4. The Meirei bot will respond immediately with formatted live quotes and non-custodial signing links!

---

## 4. Interactive Terminal Simulator (Local Development)

Meirei includes an interactive command-line simulator allowing instant testing of conversational mandates, 2FA challenges, and simulated X Layer routing without third-party webhooks:

```bash
npm run bot:chat
```

Supported test commands in simulator:
- `stocks`: Returns all 8 allowlisted equities and current spot prices.
- `price of NVDAx`: Queries live OKX Market price for NVIDIA Corp tokenized equity.
- `Buy 250 USDG of AAPLx`: Generates DEX aggregation swap quote.
- `confirm`: Prompts for 6-digit OTP verification.
- `/freeze`: Triggers circuit breaker and generates recovery code.
- `/unfreeze <code>`: Unfreezes account using the 6-digit code.

---

## 5. Security and Guardrails

1. **Strict Asset Allowlist**: Only verified tokenized equities (`NVDAx`, `AAPLx`, `MSFTx`, `METAx`, `GOOGLx`, `AMZNx`, `TSLAx`) and settlement assets (`USDG`, `USDC`) on OKX X Layer (Chain ID 196) can be traded.
2. **Spending Caps**: Every user identity enforces spending limits to prevent runaway trades.
3. **Emergency Circuit Breaker**: Instant `/freeze` and `/unfreeze <code>` directives protect user accounts if their chat device is compromised.
4. **Gas 100% Sponsored**: All gas is sponsored via OKX Paymaster, requiring zero native OKB balance in the user's trading wallet.
