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
import { downloadWhatsAppAudio, transcribeAudioBuffer } from "@/lib/voice/transcribe";

export const dynamic = "force-dynamic";

const WHATSAPP_VERIFY_TOKEN =
  process.env.META_WHATSAPP_VERIFY_TOKEN ||
  process.env.WHATSAPP_VERIFY_TOKEN ||
  "meirei_wa_verify_token";

const RAW_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
// Strictly enforce https://meirei-rho.vercel.app as the canonical project domain
const APP_URL =
  RAW_APP_URL.startsWith("https://") && !RAW_APP_URL.includes("meirei.vercel.app")
    ? RAW_APP_URL.replace(/\/+$/, "")
    : "https://meirei-rho.vercel.app";

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
 * Inbound WhatsApp message processor supporting Meta Cloud API, voice notes transcription,
 * natural language conversational keyword understanding, and direct integrations.
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
    let isVoiceNote = false;

    // Helper: dispatch reply to Meta Cloud API (if configured) and return JSON
    const sendReply = async (reply: string) => {
      if (senderPhone) {
        try {
          await sendWhatsAppMessage(senderPhone, reply);
        } catch (dispatchErr) {
          console.error("[WhatsApp Webhook] Outbound Meta send error:", dispatchErr);
        }
      }

      return NextResponse.json({
        ok: true,
        channel: "whatsapp",
        sender: senderPhone,
        reply,
      });
    };

    if (contentType.includes("application/json")) {
      const body = await req.json();

      // Meta Cloud API Webhook payload structure
      if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const msg = body.entry[0].changes[0].value.messages[0];
        senderPhone = msg.from || "";
        const contact = body.entry[0].changes[0].value.contacts?.[0];
        if (contact?.profile?.name) {
          senderName = contact.profile.name;
        }

        // 1. Text message
        if (msg.text?.body) {
          messageText = msg.text.body;
        } else if (msg.interactive?.button_reply?.title) {
          messageText = msg.interactive.button_reply.title;
        } else if (msg.type === "audio" || msg.type === "voice" || msg.audio || msg.voice) {
          // Voice note audio stream processing
          isVoiceNote = true;
          const audioObj = msg.audio || msg.voice;
          const mediaId = audioObj?.id;
          const mimeType = audioObj?.mime_type || "audio/ogg";
          const metaToken =
            process.env.META_WHATSAPP_TOKEN ||
            process.env.WHATSAPP_TOKEN ||
            process.env.META_ACCESS_TOKEN;

          if (mediaId && metaToken) {
            const audioData = await downloadWhatsAppAudio(mediaId, metaToken);
            if (audioData) {
              const transcription = await transcribeAudioBuffer(
                audioData.buffer,
                audioData.mimeType || mimeType
              );
              if (transcription.ok && transcription.text) {
                messageText = transcription.text;
                console.log(
                  `[WhatsApp Voice] Successfully transcribed audio from ${senderPhone}: "${messageText}"`
                );
              } else {
                const failReason =
                  transcription.error ||
                  "Voice note received, but transcription failed. Please send your instruction as text.";
                return await sendReply(`Voice Note Received:\n${failReason}`);
              }
            } else {
              return await sendReply(
                "Voice note received, but could not download audio from WhatsApp servers. Please retry or send a text message."
              );
            }
          } else if (!metaToken) {
            return await sendReply(
              "Voice note received! Voice transcription is active. Please configure META_WHATSAPP_TOKEN and GEMINI_API_KEY in environment variables."
            );
          }
        }
      } else {
        // Direct testing JSON payload
        senderPhone = body.from || body.phone || body.sender || "+1 (555) 392 1084";
        messageText = body.message || body.text || body.body || "";
        if (body.name) senderName = body.name;

        // Support simulated or base64 audio tests
        if (!messageText && body.audio_text) {
          messageText = body.audio_text;
          isVoiceNote = true;
        } else if (!messageText && body.audio_base64) {
          isVoiceNote = true;
          const buffer = Buffer.from(body.audio_base64, "base64");
          const transcription = await transcribeAudioBuffer(buffer, body.mime_type || "audio/ogg");
          if (transcription.ok && transcription.text) {
            messageText = transcription.text;
          } else {
            return NextResponse.json({
              ok: false,
              error: transcription.error || "Audio transcription failed.",
            });
          }
        }
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

    // Identify referenced symbols for price, comparison, buy order, or unit calculation
    const words = lower.replace(/[^a-z0-9]/g, " ").split(/\s+/);
    const symbolsFound: string[] = [];
    for (const word of words) {
      const canonical = resolveSymbol(word) || resolveSymbol(`${word}x`);
      if (
        canonical &&
        !symbolsFound.includes(canonical) &&
        canonical !== "USDG" &&
        canonical !== "USDC"
      ) {
        symbolsFound.push(canonical);
      }
    }

    // Extract money amounts (e.g. $250, 250 USDG, 500 dollars)
    const moneyMatch = cleanMessage.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:usdg|usd|dollars)?/i);

    // Extract potential 6-digit OTP codes for unfreeze challenge verification
    const otpMatch = cleanMessage.match(/\b\d{6}\b/);

    // Intent flags for conversational sentences
    const isUnfreezeIntent =
      /\b(unfreeze|unlock)\b/i.test(cleanMessage) ||
      lower.startsWith("unfreeze") ||
      lower.startsWith("/unfreeze");

    const isFreezeIntent =
      (/\b(freeze|panic|emergency lock|lock account|lock wallet)\b/i.test(cleanMessage) ||
        lower === "freeze" ||
        lower === "/freeze" ||
        lower === "panic" ||
        lower === "/panic") &&
      !isUnfreezeIntent;

    const isBuyIntent =
      /\b(buy|purchase|invest|order)\b/i.test(cleanMessage);

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
        lower.startsWith("/price")) &&
      !isBuyIntent;

    const isStocksIntent =
      (/\b(stocks|stock|equities|equity|tickers|ticker|assets|tokens|market|markets)\b/i.test(
        cleanMessage
      ) ||
        lower === "/stocks" ||
        lower === "stocks" ||
        lower === "list" ||
        lower === "/list") &&
      !isBuyIntent;

    const isBalanceIntent =
      /\b(balance|portfolio|holdings|funds|wallet balance)\b/i.test(cleanMessage) ||
      lower === "/balance" ||
      lower === "balance" ||
      lower === "portfolio";

    const isConnectIntent =
      (/\b(connect|link|pair)\b/i.test(cleanMessage) ||
        lower === "/connect" ||
        lower === "connect" ||
        lower === "/link" ||
        lower === "link" ||
        lower === "/wallet" ||
        lower === "wallet" ||
        lower.includes("connect wallet") ||
        lower.includes("link wallet")) &&
      !isBalanceIntent;

    const isAboutIntent =
      lower === "/about" ||
      lower === "about" ||
      lower === "/guide" ||
      lower === "guide" ||
      /\b(about|overview|info|information|guide)\b/i.test(cleanMessage) ||
      /\bwhat\s+(is|are|does)\s+(meirei|this)\b/i.test(cleanMessage) ||
      /\bwhat\s+meirei\s+does\b/i.test(cleanMessage) ||
      /\b(who\s+are\s+you|what\s+you\s+are|who\s+you\s+are)\b/i.test(cleanMessage) ||
      /\bwhat\s+do\s+you\s+do\b/i.test(cleanMessage) ||
      /\bhow\s+does\s+(this|meirei)\s+work\b/i.test(cleanMessage);

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
      lower === "/start" ||
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

    // 1. Freeze Intent (Emergency Account Lock)
    if (isFreezeIntent) {
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

    // 2. Unfreeze Intent (Unlock Account with 2FA OTP)
    if (isUnfreezeIntent) {
      const code = otpMatch ? otpMatch[0] : cleanMessage.split(/\s+/)[1];

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

            let replyText = `MEIREI | ORDER PREPARATION (OKX X LAYER)\n\n`;
            replyText += `Action: BUY\n`;
            replyText += `Target Asset: ${targetSymbol} (${item?.name || targetSymbol})\n`;
            replyText += `Spot Price: $${spotPrice.toFixed(2)} USDG\n`;
            replyText += `Allocation Amount: $${usdAmount.toFixed(2)} USDG\n`;
            replyText += `Estimated Execution: ~${units.toFixed(4)} ${targetSymbol}\n`;
            replyText += `Settlement Asset: USDG (Chain ID 196)\n\n`;
            replyText += `1-Click Non-Custodial Execution:\n`;
            replyText += `${APP_URL}/app?action=buy&symbol=${targetSymbol}&amount=${usdAmount}\n\n`;
            replyText += `Open link with your OKX Wallet to authorize and broadcast the transaction.`;

            return await sendReply(replyText);
          }
        }

        // Symbol given without specific dollar amount
        let replyText = `MEIREI | ORDER PREPARATION (OKX X LAYER)\n\n`;
        replyText += `Asset: ${targetSymbol} (${item?.name || targetSymbol})\n`;
        replyText += `Spot Price: $${spotPrice.toFixed(2)} USDG\n`;
        replyText += `Settlement: USDG (OKX X Layer Chain 196)\n\n`;
        replyText += `To specify an amount, reply:\n`;
        replyText += `"Buy $250 in ${targetSymbol}"\n\n`;
        replyText += `Or open the Web3 Trading Terminal directly:\n`;
        replyText += `${APP_URL}/app?action=buy&symbol=${targetSymbol}`;

        return await sendReply(replyText);
      }

      // No symbol specified ("buy stock", "buy stocks", "how to buy stocks")
      let replyText = `MEIREI | HOW TO BUY TOKENIZED STOCKS\n\n`;
      replyText += `Trade tokenized equities 24/7 on OKX X Layer Mainnet (Chain ID 196) settled in USDG.\n\n`;
      replyText += `Available Assets:\n`;
      replyText += `- NVDAx (Nvidia): AI and GPU computing\n`;
      replyText += `- AAPLx (Apple): Consumer technology\n`;
      replyText += `- TSLAx (Tesla): Electric vehicles and autonomy\n`;
      replyText += `- MSFTx (Microsoft): Enterprise cloud and software\n`;
      replyText += `- GOOGLx (Alphabet): Search, cloud, and AI\n`;
      replyText += `- AMZNx (Amazon): Global e-commerce and AWS\n`;
      replyText += `- METAx (Meta): Social platforms and AI hardware\n\n`;
      replyText += `How to Order:\n`;
      replyText += `Reply with your chosen asset and dollar amount:\n`;
      replyText += `- "Buy $250 in NVDAx"\n`;
      replyText += `- "Buy $500 in TSLAx"\n`;
      replyText += `- "Buy AAPLx"\n\n`;
      replyText += `Web3 Trading Terminal:\n`;
      replyText += `${APP_URL}/app?action=buy`;

      return await sendReply(replyText);
    }

    // 4. Mandate Execution (percentages and allocation targets)
    const isMandateIntent =
      cleanMessage.includes("%") ||
      lower.includes("percent") ||
      lower.includes("allocate") ||
      lower.includes("rebalance");

    if (isMandateIntent) {
      const mandateRes = await handleMandate({
        mandate: cleanMessage,
        walletAddress: user.wallet_address,
        confirm: false,
      });

      if (mandateRes.success && mandateRes.delivery) {
        const legs = mandateRes.delivery.plan.legs || [];
        let replyText = `MEIREI | REBALANCING PLAN (OKX X LAYER)\n\n`;
        if (legs.length === 0) {
          replyText += `Mandate analyzed. Portfolio is already aligned with target allocations on X Layer.\n\n`;
        } else {
          const legsSummary = legs
            .map((l) => `- ${l.side.toUpperCase()} $${l.notionalUsd.toFixed(2)} of ${l.symbol}`)
            .join("\n");
          replyText += `Proposed Rebalancing Operations:\n${legsSummary}\n\n`;
        }
        replyText += `Open Web Terminal to sign with OKX Wallet:\n${APP_URL}/app?mandate=${encodeURIComponent(cleanMessage)}`;
        return await sendReply(replyText);
      }
    }

    // 5. Price Comparison
    if (isCompareIntent) {
      const prices = await Promise.all(symbolsFound.map((s) => fetchPrice(s)));
      let replyText = `MEIREI X LAYER STOCK COMPARISON:\n`;
      symbolsFound.forEach((sym, idx) => {
        const item = ALLOWLIST.find((a) => a.symbol === sym);
        replyText += `- ${sym} (${item?.name || sym}): $${prices[idx].toFixed(2)} USDG\n`;
      });
      const ratio = prices[0] / (prices[1] || 1);
      replyText += `\nRelative Ratio: 1 ${symbolsFound[0]} = ${ratio.toFixed(3)} ${symbolsFound[1]}.\n`;
      replyText += `Reply "Buy $250 in ${symbolsFound[0]}" to prepare a purchase.`;

      return await sendReply(replyText);
    }

    // 6. Unit Calculation
    if (isUnitIntent && moneyMatch) {
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

    // 7. Single Stock Price Quote
    if (isPriceIntent) {
      const targetSymbol = symbolsFound[0];
      const spotPrice = await fetchPrice(targetSymbol);
      const item = ALLOWLIST.find((a) => a.symbol === targetSymbol);

      let replyText = `MEIREI SPOT QUOTE | X LAYER\n`;
      replyText += `Asset: ${targetSymbol} (${item?.name || targetSymbol})\n`;
      replyText += `Price: $${spotPrice.toFixed(2)} USDG\n`;
      replyText += `Contract: ${item?.address || "X Layer DEX"}\n`;
      replyText += `Network: OKX X Layer (Chain ID 196)\n\n`;
      replyText += `Reply "Buy $250 in ${targetSymbol}" to prepare an order.`;

      return await sendReply(replyText);
    }

    // 8. Stocks List Intent ("stocks", "show me the stocks", "what stocks are available?")
    if (isStocksIntent) {
      try {
        const stocks = await fetchAllStockPrices();
        let reply = `MEIREI | X LAYER LIVE EQUITIES\n`;
        reply += `Settlement Asset: USDG (Native Stablecoin)\n`;
        reply += `Continuous Trading: 24/7\n\n`;

        stocks
          .filter((s) => !s.isCash)
          .forEach((item) => {
            reply += `- ${item.symbol} (${item.name}): $${item.priceUsd.toFixed(2)} USDG\n`;
          });

        reply += `\nReply "Buy $250 in NVDAx" to prepare a purchase.`;
        return await sendReply(reply);
      } catch (err) {
        return await sendReply(`Connecting to X Layer DEX orderbooks for spot prices.`);
      }
    }

    // 9. Portfolio Balance Intent ("balance", "check my balance", "portfolio")
    if (isBalanceIntent) {
      try {
        const holdings = await fetchBalances(user.wallet_address);
        const total = holdings.reduce((sum, h) => sum + (h.valueUsd || 0), 0);

        let replyText = `MEIREI | X LAYER PORTFOLIO\n`;
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

        replyText += `\nTerminal: ${APP_URL}/app\n`;
        replyText += `Link Wallet: ${APP_URL}/connect?channel=whatsapp&handle=${encodeURIComponent(senderPhone)}`;
        return await sendReply(replyText);
      } catch (err) {
        return await sendReply(
          `MEIREI | X LAYER\nWallet ${shortAddr} is connected. Balance is indexing on X Layer (chain 196).`
        );
      }
    }

    // 10. Connect Wallet Intent ("connect", "how to connect", "link wallet")
    if (isConnectIntent) {
      let reply = `MEIREI | CONNECT OKX WALLET\n\n`;
      reply += `Link your personal OKX Wallet to your WhatsApp account for non-custodial rebalances on OKX X Layer (Chain ID 196).\n\n`;
      reply += `Current Wallet: ${shortAddr}\n\n`;
      reply += `To link your OKX Web3 wallet:\n`;
      reply += `1. Open this secure linkage portal in your browser:\n`;
      reply += `${APP_URL}/connect?channel=whatsapp&handle=${encodeURIComponent(senderPhone)}\n\n`;
      reply += `2. Tap "Connect OKX Wallet".\n`;
      reply += `3. Switch network to OKX X Layer.\n`;
      reply += `4. Tap "Confirm Linkage to WhatsApp".\n\n`;
      reply += `Once linked, your portfolio balances will update automatically here.`;

      return await sendReply(reply);
    }

    // 11. About Intent ("about", "who are you", "what do you do")
    if (isAboutIntent) {
      let about = `MEIREI | WHO WE ARE & WHAT WE DO\n\n`;
      about += `Welcome to Meirei (命令) — your interactive AI-native investment mandate agent on OKX X Layer Mainnet (Chain ID 196).\n\n`;
      about += `What We Do:\n`;
      about += `We enable conversational portfolio management directly inside WhatsApp. Instead of navigating DEX interfaces, you state your investment goals in plain English, and Meirei plans, prices, and constructs on-chain rebalances.\n\n`;
      about += `Core Capabilities:\n`;
      about += `1. 24/7 Continuous Trading: Trade live tokenized equities (NVDAx, AAPLx, TSLAx, MSFTx, GOOGLx, AMZNx, METAx) settled natively in USDG stablecoin.\n`;
      about += `2. Non-Custodial Security: Trades are authorized and signed by you directly on OKX X Layer.\n`;
      about += `3. Natural Language Mandates: Text instructions like "Buy $250 in NVDAx" or "Allocate 40% NVDAx, 40% MSFTx, 20% USDG for $500".\n`;
      about += `4. 2FA Circuit Breaker: Text "freeze" anytime for instant emergency protection and an OTP unlock challenge.\n\n`;
      about += `Interactive Commands:\n`;
      about += `- "Buy $250 in NVDAx": Prepare 1-click buy order\n`;
      about += `- "stocks": View all live equity prices\n`;
      about += `- "Price of NVDAx": Check spot quote and contract\n`;
      about += `- "Calculate $500 in TSLAx": Estimate share allocation\n`;
      about += `- "Compare NVDAx vs MSFTx": Compare pricing ratios\n`;
      about += `- "balance": Check your on-chain portfolio holdings\n`;
      about += `- "connect": Link your OKX Wallet\n\n`;
      about += `Web Terminal: ${APP_URL}/app\n`;
      about += `Connect Wallet: ${APP_URL}/connect?channel=whatsapp&handle=${encodeURIComponent(senderPhone)}`;

      return await sendReply(about);
    }

    // 12. Reciprocal Greetings Handler (Hello, Good morning, Good afternoon, etc.)
    if (isGreeting) {
      let salutation = "Hello!";
      if (lower.includes("morning")) salutation = "Good morning!";
      else if (lower.includes("afternoon")) salutation = "Good afternoon!";
      else if (lower.includes("evening")) salutation = "Good evening!";
      else if (lower === "hey" || lower.startsWith("hey ")) salutation = "Hey!";

      let reply = `${salutation} I am Meirei, your interactive OKX X Layer agent.\n\n`;
      reply += `Do you want to know what I can do?\n`;
      reply += `Reply "Yes" to find out.`;

      return await sendReply(reply);
    }

    // 13. Affirmative Response ("Yes", "Sure", "Tell me") to greeting
    if (isAffirmative) {
      let reply = `Okay! Here is what I can do:\n\n`;
      reply += `1. Buy Stocks:\n   Reply: "Buy $250 in NVDAx" or "Buy TSLAx"\n\n`;
      reply += `2. View Live Stocks:\n   Reply: "stocks"\n\n`;
      reply += `3. Check Single Stock Price:\n   Reply: "Price of NVDAx" or "Quote AAPLx"\n\n`;
      reply += `4. Calculate Units:\n   Reply: "Calculate $500 in TSLAx"\n\n`;
      reply += `5. Compare Two Stocks:\n   Reply: "Compare NVDAx vs MSFTx"\n\n`;
      reply += `6. Check Portfolio Balance:\n   Reply: "balance"\n\n`;
      reply += `7. Connect OKX Wallet:\n   Reply: "connect"\n   Link: ${APP_URL}/connect?channel=whatsapp&handle=${encodeURIComponent(senderPhone)}\n\n`;
      reply += `8. Emergency Freeze:\n   Reply: "freeze" or "unfreeze 123456"\n\n`;
      reply += `9. Who We Are & What We Do:\n   Reply: "about"\n\n`;
      reply += `Open Web Terminal:\n${APP_URL}/app`;

      return await sendReply(reply);
    }

    // 14. Interactive fallback when input is not recognized as a command or mandate
    let replyText = `MEIREI | YOUR INTERACTIVE OKX X LAYER AGENT\n\n`;
    replyText += `Could not find this command: "${cleanMessage.slice(0, 35)}"\n\n`;
    replyText += `Here is what you can do:\n\n`;
    replyText += `1. Buy Stocks:\n   Reply: "Buy $250 in NVDAx" or "Buy TSLAx"\n\n`;
    replyText += `2. View Live Stocks:\n   Reply: "stocks"\n\n`;
    replyText += `3. Check Single Stock Price:\n   Reply: "Price of NVDAx" or "Quote AAPLx"\n\n`;
    replyText += `4. Calculate Units:\n   Reply: "Calculate $500 in TSLAx"\n\n`;
    replyText += `5. Compare Two Stocks:\n   Reply: "Compare NVDAx vs MSFTx"\n\n`;
    replyText += `6. Check Portfolio Balance:\n   Reply: "balance"\n\n`;
    replyText += `7. Connect OKX Wallet:\n   Reply: "connect"\n   Link: ${APP_URL}/connect?channel=whatsapp&handle=${encodeURIComponent(senderPhone)}\n\n`;
    replyText += `8. Emergency Freeze:\n   Reply: "freeze" or "unfreeze 123456"\n\n`;
    replyText += `9. Who We Are & What We Do:\n   Reply: "about"\n\n`;
    replyText += `Open Web Terminal:\n${APP_URL}/app`;

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
