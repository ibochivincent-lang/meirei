import { NextRequest, NextResponse } from "next/server";
import { resolveChannelUser } from "@/lib/auth/user_identity";
import { fetchPrice, fetchBalances } from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { handleMandate } from "@/src/agent/handler";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validatePayloadSize } from "@/lib/security/payload_guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/telegram
 * Inbound Telegram Bot webhook update processor.
 */
export async function POST(req: NextRequest) {
  try {
    const payloadCheck = validatePayloadSize(req);
    if (!payloadCheck.valid) {
      return NextResponse.json({ error: payloadCheck.error }, { status: 413 });
    }

    const clientIp = getClientIp(req);
    const body = await req.json();

    const msg = body.message || body.edited_message || body.channel_post;
    if (!msg || !msg.text) {
      return NextResponse.json({ ok: true, status: "ignored_non_text" });
    }

    const chatId = msg.chat?.id;
    const fromUser = msg.from;
    const telegramHandle = fromUser?.username ? `@${fromUser.username}` : `tg_${fromUser?.id || chatId}`;
    const rawText = (msg.text || "").trim();

    // Rate limiting per Telegram chat ID
    const rateCheck = checkRateLimit(`tg:${chatId || clientIp}`, "read");
    if (!rateCheck.allowed) {
      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: `*Meirei Notice*: Rate limit reached. Please wait ${rateCheck.resetSeconds}s.`,
        parse_mode: "Markdown",
      });
    }

    // Resolve non-custodial user profile anchored to Telegram identity
    const user = await resolveChannelUser({
      channel: "telegram",
      handle: telegramHandle,
    });

    const lower = rawText.toLowerCase();
    const shortAddr = `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;

    // Command: /start or /help
    if (lower === "/start" || lower === "/help") {
      let welcome = `*PROJECT MEIREI | OKX X LAYER BOT*\n\n`;
      welcome += `*Author*: IboTV\n`;
      welcome += `*Connected Wallet*: \`${shortAddr}\`\n`;
      welcome += `*Primary Account*: ${user.email}\n\n`;
      welcome += `*Available Capabilities*:\n`;
      welcome += `- *Check Prices*: "Price of NVDAx", "Quote TSLAx"\n`;
      welcome += `- *Compare Stocks*: "Compare NVDAx vs MSFTx"\n`;
      welcome += `- *Unit Calculator*: "How many units of NVDAx for $250 USDG?"\n`;
      welcome += `- *Portfolio Balance*: "Portfolio", "/balance"\n`;
      welcome += `- *Run Mandates*: "Mandate: 40% NVDAx, 30% AAPLx, 30% USDG"\n\n`;
      welcome += `_Non-custodial architecture: Zero private keys stored on servers._`;

      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: welcome,
        parse_mode: "Markdown",
      });
    }

    // 1. Balance and Portfolio Query
    if (
      lower === "/balance" ||
      lower.includes("balance") ||
      lower.includes("portfolio") ||
      lower.includes("holdings")
    ) {
      try {
        const holdings = await fetchBalances(user.wallet_address);
        const total = holdings.reduce((sum, h) => sum + (h.valueUsd || 0), 0);

        let reply = `*PROJECT MEIREI | PORTFOLIO*\n`;
        reply += `*Wallet*: \`${shortAddr}\` (X Layer Chain 196)\n`;
        reply += `*Total Value*: *$${total.toFixed(2)} USDG*\n\n`;

        if (holdings.length === 0) {
          reply += `_No active tokenized stock positions found._\n`;
          reply += `Deposit USDG on X Layer to initiate automated mandates.`;
        } else {
          reply += `*Active Holdings*:\n`;
          holdings.forEach((h) => {
            reply += `• *${h.symbol}*: ${h.amount.toFixed(3)} ($${h.valueUsd.toFixed(2)})\n`;
          });
        }

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: reply,
          parse_mode: "Markdown",
        });
      } catch (err) {
        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: `*Portfolio*: Connected to \`${shortAddr}\`. Balance indexing on X Layer.`,
          parse_mode: "Markdown",
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
      (lower.includes("compare") || lower.includes("vs") || lower.includes("versus"))
    ) {
      const prices = await Promise.all(symbolsFound.map((s) => fetchPrice(s)));
      let reply = `*MEIREI X LAYER STOCK COMPARISON*\n\n`;
      symbolsFound.forEach((sym, idx) => {
        const item = ALLOWLIST.find((a) => a.symbol === sym);
        reply += `• *${sym}* (${item?.name || sym}): *$${prices[idx].toFixed(2)} USDG*\n`;
      });
      const ratio = prices[0] / (prices[1] || 1);
      reply += `\n*Relative Ratio*: 1 ${symbolsFound[0]} = *${ratio.toFixed(3)}* ${symbolsFound[1]}.\n`;
      reply += `_Ask "Calculate $250 in ${symbolsFound[0]}" for unit preview._`;

      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: reply,
        parse_mode: "Markdown",
      });
    }

    // 2b. Unit calculation inquiries
    const moneyMatch = rawText.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:usdg|usd|dollars)?/i);
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

        let reply = `*MEIREI UNIT CALCULATOR | X LAYER*\n\n`;
        reply += `*Asset*: ${targetSymbol} (${item?.name || targetSymbol})\n`;
        reply += `*Spot Price*: $${spotPrice.toFixed(2)} USDG\n`;
        reply += `*Budget*: $${usdAmount.toFixed(2)} USDG\n\n`;
        reply += `*Estimated Allocation*: *${units.toFixed(4)} ${targetSymbol}*\n\n`;
        reply += `_Sign non-custodially via Web Terminal: meirei.app/app_`;

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: reply,
          parse_mode: "Markdown",
        });
      }
    }

    // 2c. Single stock price quote
    if (symbolsFound.length === 1 && (lower.includes("price") || lower.includes("quote") || lower.startsWith("/price"))) {
      const targetSymbol = symbolsFound[0];
      const spotPrice = await fetchPrice(targetSymbol);
      const item = ALLOWLIST.find((a) => a.symbol === targetSymbol);

      let reply = `*MEIREI SPOT QUOTE | X LAYER*\n\n`;
      reply += `*Asset*: *${targetSymbol}* (${item?.name || targetSymbol})\n`;
      reply += `*Price*: *$${spotPrice.toFixed(2)} USDG*\n`;
      reply += `*Network*: OKX X Layer (Chain ID 196)\n`;
      reply += `*Contract*: \`${item?.address || "X Layer DEX"}\`\n\n`;
      reply += `_Reply with "Calculate $500 in ${targetSymbol}" to check units._`;

      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: reply,
        parse_mode: "Markdown",
      });
    }

    // 3. Mandate or Advisory Intent via Meirei Engine
    const mandateRes = await handleMandate({
      mandate: rawText,
      walletAddress: user.wallet_address,
      confirm: false,
    });

    let reply = `*PROJECT MEIREI | ADVISORY STUDIO*\n\n`;
    if (mandateRes.success && mandateRes.delivery) {
      const legs = mandateRes.delivery.plan.legs || [];
      if (legs.length === 0) {
        reply += `_Mandate analyzed. Portfolio is already aligned with target allocations on X Layer._\n\n`;
      } else {
        const legsSummary = legs
          .map((l) => `• *${l.side.toUpperCase()}* $${l.notionalUsd.toFixed(2)} of *${l.symbol}*`)
          .join("\n");
        reply += `*Proposed Rebalancing Plan*:\n${legsSummary}\n\n`;
      }
    } else {
      reply += `${mandateRes.error || "Mandate processed on X Layer."}\n\n`;
    }

    reply += `*Sole Author*: IboTV\n`;
    reply += `_Open Terminal to sign with OKX Wallet: meirei.app/app_`;

    return NextResponse.json({
      method: "sendMessage",
      chat_id: chatId,
      text: reply,
      parse_mode: "Markdown",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Telegram Webhook] Processing error:", msg);
    return NextResponse.json(
      {
        error: "Internal error processing Telegram webhook.",
        detail: msg,
      },
      { status: 500 }
    );
  }
}
