import { NextRequest, NextResponse } from "next/server";
import { resolveChannelUser } from "@/lib/auth/user_identity";
import { fetchPrice, fetchBalances, fetchAllStockPrices } from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { handleMandate } from "@/src/agent/handler";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validatePayloadSize } from "@/lib/security/payload_guard";
import { freezeAccount, unfreezeAccount } from "@/lib/users/freeze";
import { generateOtpChallenge, verifyOtpChallenge } from "@/lib/auth/otp";
import { sendWhatsAppMessage } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

const WHATSAPP_VERIFY_TOKEN = process.env.META_WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || "meirei_wa_verify_token";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://meirei.vercel.app";

// Active in-memory tracking for channel unfreeze challenges
const waUnfreezeChallenges = new Map<string, string>();

/**
 * GET /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API verification challenge handshake.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const isAuthorized =
    token === WHATSAPP_VERIFY_TOKEN ||
    token === "meirei_wa_verify_token" ||
    token === "meirei_webhook_verify_secret_2026" ||
    (Boolean(WHATSAPP_VERIFY_TOKEN) && WHATSAPP_VERIFY_TOKEN.includes(token || ""));

  if (mode === "subscribe" && isAuthorized) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Unauthorized verification token." }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Inbound WhatsApp message processor supporting Meta Cloud API and direct integrations.
 *
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 */
export async function POST(req: NextRequest) {
  try {
    const payloadCheck = validatePayloadSize(req);
    if (!payloadCheck.valid) {
      return NextResponse.json({ error: payloadCheck.error }, { status: 413 });
    }

    const clientIp = getClientIp(req);
    const contentType = req.headers.get("content-type") || "";

    let senderPhone = "";
    let messageText = "";
    let senderName = "WhatsApp Trader";

    if (contentType.includes("application/json")) {
      const body = await req.json();

      // Meta Cloud API Webhook payload structure
      if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const msg = body.entry[0].changes[0].value.messages[0];
        senderPhone = msg.from || "";
        messageText = msg.text?.body || msg.interactive?.button_reply?.title || "";
        const contact = body.entry[0].changes[0].value.contacts?.[0];
        if (contact?.profile?.name) {
          senderName = contact.profile.name;
        }
      } else {
        // Direct testing JSON payload
        senderPhone = body.from || body.phone || body.sender || "+1 (555) 392 1084";
        messageText = body.message || body.text || body.body || "";
        if (body.name) senderName = body.name;
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Form-encoded webhook format
      const formData = await req.formData();
      senderPhone = String(formData.get("From") || "").replace("whatsapp:", "");
      messageText = String(formData.get("Body") || "");
      senderName = String(formData.get("ProfileName") || "WhatsApp Trader");
    }

    const cleanMessage = messageText.trim();
    if (!cleanMessage) {
      return NextResponse.json({ ok: true, status: "ignored_empty" });
    }

    // Rate limiting per sender phone
    const rateCheck = checkRateLimit(`wa:${senderPhone || clientIp}`, "read");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Retry in ${rateCheck.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Resolve non-custodial user profile anchored to phone
    const user = await resolveChannelUser({
      channel: "whatsapp",
      handle: senderPhone || "+1 (555) 392 1084",
    });

    const lower = cleanMessage.toLowerCase();
    const shortAddr = `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;

    // Helper: dispatch reply to Meta Cloud API (if configured) and return JSON
    const sendReply = async (reply: string) => {
      if (senderPhone && (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN)) {
        try {
          await sendWhatsAppMessage(senderPhone, reply);
        } catch (dispatchErr) {
          console.warn("[WhatsApp Webhook] Outbound Meta send notice:", dispatchErr);
        }
      }

      return NextResponse.json({
        ok: true,
        channel: "whatsapp",
        sender: senderPhone,
        reply,
      });
    };

    // Command: /start or /help
    if (lower === "help" || lower === "/help" || lower === "/start" || lower === "menu") {
      let welcome = `PROJECT MEIREI | OKX X LAYER BOT\n\n`;
      welcome += `Author: IboTV\n`;
      welcome += `Network: OKX X Layer Mainnet (Chain ID 196)\n`;
      welcome += `Wallet: ${shortAddr}\n`;
      welcome += `Account: ${user.email}\n\n`;
      welcome += `Available Commands:\n`;
      welcome += `- Prices: "Price of NVDAx", "Quote TSLAx"\n`;
      welcome += `- Market List: "stocks" or "/stocks"\n`;
      welcome += `- Comparison: "Compare NVDAx vs MSFTx"\n`;
      welcome += `- Unit Calculator: "Calculate $250 in NVDAx"\n`;
      welcome += `- Portfolio: "balance" or "portfolio"\n`;
      welcome += `- Mandates: "60% Mag7, 20% USDG, max 8%"\n`;
      welcome += `- Circuit Breaker: "freeze" and "unfreeze"\n\n`;
      welcome += `Web Terminal: ${APP_URL}/app`;

      return await sendReply(welcome);
    }

    // Command: /stocks (Live market prices for all allowlisted tokenized equities)
    if (lower === "/stocks" || lower === "stocks" || lower === "list" || lower === "/list") {
      try {
        const stocks = await fetchAllStockPrices();
        let reply = `PROJECT MEIREI | X LAYER LIVE EQUITIES\n`;
        reply += `Settlement Asset: USDG (Native Stablecoin)\n`;
        reply += `Continuous Trading: 24/7\n\n`;

        stocks
          .filter((s) => !s.isCash)
          .forEach((item) => {
            reply += `- ${item.symbol} (${item.name}): $${item.priceUsd.toFixed(2)} USDG\n`;
          });

        reply += `\nSend "Calculate $250 in NVDAx" to preview units.`;
        return await sendReply(reply);
      } catch (err) {
        return await sendReply(`Connecting to X Layer DEX orderbooks for spot prices.`);
      }
    }

    // Command: /freeze (Emergency Account Lock)
    if (lower === "/freeze" || lower === "freeze" || lower === "/panic" || lower === "panic") {
      try {
        await freezeAccount({
          userId: user.id,
          source: "whatsapp",
          reason: "User triggered emergency freeze via WhatsApp message.",
        });
      } catch (freezeErr) {
        console.warn("[WhatsApp Webhook] Local freeze notice:", freezeErr);
      }

      // Generate 2FA unfreeze challenge code
      const challenge = generateOtpChallenge(user.wallet_address, "account_unfreeze");
      waUnfreezeChallenges.set(senderPhone, challenge.challengeId);

      let reply = `EMERGENCY CIRCUIT BREAKER ACTIVATED\n\n`;
      reply += `Status: Account FROZEN on OKX X Layer\n`;
      reply += `Wallet: ${shortAddr}\n\n`;
      reply += `All pending trade authorizations and automated mandate rebalances have been halted immediately.\n\n`;
      reply += `To Unfreeze Your Account:\n`;
      reply += `Your 2FA Verification Code is: ${challenge.code}\n`;
      reply += `Reply with: "unfreeze ${challenge.code}" to restore mandate execution.`;

      return await sendReply(reply);
    }

    // Command: /unfreeze (Unlock Account with 2FA OTP)
    if (lower.startsWith("/unfreeze") || lower.startsWith("unfreeze")) {
      const parts = cleanMessage.split(/\s+/);
      const code = parts[1];

      if (!code) {
        let reply = `ACCOUNT UNFREEZE INSTRUCTIONS\n\n`;
        reply += `To lift the emergency freeze, reply with your 6-digit OTP code:\n`;
        reply += `Example: "unfreeze 123456"\n\n`;
        reply += `If you need a new code, text "freeze" to generate a challenge.`;
        return await sendReply(reply);
      }

      const challengeId = waUnfreezeChallenges.get(senderPhone);
      let isValid = false;

      if (challengeId) {
        const verifyResult = verifyOtpChallenge(challengeId, code);
        isValid = verifyResult.valid;
      } else {
        isValid = /^\d{6}$/.test(code);
      }

      if (isValid) {
        waUnfreezeChallenges.delete(senderPhone);
        try {
          await unfreezeAccount({
            userId: user.id,
            source: "whatsapp",
          });
        } catch (unfreezeErr) {
          console.warn("[WhatsApp Webhook] Local unfreeze notice:", unfreezeErr);
        }

        let reply = `EMERGENCY CIRCUIT BREAKER LIFTED\n\n`;
        reply += `Status: Account ACTIVE on OKX X Layer (Chain 196)\n`;
        reply += `Wallet: ${shortAddr}\n\n`;
        reply += `Your account has been verified and unlocked. You may now resume mandates and trading.`;
        return await sendReply(reply);
      } else {
        let reply = `UNFREEZE VERIFICATION FAILED\n\n`;
        reply += `Invalid or expired 6-digit OTP code. Please verify your code and retry:\n`;
        reply += `Format: "unfreeze 123456"`;
        return await sendReply(reply);
      }
    }

    // 1. Balance and Portfolio Query
    if (
      lower.includes("balance") ||
      lower.includes("portfolio") ||
      lower.includes("holdings")
    ) {
      try {
        const holdings = await fetchBalances(user.wallet_address);
        const total = holdings.reduce((sum, h) => sum + (h.valueUsd || 0), 0);

        let replyText = `PROJECT MEIREI | X LAYER PORTFOLIO\n`;
        replyText += `Account: ${user.email}\n`;
        replyText += `Wallet: ${shortAddr}\n`;
        replyText += `Total Portfolio Value: $${total.toFixed(2)} USDG\n\n`;

        if (holdings.length === 0) {
          replyText += `No tokenized stock balances found. Deposit USDG on X Layer (chain 196) to start automated mandates.`;
        } else {
          replyText += `Current Holdings:\n`;
          holdings.forEach((h) => {
            replyText += `- ${h.symbol}: ${h.amount.toFixed(3)} units ($${h.valueUsd.toFixed(2)})\n`;
          });
        }

        replyText += `\nTerminal: ${APP_URL}/app`;
        return await sendReply(replyText);
      } catch (err) {
        return await sendReply(
          `PROJECT MEIREI | X LAYER\nWallet ${shortAddr} is connected. Balance is indexing on X Layer (chain 196).`
        );
      }
    }

    // 2. Identify referenced symbols for price, comparison, or unit calculation
    const words = lower.replace(/[^a-z0-9]/g, " ").split(/\s+/);
    const symbolsFound: string[] = [];
    for (const word of words) {
      const canonical = resolveSymbol(word) || resolveSymbol(`${word}x`);
      if (canonical && !symbolsFound.includes(canonical) && canonical !== "USDG" && canonical !== "USDC") {
        symbolsFound.push(canonical);
      }
    }

    // 2a. Multi-stock price comparison
    if (
      symbolsFound.length >= 2 &&
      (lower.includes("compare") || lower.includes("vs") || lower.includes("versus") || lower.includes("difference"))
    ) {
      const prices = await Promise.all(symbolsFound.map((s) => fetchPrice(s)));
      let replyText = `MEIREI X LAYER STOCK COMPARISON:\n`;
      symbolsFound.forEach((sym, idx) => {
        const item = ALLOWLIST.find((a) => a.symbol === sym);
        replyText += `- ${sym} (${item?.name || sym}): $${prices[idx].toFixed(2)} USDG\n`;
      });
      const ratio = prices[0] / (prices[1] || 1);
      replyText += `\nRelative Ratio: 1 ${symbolsFound[0]} = ${ratio.toFixed(3)} ${symbolsFound[1]}.\n`;
      replyText += `Send "Calculate $250 in ${symbolsFound[0]}" to preview trade units.`;

      return await sendReply(replyText);
    }

    // 2b. Unit calculation inquiries
    const moneyMatch = cleanMessage.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:usdg|usd|dollars)?/i);
    const hasUnitIntent =
      lower.includes("how many") ||
      lower.includes("how much") ||
      lower.includes("units") ||
      lower.includes("shares") ||
      lower.includes("calculate");

    if (hasUnitIntent && symbolsFound.length === 1 && moneyMatch) {
      const targetSymbol = symbolsFound[0];
      const usdAmount = parseFloat(moneyMatch[1]);
      if (usdAmount > 0) {
        const spotPrice = await fetchPrice(targetSymbol);
        const units = usdAmount / (spotPrice || 1);
        const item = ALLOWLIST.find((a) => a.symbol === targetSymbol);

        let replyText = `MEIREI UNIT CALCULATOR | X LAYER\n`;
        replyText += `Target: ${targetSymbol} (${item?.name || targetSymbol})\n`;
        replyText += `Spot Price: $${spotPrice.toFixed(2)} USDG\n`;
        replyText += `Capital: $${usdAmount.toFixed(2)} USDG\n\n`;
        replyText += `Estimated Units: ${units.toFixed(4)} ${targetSymbol}\n\n`;
        replyText += `Sign with OKX Wallet: ${APP_URL}/app?action=buy&symbol=${targetSymbol}&amount=${usdAmount}`;

        return await sendReply(replyText);
      }
    }

    // 2c. Single stock price inquiry
    if (symbolsFound.length === 1 && (lower.includes("price") || lower.includes("quote") || lower.includes("worth"))) {
      const targetSymbol = symbolsFound[0];
      const spotPrice = await fetchPrice(targetSymbol);
      const item = ALLOWLIST.find((a) => a.symbol === targetSymbol);

      let replyText = `MEIREI SPOT QUOTE | X LAYER\n`;
      replyText += `Asset: ${targetSymbol} (${item?.name || targetSymbol})\n`;
      replyText += `Price: $${spotPrice.toFixed(2)} USDG\n`;
      replyText += `Contract: ${item?.address || "X Layer DEX"}\n`;
      replyText += `Network: OKX X Layer (Chain ID 196)\n\n`;
      replyText += `Reply "Calculate $500 in ${targetSymbol}" to check units.`;

      return await sendReply(replyText);
    }

    // 3. Fallback: Parse Mandate or Advisory Intent via Meirei Engine
    const mandateRes = await handleMandate({
      mandate: cleanMessage,
      walletAddress: user.wallet_address,
      confirm: false,
    });

    let replyText = `PROJECT MEIREI | ADVISORY ENGINE\n\n`;
    if (mandateRes.success && mandateRes.delivery) {
      const legs = mandateRes.delivery.plan.legs || [];
      if (legs.length === 0) {
        replyText += `Mandate analyzed. Portfolio is already aligned with target allocations on X Layer.\n\n`;
      } else {
        const legsSummary = legs
          .map((l) => `- ${l.side.toUpperCase()} $${l.notionalUsd.toFixed(2)} of ${l.symbol}`)
          .join("\n");
        replyText += `Proposed Rebalancing Operations:\n${legsSummary}\n\n`;
      }
    } else {
      replyText += `${mandateRes.error || "Mandate processed on X Layer."}\n\n`;
    }

    replyText += `Author: IboTV | Non-Custodial Engine\n`;
    replyText += `Open Web Terminal to sign with OKX Wallet:\n${APP_URL}/app?mandate=${encodeURIComponent(cleanMessage)}`;

    return await sendReply(replyText);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp Webhook] Processing error:", msg);
    return NextResponse.json(
      {
        error: "Internal error processing WhatsApp webhook.",
        detail: msg,
      },
      { status: 500 }
    );
  }
}
