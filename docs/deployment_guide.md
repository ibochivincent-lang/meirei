# Project Meirei — Production Cloud Deployment & Webhook Configuration Guide

Author: IboTV  
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
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Replace with your live Vercel URL or custom domain |
| `NEXT_PUBLIC_CHAIN_ID` | `196` | OKX X Layer Mainnet |
| `NEXT_PUBLIC_XLAYER_RPC` | `https://rpc.xlayer.tech` | Official X Layer Mainnet RPC |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://www.oklink.com/xlayer` | Official X Layer Block Explorer |
| `OTP_SIGNING_SECRET` | *(64 hex characters / random secret)* | Signs and verifies 2FA OTP HMAC tokens |
| `MEIREI_CHAIN` | `xlayer` | Enforces X Layer Mainnet routing |
| `MEIREI_MOCK_ONCHAINOS` | `0` | Live Onchain OS mode |
| `MEIREI_WALLET` | `0x7f17d6224e7d48606598732c3f511412b5c1e922` | Default execution wallet |
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

## 2. Meta WhatsApp Cloud API Webhook Configuration

1. Log in to the [Meta for Developers Console](https://developers.facebook.com).
2. Open your WhatsApp App and navigate to **WhatsApp** -> **Configuration** in the left sidebar.
3. In the **Webhooks** panel, click **Edit**:
   - **Callback URL**: `https://<your-deployment-url>/api/webhooks/whatsapp`
   - **Verify Token**: Enter the exact string configured in your `META_WHATSAPP_VERIFY_TOKEN` environment variable.
4. Click **Verify and Save**. Meta will issue a `GET` handshake request to `/api/webhooks/whatsapp`. The endpoint will return HTTP 200 with the verification challenge.
5. Under **Webhook fields**, click **Manage** and subscribe to:
   - `messages` (delivers all inbound user texts, quotes, and mandate requests).

---

## 3. Telegram Bot API Webhook Configuration

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

## 4. Custom Domain Configuration (Optional)

To bind a custom domain (e.g. `meirei.app`):
1. In your Vercel Project Settings, navigate to **Domains**.
2. Add `meirei.app` and `www.meirei.app`.
3. In your DNS provider (Cloudflare, Namecheap, Route53), configure:
   - `A` record for `@` pointing to `76.76.21.21`
   - `CNAME` record for `www` pointing to `cname.vercel-dns.com`
4. Update `NEXT_PUBLIC_APP_URL` and `APP_BASE_URL` in Vercel to `https://meirei.app`.

---

## 5. Live Production Smoke Testing

Once deployed:
1. **WhatsApp Test**: Send `"price of NVDAx"` or `"60% mag7, 20% USDG, max 8%"` to your WhatsApp Business number. Confirm you receive a structured response without emojis.
2. **Telegram Test**: Send `/start` or `"NVDAx vs AAPLx"` to your Telegram bot. Confirm immediate quote delivery.
3. **Web Terminal Test**: Visit `https://<your-deployment-url>/app`, connect OKX Wallet, and test a price comparison or simulated mandate.
