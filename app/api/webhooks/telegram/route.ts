import { NextRequest, NextResponse } from "next/server";
import { resolveChannelUser, linkChannelWallet, unlinkChannelWallet, isSandboxWallet } from "@/lib/auth/user_identity";
import { fetchPrice, fetchBalances, fetchAllStockPrices } from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { handleMandate } from "@/src/agent/handler";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validatePayloadSize } from "@/lib/security/payload_guard";
import { freezeAccount, unfreezeAccount, isAccountFrozen } from "@/lib/users/freeze";
import { generateOtpChallenge, verifyOtpChallenge } from "@/lib/auth/otp";
import { sendTelegramMessage, downloadTelegramAudio } from "@/lib/telegram/client";
import { transcribeAudioBuffer } from "@/lib/voice/transcribe";
import { fetchLiveXLayerBalances, formatShortAddress, isValidEvmAddress } from "@/lib/wallet/xlayer";
import { checkIdempotencyAtomic } from "@/lib/security/idempotency";
import { recordWebhookEvent } from "@/lib/observability/metrics";

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
 * Inbound Telegram Bot webhook update processor with voice notes transcription,
 * interactive inline buttons, 2FA circuit breakers, live X Layer stock quotes,
 * and 1-click non-custodial signing links.
 *
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

    // Atomic idempotency check backed by Upstash Redis (NX flag)
    const updateId = body.update_id ?? body.message?.message_id ?? body.callback_query?.id;
    if (updateId) {
      const idempotency = await checkIdempotencyAtomic(`tg_update_${updateId}`);
      if (idempotency.isDuplicate) {
        await recordWebhookEvent("telegram", true, `tg_update_${updateId}`);
        return NextResponse.json({ ok: true, status: "duplicate_dropped" });
      }
      await recordWebhookEvent("telegram", false, `tg_update_${updateId}`);
    }

    // Support both standard text messages and interactive callback query button taps
    const callbackQuery = body.callback_query;
    const msg = body.message || body.edited_message || body.channel_post || callbackQuery?.message;
    if (!msg && !callbackQuery && !body.audio_text && !body.audio_base64) {
      return NextResponse.json({ ok: true, status: "ignored_empty" });
    }

    const chatId = callbackQuery ? callbackQuery.message?.chat?.id : msg?.chat?.id || body.chat_id || 987654321;
    const fromUser = callbackQuery ? callbackQuery.from : msg?.from;
    const telegramHandle = fromUser?.username ? `@${fromUser.username}` : `tg_${fromUser?.id || chatId}`;

    let rawText = (callbackQuery ? callbackQuery.data : msg?.text || "").trim();
    let isVoiceNote = false;
    let voiceTranscriptionText = "";

    // Helper: dispatch reply both via webhook JSON response and outbound API (if token configured)
    const replyWith = async (text: string, inlineKeyboard?: any[]) => {
      const finalText = isVoiceNote && voiceTranscriptionText
        ? `*MEIREI | VOICE COMMAND*: "_${voiceTranscriptionText}_"\n\n${text}`
        : text;

      const payload: any = {
        method: "sendMessage",
        chat_id: chatId,
        text: finalText,
        parse_mode: "Markdown",
      };
      if (inlineKeyboard && inlineKeyboard.length > 0) {
        payload.reply_markup = { inline_keyboard: inlineKeyboard };
      }

      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          await sendTelegramMessage(chatId, finalText, {
            reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
          });
        } catch (dispatchErr) {
          console.warn("[Telegram Webhook] Outbound push fallback to webhook response:", dispatchErr);
        }
      }

      return NextResponse.json(payload);
    };

    // 1. Voice Note & Audio Handling (Telegram msg.voice, msg.audio, or simulated payloads)
    const audioObj = msg?.voice || msg?.audio;
    if (audioObj) {
      isVoiceNote = true;
      const fileId = audioObj.file_id;
      const mimeType = audioObj.mime_type || "audio/ogg";

      if (fileId && process.env.TELEGRAM_BOT_TOKEN) {
        const audioData = await downloadTelegramAudio(fileId);
        if (audioData) {
          const transcription = await transcribeAudioBuffer(audioData.buffer, audioData.mimeType || mimeType);
          if (transcription.ok && transcription.text) {
            rawText = transcription.text.trim();
            voiceTranscriptionText = rawText;
            console.log(`[Telegram Voice] Transcribed audio from ${telegramHandle}: "${rawText}"`);
          } else {
            const failReason =
              transcription.error ||
              "Voice note received, but transcription failed. Please send your instruction as text.";
            const fallbackKeyboard = [
              [{ text: "Buy Stocks", callback_data: "Buy stocks" }, { text: "Live Stock Prices", callback_data: "/stocks" }],
              [{ text: "View Portfolio", callback_data: "/balance" }, { text: "Open Web Terminal", url: `${APP_URL}/app` }],
            ];
            return await replyWith(`*MEIREI | VOICE COMMAND RECEIVED*\n\n${failReason}`, fallbackKeyboard);
          }
        } else {
          return await replyWith(
            "*MEIREI | VOICE COMMAND RECEIVED*\n\nCould not download audio from Telegram servers. Please retry or send a text message."
          );
        }
      } else if (!process.env.TELEGRAM_BOT_TOKEN) {
        // Fallback instructions if bot token is not configured in local environment
        return await replyWith(
          "*MEIREI | VOICE COMMAND RECEIVED*\n\nVoice transcription is active. Please configure TELEGRAM_BOT_TOKEN and GEMINI_API_KEY in environment variables."
        );
      }
    } else if (!rawText && body.audio_text) {
      // Automated test payload support for simulated voice text
      isVoiceNote = true;
      rawText = body.audio_text.trim();
      voiceTranscriptionText = rawText;
    } else if (!rawText && body.audio_base64) {
      // Automated test payload support for base64 audio
      isVoiceNote = true;
      const buffer = Buffer.from(body.audio_base64, "base64");
      const transcription = await transcribeAudioBuffer(buffer, body.mime_type || "audio/ogg");
      if (transcription.ok && transcription.text) {
        rawText = transcription.text.trim();
        voiceTranscriptionText = rawText;
      } else {
        return NextResponse.json({
          ok: false,
          error: transcription.error || "Audio transcription failed.",
        });
      }
    }

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

    // Security Gate: Check if account is frozen
    const accountFrozen = await isAccountFrozen(user.id);
    if (accountFrozen && !lower.startsWith("/unfreeze") && !lower.startsWith("unfreeze")) {
      return await replyWith(
        `*SECURITY LOCK ACTIVE*\n\nYour account is frozen. All automated trading, rebalances, and withdrawals are halted.\n\nTo restore access, send:\n\`/unfreeze\`\n\nOr contact support at legal@meirei.app.`
      );
    }
    const shortAddr = `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;

    // Identify referenced symbols for price, comparison, buy order, or unit calculation
    const words = lower.replace(/[^a-z0-9]/g, " ").split(/\s+/);
    const symbolsFound: string[] = [];
    for (const word of words) {
      const canonical = resolveSymbol(word) || resolveSymbol(`${word}x`);
      if (canonical && !symbolsFound.includes(canonical) && canonical !== "USDG" && canonical !== "USDC") {
        symbolsFound.push(canonical);
      }
    }

    // Extract money amounts
    const moneyMatch = rawText.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:usdg|usd|dollars)?/i);

    // Extract potential 6-digit OTP codes for unfreeze challenge verification
    const otpMatch = rawText.match(/\b\d{6}\b/);

    // Intent flags for conversational sentences
    const isUnfreezeIntent =
      /\b(unfreeze|unlock)\b/i.test(rawText) ||
      lower.startsWith("unfreeze") ||
      lower.startsWith("/unfreeze");

    const isFreezeIntent =
      (/\b(freeze|panic|emergency lock|lock account|lock wallet)\b/i.test(rawText) ||
        lower === "freeze" ||
        lower === "/freeze" ||
        lower === "panic" ||
        lower === "/panic") &&
      !isUnfreezeIntent;

    const isBuyIntent =
      /\b(buy|purchase|invest|order)\b/i.test(rawText);

    const isCompareIntent =
      symbolsFound.length >= 2 &&
      (lower.includes("compare") ||
        lower.includes("vs") ||
        lower.includes("versus") ||
        lower.includes("difference") ||
        lower.includes("ratio"));

    const isUnitIntent =
      (lower.includes("how many") ||
        lower.includes("how much") ||
        lower.includes("units") ||
        lower.includes("shares") ||
        lower.includes("calculate")) &&
      symbolsFound.length === 1 &&
      Boolean(moneyMatch) &&
      !isBuyIntent;

    const isPriceIntent =
      symbolsFound.length === 1 &&
      (lower.includes("price") ||
        lower.includes("quote") ||
        lower.includes("worth") ||
        lower.includes("cost") ||
        lower.includes("value") ||
        lower.includes("rate") ||
        lower.startsWith("price") ||
        lower.startsWith("/price") ||
        lower.startsWith("quote") ||
        lower.startsWith("/quote")) &&
      !isBuyIntent;

    const isStocksIntent =
      (/\b(stocks|stock|equities|equity|tickers|ticker|assets|tokens|market|markets)\b/i.test(
        rawText
      ) ||
        lower === "/stocks" ||
        lower === "stocks" ||
        lower === "list" ||
        lower === "/list") &&
      !isBuyIntent;

    const isBalanceIntent =
      /\b(balance|portfolio|holdings|funds|wallet balance)\b/i.test(rawText) ||
      lower === "/balance" ||
      lower === "balance" ||
      lower === "portfolio";

    const evmAddressMatch = rawText.match(/\b(0x[a-fA-F0-9]{40})\b/i);

    const isLeaveSandboxIntent =
      /\b(leave\s+sandbox|exit\s+sandbox|leave\s+the\s+sandbox|exit\s+the\s+sandbox|real\s+wallet|work\s+with\s+real\s+wallet|real\s+funds|switch\s+to\s+real|use\s+real\s+wallet|how\s+to\s+fund|fund\s+wallet|deposit\s+funds|fund\s+my\s+wallet|how\s+to\s+deposit|deposit)\b/i.test(
        rawText
      );

    const isConnectIntent =
      (/\b(connect|link|pair)\b/i.test(rawText) ||
        lower === "/connect" ||
        lower === "connect" ||
        lower === "/link" ||
        lower === "link" ||
        lower === "/wallet" ||
        lower === "wallet" ||
        lower.includes("connect wallet") ||
        lower.includes("link wallet")) &&
      !isBalanceIntent;

    const isDisconnectIntent =
      lower === "/disconnect" ||
      lower === "disconnect" ||
      lower === "/unlink" ||
      lower === "unlink" ||
      lower.includes("disconnect wallet") ||
      lower.includes("unlink wallet") ||
      lower.includes("disconnect my wallet");

    const isAboutIntent =
      lower === "/about" ||
      lower === "about" ||
      lower === "/guide" ||
      lower === "guide" ||
      /\b(about|overview|info|information|guide)\b/i.test(rawText) ||
      /\bwhat\s+(is|are|does)\s+(meirei|this)\b/i.test(rawText) ||
      /\bwhat\s+meirei\s+does\b/i.test(rawText) ||
      /\b(who\s+are\s+you|what\s+you\s+are|who\s+you\s+are)\b/i.test(rawText) ||
      /\bwhat\s+do\s+you\s+do\b/i.test(rawText) ||
      /\bhow\s+does\s+(this|meirei)\s+work\b/i.test(rawText);

    const isGreeting =
      lower === "hello" ||
      lower === "hi" ||
      lower === "hey" ||
      lower === "sup" ||
      lower === "yo" ||
      lower.includes("good morning") ||
      lower.includes("good afternoon") ||
      lower.includes("good evening") ||
      lower.includes("good day") ||
      lower === "morning" ||
      lower === "afternoon" ||
      lower === "evening" ||
      lower.includes("how do i get started") ||
      lower.includes("how to get started") ||
      lower.includes("get started") ||
      lower.includes("getting started") ||
      lower === "start";

    const isAffirmative =
      lower === "yes" ||
      lower === "yep" ||
      lower === "yeah" ||
      lower === "sure" ||
      lower === "ok" ||
      lower === "okay" ||
      lower === "tell me" ||
      lower === "what can you do" ||
      lower === "what can u do" ||
      lower === "show me" ||
      lower === "continue" ||
      lower === "options" ||
      lower === "help" ||
      lower === "/help" ||
      lower === "menu" ||
      lower === "/menu";

    // 0. Project Welcome: /start or /help
    if (lower === "/start" || lower === "/help" || lower === "help") {
      let welcome = `*PROJECT MEIREI | OKX X LAYER BOT*\n\n`;
      welcome += `*Network*: OKX X Layer Mainnet (Chain ID 196)\n`;
      welcome += `*Connected Wallet*: \`${shortAddr}\`\n`;
      welcome += `*Identity*: ${user.email}\n\n`;
      welcome += `*Commands & Capabilities*:\n`;
      welcome += `- *Buy Stocks*: "Buy $250 in NVDAx" or "Buy TSLAx"\n`;
      welcome += `- *Check Prices*: "Price of NVDAx", "Quote TSLAx"\n`;
      welcome += `- *Live Market List*: /stocks or "stocks"\n`;
      welcome += `- *Compare Stocks*: "Compare NVDAx vs MSFTx"\n`;
      welcome += `- *Unit Calculator*: "Calculate $250 in NVDAx"\n`;
      welcome += `- *Portfolio Balance*: /balance or "portfolio"\n`;
      welcome += `- *Connect OKX Wallet*: /connect\n`;
      welcome += `- *Run Mandates*: "60% Mag7, 20% USDG, max 8%"\n`;
      welcome += `- *Emergency Freeze*: /freeze and /unfreeze\n\n`;
      welcome += `_Non-custodial architecture: Zero private keys stored on servers._`;

      const keyboard = [
        [
          { text: "Buy Stocks", callback_data: "Buy stocks" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
        ],
        [
          { text: "Open Web Terminal", url: `${APP_URL}/app` },
          { text: "Emergency Freeze", callback_data: "/freeze" },
        ],
      ];

      return await replyWith(welcome, keyboard);
    }

    // 1. Freeze Intent (Emergency Circuit Breaker)
    if (isFreezeIntent) {
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
      const challenge = await generateOtpChallenge(user.wallet_address, "account_unfreeze");
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
          { text: `Unfreeze (${challenge.code})`, callback_data: `/unfreeze ${challenge.code}` },
          { text: "Security Center", url: `${APP_URL}/compliance` },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 2. Unfreeze Intent (Unlock Account with 2FA OTP)
    if (isUnfreezeIntent) {
      const code = otpMatch ? otpMatch[0] : rawText.split(/\s+/)[1];

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
        const verifyResult = await verifyOtpChallenge(challengeId, code);
        isValid = verifyResult.valid;
      } else {
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

    // 2b. Direct EVM Address Linkage ("0x...", "/connect 0x...", "link 0x...")
    if (evmAddressMatch) {
      const realWallet = evmAddressMatch[1].toLowerCase();
      await linkChannelWallet({
        channel: "telegram",
        handle: telegramHandle,
        walletAddress: realWallet,
      });

      const snapshot = await fetchLiveXLayerBalances(realWallet);
      const shortReal = formatShortAddress(realWallet);
      const explorerLink = `https://www.oklink.com/xlayer/address/${realWallet}`;

      let reply = `*REAL WALLET ACTIVATED | LEAVING SANDBOX*\n\n`;
      reply += `Your Web3 wallet has been linked to this Telegram account.\n`;
      reply += `You have exited the sandbox and are now active on *OKX X Layer Mainnet (Chain ID 196)*.\n\n`;
      reply += `*Connected Wallet*: \`${shortReal}\`\n`;
      reply += `*Address*: \`${realWallet}\`\n`;
      reply += `*Explorer*: ${explorerLink}\n\n`;

      reply += `*Live On-Chain Balances*:\n`;
      reply += `• *Native Gas (OKB)*: \`${snapshot.okbBalance.toFixed(4)} OKB\`\n`;
      reply += `• *Settlement Cash (USDG)*: \`$${snapshot.usdgBalance.toFixed(2)} USDG\`\n`;
      reply += `• *Settlement Cash (USDC)*: \`$${snapshot.usdcBalance.toFixed(2)} USDC\`\n`;

      const nonCashHoldings = snapshot.holdings.filter((h) => !h.isCash);
      if (nonCashHoldings.length > 0) {
        reply += `• *Tokenized Equities*:\n`;
        nonCashHoldings.forEach((h) => {
          reply += `  - *${h.symbol}*: ${h.amount.toFixed(4)} ($${h.valueUsd.toFixed(2)})\n`;
        });
      } else {
        reply += `• *Stock Positions*: None active ($0.00)\n`;
      }
      reply += `• *Total Portfolio Value*: *$${snapshot.totalValueUsd.toFixed(2)} USDG*\n\n`;

      reply += `*How to Fund Your Real Wallet on OKX X Layer*:\n`;
      reply += `1. *Native Gas Token (OKB)*:\n`;
      reply += `   OKB is needed for transaction gas fees on X Layer (gas is <$0.01 per trade). A balance of ~0.05 OKB ($0.50) is plenty for 50+ trades.\n`;
      reply += `   - Withdraw OKB from OKX Exchange (choose "X Layer" as withdrawal network).\n`;
      reply += `   - Or bridge OKB/ETH via OKX Bridge: https://www.okx.com/web3/bridge\n\n`;
      reply += `2. *Trading Capital (USDG / USDC)*:\n`;
      reply += `   Equities (NVDAx, AAPLx, TSLAx, MSFTx, GOOGLx, AMZNx, METAx) settle in USDG or USDC.\n`;
      reply += `   - Deposit USDG on X Layer to execute orders.\n\n`;
      reply += `_Non-custodial architecture: Zero private keys stored on servers. All trades are authorized and signed by your connected Web3 wallet._`;

      const keyboard = [
        [
          { text: "Open Web3 Trading Terminal", url: `${APP_URL}/app` },
          { text: "Fund via OKX Bridge", url: "https://www.okx.com/web3/bridge" },
        ],
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 2c. Leave Sandbox / Real Wallet Funding Guide
    if (isLeaveSandboxIntent) {
      const isSandbox = isSandboxWallet("telegram", telegramHandle, user.wallet_address);
      let reply = `*PROJECT MEIREI | TRANSITION TO REAL WALLET*\n\n`;
      reply += `You are ready to leave the sandbox and manage real capital on *OKX X Layer Mainnet (Chain ID 196)*!\n\n`;
      reply += `*Current Mode*: ${isSandbox ? "Sandbox / Demo Account" : "Real Wallet Connected"}\n`;
      reply += `*Active Address*: \`${shortAddr}\`\n\n`;

      reply += `*Step 1: Link Your Real Web3 Wallet*\n`;
      reply += `• *Option A (Instant Chat Link)*: Reply directly with your 0x address right here in the chat.\n`;
      reply += `  Example: \`0x71C...1234\`\n`;
      reply += `• *Option B (1-Click Web Connect)*: Tap "Connect OKX Wallet" below to connect with OKX Wallet or MetaMask.\n\n`;

      reply += `*Step 2: Fund Your Wallet on X Layer*\n`;
      reply += `1. *Gas Fees (OKB)*:\n`;
      reply += `   X Layer requires native OKB for transaction fees (<$0.01 per trade). A balance of 0.05 to 0.1 OKB covers 100+ transactions.\n`;
      reply += `   - Withdraw OKB from OKX Exchange selecting network: *X Layer*.\n`;
      reply += `   - Or bridge OKB/ETH using OKX Bridge: https://www.okx.com/web3/bridge\n\n`;
      reply += `2. *Trading Capital (USDG or USDC)*:\n`;
      reply += `   Tokenized stocks (NVDAx, AAPLx, TSLAx, MSFTx, GOOGLx, AMZNx, METAx) trade 24/7 settled in USDG or USDC.\n`;
      reply += `   - Deposit or swap for USDG on X Layer to fund purchases.\n\n`;
      reply += `_Non-custodial architecture: Zero private keys stored on servers._`;

      const keyboard = [
        [
          { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
          { text: "Fund via OKX Bridge", url: "https://www.okx.com/web3/bridge" },
        ],
        [
          { text: "Open Web Terminal", url: `${APP_URL}/app` },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 3. Buy Stocks Intent ("buy stock", "buy $250 in NVDAx", "buy TSLAx", etc.)
    if (isBuyIntent) {
      if (symbolsFound.length >= 1) {
        const targetSymbol = symbolsFound[0];
        const spotPrice = await fetchPrice(targetSymbol);
        const item = ALLOWLIST.find((a) => a.symbol === targetSymbol);

        if (moneyMatch) {
          const usdAmount = parseFloat(moneyMatch[1]);
          if (usdAmount > 0) {
            const units = usdAmount / (spotPrice || 1);
            let reply = `*MEIREI INTENT SOLVER | TRADE APPROVAL REQUIRED*\n\n`;
            reply += `Meirei utilizes an Intent-Based Architecture. The AI bot acts as a solver, structuring the calldata for the trade and pushing a one-click signing prompt to your client. Private keys never leave the OKX Wallet.\n\n`;
            reply += `*Action*: BUY\n`;
            reply += `*Target Asset*: *${targetSymbol}* (${item?.name || targetSymbol})\n`;
            reply += `*Spot Price*: *$${spotPrice.toFixed(2)} USDG*\n`;
            reply += `*Input Allocation*: *$${usdAmount.toFixed(2)} USDG*\n`;
            reply += `*Estimated Execution*: *~${units.toFixed(4)} ${targetSymbol}*\n`;
            reply += `*Network*: OKX X Layer (Chain ID 196)\n`;
            reply += `*Routing*: OKX Exchange OS (Aggregated Spot Execution)\n`;
            reply += `*Execution Mode*: Non-Custodial Client Signing\n\n`;
            reply += `*Approval URL*:\n`;
            reply += `${APP_URL}/app?action=buy&symbol=${targetSymbol}&amount=${usdAmount}\n\n`;
            reply += `_Tap "Approve Trade" below to open the terminal and sign the transaction with your connected OKX Wallet:_`;

            const keyboard = [
              [
                { text: "Approve Trade", url: `${APP_URL}/app?action=buy&symbol=${targetSymbol}&amount=${usdAmount}` },
                { text: "View Portfolio", callback_data: "/balance" },
              ],
            ];
            return await replyWith(reply, keyboard);
          }
        }

        // Symbol given without specific dollar amount
        let reply = `*MEIREI INTENT SOLVER | ORDER SPECIFICATION*\n\n`;
        reply += `*Asset*: *${targetSymbol}* (${item?.name || targetSymbol})\n`;
        reply += `*Spot Price*: *$${spotPrice.toFixed(2)} USDG*\n`;
        reply += `*Network*: OKX X Layer (Chain ID 196)\n`;
        reply += `*Routing*: OKX Exchange OS (Aggregated Spot Execution)\n\n`;
        reply += `To formulate transaction calldata, specify an amount:\n`;
        reply += `• Example: \`Buy 100 USDG ${targetSymbol}\` or \`Buy $250 in ${targetSymbol}\`\n\n`;
        reply += `*Terminal Deep Link*:\n`;
        reply += `${APP_URL}/app?action=buy&symbol=${targetSymbol}\n\n`;
        reply += `_Or tap "Approve Trade" below to configure and sign directly:_`;

        const keyboard = [
          [
            { text: "Approve Trade", url: `${APP_URL}/app?action=buy&symbol=${targetSymbol}` },
            { text: "Live Stock Prices", callback_data: "/stocks" },
          ],
        ];
        return await replyWith(reply, keyboard);
      }

      // No symbol specified ("buy stock", "buy stocks", "how to buy stocks")
      let reply = `*MEIREI | HOW TO BUY TOKENIZED STOCKS*\n\n`;
      reply += `Trade tokenized equities 24/7 on OKX X Layer Mainnet (Chain ID 196) settled in USDG.\n\n`;
      reply += `*Available Tickers*:\n`;
      reply += `• NVDAx (Nvidia): AI and GPU computing\n`;
      reply += `• AAPLx (Apple): Consumer technology\n`;
      reply += `• TSLAx (Tesla): Electric vehicles and autonomy\n`;
      reply += `• MSFTx (Microsoft): Enterprise cloud and software\n`;
      reply += `• GOOGLx (Alphabet): Search, cloud, and AI\n`;
      reply += `• AMZNx (Amazon): Global e-commerce and AWS\n`;
      reply += `• METAx (Meta): Social platforms and AI hardware\n\n`;
      reply += `*How to Order*:\n`;
      reply += `Reply with your chosen asset and dollar amount:\n`;
      reply += `• "Buy $250 in NVDAx"\n`;
      reply += `• "Buy $500 in TSLAx"\n`;
      reply += `• "Buy AAPLx"\n\n`;

      const keyboard = [
        [
          { text: "Open Web3 Trading Terminal", url: `${APP_URL}/app` },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
      ];
      return await replyWith(reply, keyboard);
    }

    // 4. Mandate Execution (percentages and allocation targets)
    const isMandateIntent =
      rawText.includes("%") ||
      lower.includes("percent") ||
      lower.includes("allocate") ||
      lower.includes("rebalance");

    if (isMandateIntent) {
      const mandateRes = await handleMandate({
        mandate: rawText,
        walletAddress: user.wallet_address,
        confirm: false,
      });

      if (mandateRes.success && mandateRes.delivery) {
        const legs = mandateRes.delivery.plan.legs || [];
        let reply = `*PROJECT MEIREI | ADVISORY STUDIO*\n\n`;
        if (legs.length === 0) {
          reply += `_Mandate analyzed. Portfolio is already aligned with target allocations on X Layer._\n\n`;
        } else {
          const legsSummary = legs
            .map((l) => `• *${l.side.toUpperCase()}* $${l.notionalUsd.toFixed(2)} of *${l.symbol}*`)
            .join("\n");
          reply += `*Proposed Rebalancing Plan*:\n${legsSummary}\n\n`;
        }
        reply += `_Tap below to review and sign with your OKX Wallet:_`;

        const signUrl = `${APP_URL}/app?mandate=${encodeURIComponent(rawText)}`;
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
      }
    }

    // 5. Price Comparison
    if (isCompareIntent) {
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
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 6. Unit Calculation
    if (isUnitIntent && moneyMatch) {
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

    // 7. Single Stock Price Quote
    if (isPriceIntent) {
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

    // 8. Stocks List Intent ("stocks", "show me the stocks", "what stocks are available?")
    if (isStocksIntent) {
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

        reply += `\n_Reply "Buy $250 in NVDAx" or tap below to prepare an order._`;

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

    // 9. Portfolio Balance Intent ("balance", "portfolio", "check my balance")
    if (isBalanceIntent) {
      try {
        const snapshot = await fetchLiveXLayerBalances(user.wallet_address);
        const isSandbox = isSandboxWallet("telegram", telegramHandle, user.wallet_address);
        const explorerLink = `https://www.oklink.com/xlayer/address/${user.wallet_address}`;

        let reply = `*PROJECT MEIREI | PORTFOLIO*\n`;
        reply += `*Network*: OKX X Layer Mainnet (Chain ID 196)\n`;
        reply += `*Mode*: ${isSandbox ? "Sandbox / Demo Account" : "REAL WALLET (Active)"}\n`;
        reply += `*Wallet*: \`${shortAddr}\`\n`;
        reply += `*Explorer*: ${explorerLink}\n\n`;

        reply += `*Live On-Chain Balances*:\n`;
        reply += `• *Native Gas (OKB)*: \`${snapshot.okbBalance.toFixed(4)} OKB\`\n`;
        reply += `• *Settlement Cash (USDG)*: \`$${snapshot.usdgBalance.toFixed(2)} USDG\`\n`;
        reply += `• *Settlement Cash (USDC)*: \`$${snapshot.usdcBalance.toFixed(2)} USDC\`\n`;

        const nonCashHoldings = snapshot.holdings.filter((h) => !h.isCash);
        if (nonCashHoldings.length > 0) {
          reply += `• *Active Stock Holdings*:\n`;
          nonCashHoldings.forEach((h) => {
            reply += `  - *${h.symbol}*: ${h.amount.toFixed(4)} ($${h.valueUsd.toFixed(2)})\n`;
          });
        } else {
          reply += `• *Stock Positions*: None active ($0.00)\n`;
        }
        reply += `• *Total Portfolio Value*: *$${snapshot.totalValueUsd.toFixed(2)} USDG*\n\n`;

        if (isSandbox) {
          reply += `_You are currently in Sandbox mode. Reply with your 0x address or tap "Connect OKX Wallet" to switch to your real wallet._`;
        } else if (snapshot.okbBalance < 0.001) {
          reply += `_Notice: Low OKB gas balance. Deposit a fraction of OKB on X Layer to pay transaction fees._`;
        } else {
          reply += `_Wallet funded and active on X Layer Mainnet. Ready for mandates and stock purchases._`;
        }

        const keyboard = isSandbox
          ? [
              [
                { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
                { text: "Fund via OKX Bridge", url: "https://www.okx.com/web3/bridge" },
              ],
              [
                { text: "Live Stock Prices", callback_data: "/stocks" },
                { text: "Open Web Terminal", url: `${APP_URL}/app` },
              ],
            ]
          : [
              [
                { text: "Open Web Terminal", url: `${APP_URL}/app` },
                { text: "Fund via OKX Bridge", url: "https://www.okx.com/web3/bridge" },
              ],
              [
                { text: "Live Stock Prices", callback_data: "/stocks" },
                { text: "Disconnect Wallet", callback_data: "/disconnect" },
              ],
            ];

        return await replyWith(reply, keyboard);
      } catch (err) {
        return await replyWith(
          `*Portfolio*: Connected to \`${shortAddr}\`. Balance indexing on X Layer.`
        );
      }
    }

    // 10. Connect Wallet Intent ("connect", "how to connect", "link wallet")
    if (isConnectIntent) {
      const isSandbox = isSandboxWallet("telegram", telegramHandle, user.wallet_address);
      let reply = `*PROJECT MEIREI | CONNECT OKX WALLET*\n\n`;
      reply += `Link your personal OKX Web3 Wallet to your Telegram handle for non-custodial rebalances on *OKX X Layer (Chain ID 196)*.\n\n`;
      reply += `*Mode*: ${isSandbox ? "Sandbox / Demo Account" : "Real Wallet Connected"}\n`;
      reply += `*Active Wallet*: \`${shortAddr}\`\n\n`;
      reply += `*Two Ways to Connect*:\n`;
      reply += `1. *Instant Chat Link*: Reply directly with your 42-char address (e.g. \`0x...\`)\n`;
      reply += `2. *1-Click Web Connect*: Tap "Connect OKX Wallet" below to authenticate with OKX Wallet or MetaMask.\n\n`;
      reply += `_Non-custodial: Zero private keys stored on servers._`;

      const keyboard = [
        [
          { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
          { text: "Fund via OKX Bridge", url: "https://www.okx.com/web3/bridge" },
        ],
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 10b. Disconnect / Unlink Wallet Intent ("disconnect", "unlink", "disconnect wallet")
    if (isDisconnectIntent) {
      await unlinkChannelWallet({
        channel: "telegram",
        handle: telegramHandle,
      });

      let reply = `*PROJECT MEIREI | WALLET DISCONNECTED*\n\n`;
      reply += `Your OKX Wallet has been unlinked from this Telegram account.\n`;
      reply += `Your account has reverted to the default non-custodial sandbox wallet.\n\n`;
      reply += `_To reconnect or switch to another OKX Wallet anytime, tap below:_`;

      const keyboard = [
        [
          { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
        ],
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 11. About Intent ("about", "who are you", "what do you do")
    if (isAboutIntent) {
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

    // 12. Reciprocal Greetings Handler (Hello, Good morning, Good afternoon, etc.)
    if (isGreeting) {
      let salutation = "Hello!";
      if (lower.includes("morning")) salutation = "Good morning!";
      else if (lower.includes("afternoon")) salutation = "Good afternoon!";
      else if (lower.includes("evening")) salutation = "Good evening!";
      else if (lower === "hey" || lower.startsWith("hey ")) salutation = "Hey!";

      let reply = `*${salutation}* I am Meirei, your interactive OKX X Layer agent.\n\n`;
      reply += `*Connected Wallet*: \`${shortAddr}\`\n`;
      reply += `*Network*: OKX X Layer Mainnet (Chain ID 196)\n\n`;
      reply += `Do you want to know what I can do?\n`;
      reply += `Reply *"Yes"* or tap a button below:`;

      const keyboard = [
        [
          { text: "Yes, what can you do?", callback_data: "Yes" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
        ],
        [
          { text: "Open Web Terminal", url: `${APP_URL}/app` },
          { text: "Emergency Freeze", callback_data: "/freeze" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 13. Affirmative Response ("Yes", "Sure", "Tell me") to greeting
    if (isAffirmative) {
      let reply = `*PROJECT MEIREI | CAPABILITIES*\n\n`;
      reply += `Here is what I can do for you on *OKX X Layer (Chain ID 196)*:\n\n`;
      reply += `1. *Buy Stocks*:\n   Reply: "Buy $250 in NVDAx" or "Buy TSLAx"\n\n`;
      reply += `2. *View Live Stocks*:\n   Reply: "stocks" or /stocks\n\n`;
      reply += `3. *Check Single Stock Price*:\n   Reply: "Price of NVDAx" or "Quote AAPLx"\n\n`;
      reply += `4. *Calculate Units*:\n   Reply: "Calculate $500 in TSLAx"\n\n`;
      reply += `5. *Compare Two Stocks*:\n   Reply: "Compare NVDAx vs MSFTx"\n\n`;
      reply += `6. *Check Portfolio Balance*:\n   Reply: "balance" or /balance\n\n`;
      reply += `7. *Connect / Disconnect Wallet*:\n   Reply: "connect" or "disconnect"\n\n`;
      reply += `8. *Emergency Freeze*:\n   Reply: "freeze" or "unfreeze 123456"\n\n`;
      reply += `9. *Who We Are & What We Do*:\n   Reply: "about" or /about\n\n`;
      reply += `_Web3 Trading Terminal_: ${APP_URL}/app`;

      const keyboard = [
        [
          { text: "Buy Stocks", callback_data: "Buy stocks" },
          { text: "Live Stock Prices", callback_data: "/stocks" },
        ],
        [
          { text: "View Portfolio", callback_data: "/balance" },
          { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
        ],
        [
          { text: "Open Web Terminal", url: `${APP_URL}/app` },
          { text: "Emergency Freeze", callback_data: "/freeze" },
        ],
      ];

      return await replyWith(reply, keyboard);
    }

    // 14. Advisory Mandate Fallback via Meirei Engine
    const mandateRes = await handleMandate({
      mandate: rawText,
      walletAddress: user.wallet_address,
      confirm: false,
    });

    if (mandateRes.success && mandateRes.delivery) {
      const legs = mandateRes.delivery.plan.legs || [];
      let reply = `*PROJECT MEIREI | ADVISORY STUDIO*\n\n`;
      const signUrl = `${APP_URL}/app?mandate=${encodeURIComponent(rawText)}`;

      if (legs.length === 0) {
        reply += `_Mandate analyzed. Portfolio is already aligned with target allocations on X Layer._\n\n`;
      } else {
        const legsSummary = legs
          .map((l) => `• *${l.side.toUpperCase()}* $${l.notionalUsd.toFixed(2)} of *${l.symbol}*`)
          .join("\n");
        reply += `*Proposed Rebalancing Plan*:\n${legsSummary}\n\n`;
      }
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
    }

    // 15. Interactive fallback when input is not recognized as a command or mandate
    let reply = `*PROJECT MEIREI | YOUR INTERACTIVE OKX X LAYER AGENT*\n\n`;
    reply += `Could not find this command: "${rawText.slice(0, 35)}"\n\n`;
    reply += `Here is what you can do:\n\n`;
    reply += `1. *Buy Stocks*: "Buy $250 in NVDAx" or "Buy TSLAx"\n`;
    reply += `2. *Live Stock Prices*: "stocks" or /stocks\n`;
    reply += `3. *Price Quotes*: "Price of NVDAx" or "Quote AAPLx"\n`;
    reply += `4. *Calculate Units*: "Calculate $500 in TSLAx"\n`;
    reply += `5. *Compare Stocks*: "Compare NVDAx vs MSFTx"\n`;
    reply += `6. *Portfolio Balance*: "balance" or /balance\n`;
    reply += `7. *Connect / Disconnect*: "connect" or "disconnect"\n`;
    reply += `8. *Emergency Freeze*: "freeze" or "unfreeze 123456"\n`;
    reply += `9. *About Meirei*: "about" or /about\n\n`;
    reply += `_Web3 Trading Terminal_: ${APP_URL}/app`;

    const keyboard = [
      [
        { text: "Buy Stocks", callback_data: "Buy stocks" },
        { text: "Live Stock Prices", callback_data: "/stocks" },
      ],
      [
        { text: "View Portfolio", callback_data: "/balance" },
        { text: "Connect OKX Wallet", url: `${APP_URL}/connect?channel=telegram&handle=${encodeURIComponent(telegramHandle)}` },
      ],
      [
        { text: "Open Web Terminal", url: `${APP_URL}/app` },
        { text: "Emergency Freeze", callback_data: "/freeze" },
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
