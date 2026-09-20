import { NextRequest, NextResponse } from "next/server";
import { resolveChannelUser } from "@/lib/auth/user_identity";
import { fetchPrice, fetchBalances, fetchAllStockPrices } from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { handleMandate } from "@/src/agent/handler";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validatePayloadSize } from "@/lib/security/payload_guard";

export const dynamic = "force-dynamic";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meirei_wa_verify_token";

/**
 * GET /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API verification challenge handshake.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Unauthorized verification token." }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Inbound WhatsApp message processor supporting Meta Cloud API and direct integrations.
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
        messageText = msg.text?.body || "";
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
      // Twilio WhatsApp webhook format
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

    // 1. Balance and Portfolio Query
    if (
      lower.includes("balance") ||
      lower.includes("portfolio") ||
      lower.includes("holdings") ||
      lower.includes("how much")
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

        return NextResponse.json({
          ok: true,
          channel: "whatsapp",
          sender: senderPhone,
          reply: replyText,
        });
      } catch (err) {
        return NextResponse.json({
          ok: true,
          channel: "whatsapp",
          sender: senderPhone,
          reply: `PROJECT MEIREI | X LAYER\nWallet ${shortAddr} is connected. Balance is indexing or empty on X Layer (chain 196).`,
        });
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
      replyText += `Send "How many units of ${symbolsFound[0]} for $250 USDG" to preview trade units.`;

      return NextResponse.json({
        ok: true,
        channel: "whatsapp",
        sender: senderPhone,
        reply: replyText,
      });
    }

    // 2b. Unit calculation inquiries (e.g. "How many units of NVDAx for 250 USDG?")
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
        replyText += `Estimated Units: ${units.toFixed(4)} ${targetSymbol}\n`;
        replyText += `Non-custodial execution available via Web Terminal or reply "Confirm buy ${units.toFixed(2)} ${targetSymbol}".`;

        return NextResponse.json({
          ok: true,
          channel: "whatsapp",
          sender: senderPhone,
          reply: replyText,
        });
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

      return NextResponse.json({
        ok: true,
        channel: "whatsapp",
        sender: senderPhone,
        reply: replyText,
      });
    }

    // 3. Fallback: Parse Mandate or Advisory Intent via Meirei Engine
    const mandateRes = await handleMandate({
      mandate: cleanMessage,
      walletAddress: user.wallet_address,
      confirm: false,
    });

    let replyText = `PROJECT MEIREI | ADVISORY ENGINE\n`;
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
    replyText += `Open Web Terminal to sign with OKX Wallet: https://meirei.app/app`;

    return NextResponse.json({
      ok: true,
      channel: "whatsapp",
      sender: senderPhone,
      reply: replyText,
    });
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
