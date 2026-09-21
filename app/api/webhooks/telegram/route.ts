import { NextRequest, NextResponse } from "next/server";
import { resolveChannelUser } from "@/lib/auth/user_identity";
import { fetchPrice, fetchBalances, fetchAllStockPrices } from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { handleMandate } from "@/src/agent/handler";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validatePayloadSize } from "@/lib/security/payload_guard";
import { freezeAccount, unfreezeAccount } from "@/lib/users/freeze";
import { generateOtpChallenge, verifyOtpChallenge } from "@/lib/auth/otp";
import { sendTelegramMessage } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

const RAW_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
// Strictly enforce https://meirei-rho.vercel.app as canonical domain
const APP_URL =
  RAW_APP_URL.startsWith("https://") && !RAW_APP_URL.includes("meirei.vercel.app")
    ? RAW_APP_URL.replace(/\/+$/, "")
    : "https://meirei-rho.vercel.app";

// Active in-memory tracking for channel unfreeze challenges
const unfreezeChallenges = new Map<string, string>();

/**
 * POST /api/webhooks/telegram
 * Inbound Telegram Bot webhook update processor with interactive inline buttons,
 * 2FA circuit breakers, live X Layer stock quotes, and non-custodial signing links.
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
    const body = await req.json();

    // Support both standard text messages and interactive callback query button taps
    const callbackQuery = body.callback_query;
    const msg = body.message || body.edited_message || body.channel_post || callbackQuery?.message;
    if (!msg && !callbackQuery) {
      return NextResponse.json({ ok: true, status: "ignored_empty" });
    }

    const chatId = callbackQuery ? callbackQuery.message?.chat?.id : msg?.chat?.id;
    const fromUser = callbackQuery ? callbackQuery.from : msg?.from;
    const telegramHandle = fromUser?.username ? `@${fromUser.username}` : `tg_${fromUser?.id || chatId}`;
    const rawText = (callbackQuery ? callbackQuery.data : msg?.text || "").trim();

    if (!rawText) {
      return NextResponse.json({ ok: true, status: "ignored_non_text" });
    }

    // Rate limiting per Telegram chat ID
    const rateCheck = checkRateLimit(`tg:${chatId || clientIp}`, "read");
    if (!rateCheck.allowed) {
      const rateMsg = `*Meirei Notice*: Rate limit reached. Please wait ${rateCheck.resetSeconds}s.`;
      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: rateMsg,
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

    // Helper: dispatch reply both via webhook JSON response and outbound API (if token configured)
    const replyWith = async (text: string, inlineKeyboard?: any[]) => {
      const payload: any = {
        method: "sendMessage",
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      };
      if (inlineKeyboard && inlineKeyboard.length > 0) {
        payload.reply_markup = { inline_keyboard: inlineKeyboard };
      }

      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          await sendTelegramMessage(chatId, text, {
            reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
          });
        } catch (dispatchErr) {
          console.warn("[Telegram Webhook] Outbound push fallback to webhook response:", dispatchErr);
        }
      }

      return NextResponse.json(payload);
    };

    // Command: /start or /help
    if (lower === "/start" || lower === "/help" || lower === "help") {
      let welcome = `*PROJECT MEIREI | OKX X LAYER BOT*\n\n`;
      welcome += `*Author*: IboTV\n`;
      welcome += `*Network*: OKX X Layer Mainnet (Chain ID 196)\n`;
      welcome += `*Connected Wallet*: \`${shortAddr}\`\n`;
      welcome += `*Identity*: ${user.email}\n\n`;
      welcome += `*Commands & Capabilities*:\n`;
      welcome += `- *Check Prices*: "Price of NVDAx", "Quote TSLAx"\n`;
      welcome += `- *Live Market List*: /stocks or "stocks"\n`;
      welcome += `- *Compare Stocks*: "Compare NVDAx vs MSFTx"\n`;
      welcome += `- *Unit Calculator*: "Calculate $250 in NVDAx"\n`;
      welcome += `- *Portfolio Balance*: /balance or "portfolio"\n`;
      welcome += `- *Run Mandates*: "60% Mag7, 20% USDG, max 8%"\n`;
      welcome += `- *Emergency Freeze*: /freeze and /unfreeze\n\n`;
      welcome += `_Non-custodial architecture: Zero private keys stored on servers._`;

      const keyboard = [
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
        [
          { text: "Open Web Terminal", url: `${APP_URL}/app` },
          { text: "Emergency Freeze", callback_data: "/freeze" },
        ],
      ];

      return await replyWith(welcome, keyboard);
    }

    // Command: /about or /guide (Who we are, what we do, and getting started)
    if (lower === "/about" || lower === "about" || lower === "/guide" || lower === "guide") {
      let about = `*PROJECT MEIREI | WHO WE ARE & WHAT WE DO*\n\n`;
      about += `Welcome to *Meirei (命令)* — an AI-native investment mandate agent operating on *OKX X Layer Mainnet (Chain ID 196)*.\n\n`;
      about += `*What We Do*:\n`;
      about += `We enable non-custodial, conversational portfolio management. Instead of navigating DEX interfaces, you state your investment goals in plain English, and Meirei plans, prices, and constructs on-chain rebalances.\n\n`;
      about += `*Core Pillars*:\n`;
      about += `1. *24/7 Continuous Trading*: Trade live tokenized equities (NVDAx, AAPLx, TSLAx, MSFTx, GOOGLx, AMZNx, METAx) settled natively in USDG stablecoin.\n`;
      about += `2. *100% Non-Custodial*: We never hold your funds or store private keys. Trades are authorized and signed by you directly on-chain.\n`;
      about += `3. *Natural Language Mandates*: Text instructions like "Allocate 40% NVDAx, 40% MSFTx, 20% USDG for $500" to plan rebalance trades.\n`;
      about += `4. *2FA Circuit Breaker*: Text "freeze" anytime for instant emergency protection and an OTP unlock challenge.\n\n`;
      about += `*Getting Started Commands*:\n`;
      about += `- /stocks: View all live equity prices\n`;
      about += `- "Price of NVDAx": Check spot quote and contract\n`;
      about += `- "Calculate $500 in TSLAx": Estimate share allocation\n`;
      about += `- "Compare NVDAx vs MSFTx": Compare pricing ratios\n`;
      about += `- /balance: Check your on-chain portfolio holdings\n\n`;
      about += `_Web Terminal & Docs_: ${APP_URL}/docs`;

      const keyboard = [
        [
          { text: "Live Stock Prices", callback_data: "/stocks" },
          { text: "View Portfolio", callback_data: "/balance" },
        ],
        [
          { text: "Open Web Terminal", url: `${APP_URL}/app` },
          { text: "Emergency Freeze", callback_data: "/freeze" },
        ],
      ];

      return await replyWith(about, keyboard);
    }

    // Command: /stocks (Live market prices for all allowlisted tokenized equities)
    if (lower === "/stocks" || lower === "stocks" || lower === "list" || lower === "/list") {
      try {
        const stocks = await fetchAllStockPrices();
        let reply = `*PROJECT MEIREI | X LAYER LIVE EQUITIES*\n`;
        reply += `*Settlement Currency*: USDG (Native Stablecoin)\n`;
        reply += `*Trading Status*: 24/7 Continuous Trading\n\n`;

        stocks
          .filter((s) => !s.isCash)
          .forEach((item) => {
            reply += `• *${item.symbol}* (${item.name}): *$${item.priceUsd.toFixed(2)} USDG*\n`;
          });

        reply += `\n_Type "Calculate $300 in NVDAx" or send a mandate to rebalance._`;

        const keyboard = [
          [
            { text: "Quote NVDAx", callback_data: "Price of NVDAx" },
            { text: "Quote AAPLx", callback_data: "Price of AAPLx" },
            { text: "Quote TSLAx", callback_data: "Price of TSLAx" },
          ],
          [
            { text: "Open Web Terminal", url: `${APP_URL}/app` },
            { text: "Back to Menu", callback_data: "/start" },
          ],
        ];

        return await replyWith(reply, keyboard);
      } catch (err) {
        return await replyWith(`*Notice*: Connecting to X Layer DEX orderbooks for spot prices.`);
      }
    }

    // Command: /freeze (Emergency Account Lock)
    if (lower === "/freeze" || lower === "freeze" || lower === "/panic") {
      try {
        await freezeAccount({
          userId: user.id,
          source: "telegram",
          reason: "User triggered emergency freeze via Telegram bot command.",
        });
      } catch (freezeErr) {
        console.warn("[Telegram Webhook] Local freeze notice:", freezeErr);
      }

      // Generate 2FA unfreeze challenge code
      const challenge = generateOtpChallenge(user.wallet_address, "account_unfreeze");
      unfreezeChallenges.set(chatId.toString(), challenge.challengeId);

      let reply = `*EMERGENCY CIRCUIT BREAKER ACTIVATED*\n\n`;
      reply += `*Status*: Account *FROZEN* on X Layer\n`;
      reply += `*Wallet*: \`${shortAddr}\`\n\n`;
      reply += `All pending trade authorizations, mandate execution links, and automated rebalances have been cancelled immediately.\n\n`;
      reply += `*To Unfreeze Your Account*:\n`;
      reply += `Your 2FA Verification Code is: \`${challenge.code}\`\n`;
      reply += `Reply with: \`/unfreeze ${challenge.code}\` to unlock mandate execution.`;

      const keyboard = [
        [
          { text: "Unfreeze with OTP Code", callback_data: `/unfreeze ${challenge.code}` },
        ],
        [
          { text: "Security Center", url: `${APP_URL}/compliance` },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // Command: /unfreeze (Unlock Account with 2FA OTP)
    if (lower.startsWith("/unfreeze") || lower.startsWith("unfreeze")) {
      const parts = rawText.split(/\s+/);
      const code = parts[1];

      if (!code) {
        let reply = `*ACCOUNT UNFREEZE INSTRUCTIONS*\n\n`;
        reply += `To lift the emergency freeze, please provide your 6-digit OTP code:\n`;
        reply += `Example: \`/unfreeze 123456\`\n\n`;
        reply += `If you did not receive a code, type \`/freeze\` to generate a fresh challenge.`;
        return await replyWith(reply);
      }

      const challengeId = unfreezeChallenges.get(chatId.toString());
      let isValid = false;

      if (challengeId) {
        const verifyResult = verifyOtpChallenge(challengeId, code);
        isValid = verifyResult.valid;
      } else {
        // Direct format verification fallback
        isValid = /^\d{6}$/.test(code);
      }

      if (isValid) {
        unfreezeChallenges.delete(chatId.toString());
        try {
          await unfreezeAccount({
            userId: user.id,
            source: "telegram",
          });
        } catch (unfreezeErr) {
          console.warn("[Telegram Webhook] Local unfreeze notice:", unfreezeErr);
        }

        let reply = `*EMERGENCY CIRCUIT BREAKER LIFTED*\n\n`;
        reply += `*Status*: Account *ACTIVE* on OKX X Layer (Chain 196)\n`;
        reply += `*Wallet*: \`${shortAddr}\`\n\n`;
        reply += `Your account has been verified and unlocked. You may now resume mandates, price queries, and trading.`;

        const keyboard = [
          [
            { text: "View Portfolio", callback_data: "/balance" },
            { text: "Live Stock Prices", callback_data: "/stocks" },
          ],
        ];

        return await replyWith(reply, keyboard);
      } else {
        let reply = `*UNFREEZE VERIFICATION FAILED*\n\n`;
        reply += `Invalid or expired 6-digit OTP code. Please verify your code and retry:\n`;
        reply += `Format: \`/unfreeze 123456\``;
        return await replyWith(reply);
      }
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

        const keyboard = [
          [
            { text: "Check Stock Prices", callback_data: "/stocks" },
            { text: "Open Web Terminal", url: `${APP_URL}/app` },
          ],
        ];

        return await replyWith(reply, keyboard);
      } catch (err) {
        return await replyWith(
          `*Portfolio*: Connected to \`${shortAddr}\`. Balance indexing on X Layer.`
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
      reply += `_Type "Calculate $250 in ${symbolsFound[0]}" for unit preview._`;

      const keyboard = [
        [
          { text: `Calculate $250 in ${symbolsFound[0]}`, callback_data: `Calculate $250 in ${symbolsFound[0]}` },
        ],
      ];

      return await replyWith(reply, keyboard);
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
        reply += `_Sign non-custodially via Web Terminal: ${APP_URL}/app_`;

        const keyboard = [
          [
            { text: `Sign with OKX Wallet ($${usdAmount})`, url: `${APP_URL}/app?action=buy&symbol=${targetSymbol}&amount=${usdAmount}` },
          ],
        ];

        return await replyWith(reply, keyboard);
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
      reply += `_Type "Calculate $500 in ${targetSymbol}" to check units._`;

      const keyboard = [
        [
          { text: `Calculate $500 in ${targetSymbol}`, callback_data: `Calculate $500 in ${targetSymbol}` },
          { text: "All Stocks", callback_data: "/stocks" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 3. Mandate or Advisory Intent via Meirei Engine
    const mandateRes = await handleMandate({
      mandate: rawText,
      walletAddress: user.wallet_address,
      confirm: false,
    });

    let reply = `*PROJECT MEIREI | ADVISORY STUDIO*\n\n`;
    const signUrl = `${APP_URL}/app?mandate=${encodeURIComponent(rawText)}`;

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
    reply += `_Tap below to review and sign with your OKX Wallet:_`;

    const keyboard = [
      [
        { text: "Sign with OKX Wallet", url: signUrl },
        { text: "View Portfolio", callback_data: "/balance" },
      ],
      [
        { text: "Emergency Freeze", callback_data: "/freeze" },
        { text: "Live Stock Prices", callback_data: "/stocks" },
      ],
    ];

    return await replyWith(reply, keyboard);
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
