# Project Meirei — Production Cloud Deployment & Webhook Configuration Guide

Network: OKX X Layer Mainnet (Chain ID 196)  
Repository: https://github.com/ibochivincent-lang/meirei  

---

## 1. Vercel Cloud Deployment

### Step A: Import GitHub Repository
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Under **"Import Git Repository"**, select `ibochivincent-lang/meirei`.
4. Configure Project Settings:
   - **Framework Preset**: `Next.js` (automatically detected).
   - **Root Directory**: `./` (leave default).
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (automatically detected).
   - **Install Command**: `npm install`

### Step B: Production Environment Variables
In the Vercel project configuration, expand **"Environment Variables"** and add the following keys:

| Variable Name | Production Value | Note |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://meirei.tella.cash` | Production domain (`https://meirei.tella.cash` / web app at `/app`) |
| `NEXT_PUBLIC_CHAIN_ID` | `196` | OKX X Layer Mainnet |
| `NEXT_PUBLIC_XLAYER_RPC` | `https://rpc.xlayer.tech` | Official X Layer Mainnet RPC |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://www.oklink.com/xlayer` | Official X Layer Block Explorer |
| `OTP_SIGNING_SECRET` | *(64 hex characters / random secret)* | Signs and verifies 2FA OTP HMAC tokens |
| `MEIREI_CHAIN` | `xlayer` | Enforces X Layer Mainnet routing |
| `MEIREI_MOCK_ONCHAINOS` | `0` | Live Onchain OS mode |
| `MEIREI_WALLET` | `0x7f17d6224e7d48606598732c3f511412b5c1e922` | Designated agent execution wallet |
| `OKX_API_KEY` | *(OKX Developer API Key)* | Required for Onchain OS DEX and market endpoints |
| `OKX_SECRET_KEY` | *(OKX Developer Secret)* | API secret for signing Web3 requests |
| `OKX_PASSPHRASE` | *(OKX API Passphrase)* | Passphrase configured during API key creation |
| `META_WHATSAPP_ACCESS_TOKEN` | *(Meta Cloud API System User Token)* | Inbound & outbound WhatsApp messages |
| `META_WHATSAPP_PHONE_NUMBER_ID` | *(Meta Phone Number ID)* | Sender ID for WhatsApp notifications |
| `META_WHATSAPP_VERIFY_TOKEN` | *(your custom verification secret)* | Webhook verification handshake |
| `TELEGRAM_BOT_TOKEN` | *(Token from @BotFather)* | Inbound & outbound Telegram updates |

### Step C: Deploy & Verify Health Check
Click **"Deploy"**. Once deployment completes:
1. Verify the health check by navigating to:
   `https://<your-deployment-url>/api/health`
2. Confirm the JSON response indicates `status: healthy` and `chain.id: 196`.

---

## 2. Onchain OS Agent Wallet & API Authentication (Bot Execution Rail)

Meirei's automated bot channels (WhatsApp, Telegram) and autonomous rebalancing cron tasks interact with the OKX X Layer DEX aggregator via Onchain OS.

### Signing Authority Architecture:
* **Client-Signed Path (Web App)**: 100% non-custodial. The user connects OKX Wallet or MetaMask in the browser, reviews the route and parameters, and signs transactions directly with their private key on their own device.
* **Delegated Agent Path (Bot / Cron)**: The server orchestrates trades on behalf of the user using an Onchain OS agent wallet or authenticated OKX Web3 API session:
  - The agent wallet is funded with operational gas and settlement liquidity.
  - Every trade on this rail is gated by HMAC-SHA256 Two-Factor Authentication (OTP), strict daily notional spend limits, and automatic circuit breakers.
  - Alternatively, bot responses supply a one-tap deep link (`https://meirei.tella.cash/app?action=sign&...`) allowing users to sign on their own mobile wallet.

### Setting Up Onchain OS for Production:

1. **Option A: Onchain OS TEE Wallet Login**
   On the host or build server running Onchain OS:
   ```bash
   onchainos wallet login <your_email@example.com>
   ```
   Follow the interactive prompt to authenticate your session. The private key remains encrypted in the TEE environment.

2. **Option B: OKX Web3 API Credentials**
   In headless or containerized environments (such as Vercel or Docker), provide API keys in your environment:
   ```bash
   OKX_API_KEY="your_api_key"
   OKX_SECRET_KEY="your_secret_key"
   OKX_PASSPHRASE="your_passphrase"
   MEIREI_WALLET="0x7f17d6224e7d48606598732c3f511412b5c1e922"
   ```
   These credentials authorize Onchain OS to generate unsigned swap calldata and quote prices via the OKX DEX aggregator.

---

## 3. Meta WhatsApp Cloud API Webhook Configuration

1. Log in to the [Meta for Developers Console](https://developers.facebook.com).
2. Open your WhatsApp App and navigate to **WhatsApp** -> **Configuration** in the left sidebar.
3. In the **Webhooks** panel, click **Edit**:
   - **Callback URL**: `https://<your-deployment-url>/api/webhooks/whatsapp`
   - **Verify Token**: Enter the exact string configured in your `META_WHATSAPP_VERIFY_TOKEN` environment variable.
4. Click **Verify and Save**. Meta will issue a `GET` handshake request to `/api/webhooks/whatsapp`. The endpoint will return HTTP 200 with the verification challenge.
5. Under **Webhook fields**, click **Manage** and subscribe to:
   - `messages` (delivers all inbound user texts, quotes, and mandate requests).

---

## 4. Telegram Bot API Webhook Configuration

To connect your Telegram bot to the live Meirei webhook endpoint:

1. Open a terminal and run the following curl command (replacing `<BOT_TOKEN>` and `<DOMAIN>`):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
   -H "Content-Type: application/json" \
   -d '{
     "url": "https://<your-deployment-url>/api/webhooks/telegram",
     "allowed_updates": ["message"]
   }'
```

2. Expected Response:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

3. Verify webhook status:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---

## 5. Custom Domain Configuration (Production)

To bind the live domain (`meirei.tella.cash`):
1. In your Vercel Project Settings, navigate to **Domains**.
2. Add `meirei.tella.cash`.
3. In your DNS provider (Cloudflare, Route53, etc.), configure:
   - `CNAME` record for `meirei` pointing to `cname.vercel-dns.com`
4. Set `NEXT_PUBLIC_APP_URL` and `APP_BASE_URL` in Vercel to `https://meirei.tella.cash`.

---

## 6. Live Production Smoke Testing

Once deployed:
1. **WhatsApp Test**: Send `"price of NVDAx"` or `"60% mag7, 20% USDG, max 8%"` to your WhatsApp Business number. Confirm you receive a structured response without emojis.
2. **Telegram Test**: Send `/start` or `"NVDAx vs AAPLx"` to your Telegram bot. Confirm immediate quote delivery.
3. **Web Terminal Test**: Visit `https://<your-deployment-url>/app`, connect OKX Wallet, and test a price comparison or simulated mandate.
