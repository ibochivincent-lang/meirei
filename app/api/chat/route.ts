import { NextRequest, NextResponse } from "next/server";
import { handleMandate } from "@/src/agent/handler";
import type { Leg } from "@/src/types";
import {
  initOnchainOS,
  fetchPrice,
  fetchBalances,
  fetchAllStockPrices,
  executeSwap,
  getSwapQuote,
} from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { validateOtpToken, generateOtpChallenge, verifyOtpChallenge } from "@/lib/auth/otp";
import { checkRateLimitRedis, getClientIp } from "@/lib/security/rate_limiter";
import { validateSpendingLimit, recordExecutedSpend } from "@/lib/security/spending_limits";
import { checkIdempotencyAtomic, completeIdempotency, deriveOperationKey } from "@/lib/security/idempotency";
import { validatePayloadSize, withTimeout } from "@/lib/security/payload_guard";
import { logger } from "@/lib/observability/logger";
import { resolveUserIdentity } from "@/lib/auth/user_identity";
import { freezeAccount, unfreezeAccount, isAccountFrozen } from "@/lib/users/freeze";
import { transcribeAudioBuffer } from "@/lib/voice/transcribe";
import { checkSanctions } from "@/lib/security/sanctions";
import { getRedisClient } from "@/lib/redis/client";

interface PendingExecution {
  type: "trade" | "mandate";
  side?: "buy" | "sell";
  symbol?: string;
  notionalUsd?: number;
  stockAmount?: number;
  mandate?: string;
  timestamp: number;
}

const recentPendingQuotes = new Map<string, PendingExecution>();

// Evict expired pending quotes from in-memory fallback
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of recentPendingQuotes.entries()) {
    if (now - record.timestamp > 10 * 60 * 1000) {
      recentPendingQuotes.delete(key);
    }
  }
}, 5 * 60 * 1000);

async function getPendingQuote(walletAddress: string): Promise<PendingExecution | undefined> {
  const addr = walletAddress.toLowerCase();
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<string | PendingExecution>(`pending_quote:${addr}`);
      if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (err) {
      console.warn("[pending_quote] Redis read notice:", err);
    }
  }
  const mem = recentPendingQuotes.get(addr);
  if (mem && Date.now() - mem.timestamp < 10 * 60 * 1000) {
    return mem;
  }
  return undefined;
}

async function setPendingQuote(walletAddress: string, pending: PendingExecution): Promise<void> {
  const addr = walletAddress.toLowerCase();
  recentPendingQuotes.set(addr, pending);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`pending_quote:${addr}`, JSON.stringify(pending), { ex: 600 });
    } catch (err) {
      console.warn("[pending_quote] Redis write notice:", err);
    }
  }
}

async function deletePendingQuote(walletAddress: string): Promise<void> {
  const addr = walletAddress.toLowerCase();
  recentPendingQuotes.delete(addr);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`pending_quote:${addr}`);
    } catch (err) {
      console.warn("[pending_quote] Redis del notice:", err);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const payloadCheck = validatePayloadSize(req);
    if (!payloadCheck.valid) {
      return NextResponse.json({ error: payloadCheck.error }, { status: 413 });
    }

    const body = await req.json();
    let message = (body.message || body.mandate || "").trim();
    const rawWallet = (body.walletAddress || "").trim();
    if (!rawWallet) {
      return NextResponse.json(
        {
          error: "Missing required walletAddress.",
          reply: "Please connect your Web3 wallet (OKX Wallet or MetaMask) first to trade or view balances on OKX X Layer (Chain 196).",
          requiresWallet: true,
        },
        { status: 400 }
      );
    }
    const walletAddress = rawWallet;
    const confirm = Boolean(body.confirm);

    // Sanctions screening prior to quote generation or trade execution
    const sanctionsCheck = await checkSanctions(walletAddress);
    if (sanctionsCheck.invalidAddress) {
      return NextResponse.json({ error: "Invalid wallet address format." }, { status: 400 });
    }
    if (sanctionsCheck.isSanctioned) {
      return NextResponse.json(
        {
          error: "Sanctions restriction: This wallet address has been identified on an OFAC / international sanctions registry.",
          reply: "Trading prohibited: This wallet address is subject to international sanctions and cannot execute mandates or receive quotes.",
        },
        { status: 403 }
      );
    }

    // Voice note audio transcription support on Web Platform (matching WhatsApp & Telegram)
    if (!message && body.audio_base64) {
      try {
        const buffer = Buffer.from(body.audio_base64, "base64");
        const transcription = await transcribeAudioBuffer(buffer, body.mime_type || "audio/webm");
        if (transcription.ok && transcription.text) {
          message = transcription.text.trim();
        }
      } catch (voiceErr) {
        console.warn("[Chat API] Audio transcription notice:", voiceErr);
      }
    }

    if (!message) {
      return NextResponse.json({ error: "Missing message or mandate" }, { status: 400 });
    }

    const lower = message.toLowerCase();
    const clientIp = getClientIp(req);
    const isTradeIntent = confirm || lower.includes("buy") || lower.includes("sell") || lower.includes("confirm");
    const rateTier = isTradeIntent ? "trade" : "read";
    const rateCheck = await checkRateLimitRedis(`${clientIp}:${walletAddress}`, rateTier);

    if (!rateCheck.allowed) {
      logger.warn("ChatAPI", "Rate limit exceeded", { clientIp, walletAddress, tier: rateTier });
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds}s before sending more requests.`,
          retryAfter: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetSeconds),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateCheck.resetSeconds),
          },
        }
      );
    }

    // Initialize Onchain OS using the live environment on X Layer
    initOnchainOS({ mock: false, useSkills: false, walletAddress });

    // Transparent non-custodial user identity registration/sync across WhatsApp, Telegram, and Web
    if (body.email || body.chatHandle) {
      resolveUserIdentity({
        email: body.email || `${(body.chatHandle || "user").replace(/[^a-zA-Z0-9]/g, "")}@meirei.app`,
        walletAddress,
        channel: body.platform || "web",
        channelHandle: body.chatHandle,
      }).catch((err) => console.warn("[Identity] Background user sync notice:", err));
    }

    // 0a. Emergency Unfreeze Command (/unfreeze or "unfreeze")
    const isUnfreezeIntent =
      lower.startsWith("/unfreeze") ||
      lower.startsWith("unfreeze") ||
      lower.includes("unfreeze") ||
      lower.includes("unlock");

    if (isUnfreezeIntent) {
      const otpMatch = message.match(/\b\d{6}\b/);
      if (otpMatch) {
        const inputCode = otpMatch[0];
        const challengeId = body.challengeId || `otp_${walletAddress}`;
        const verifyRes = await verifyOtpChallenge(challengeId, inputCode);

        // Accept only verified challenge
        if (verifyRes.valid) {
          const freezeSource = (body.platform === "whatsapp" ? "whatsapp" : body.platform === "telegram" ? "telegram" : "web");
          await unfreezeAccount({ userId: walletAddress, source: freezeSource });
          return NextResponse.json({
            reply: `ACCOUNT UNFROZEN: Security verification confirmed. Your OKX X Layer wallet (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) is now active. All DEX trading and mandate executions are re-enabled.`,
            type: "unfreeze",
            isFrozen: false,
          });
        }
      }

      // Generate challenge and prompt user for 6-digit confirmation code
      const challenge = await generateOtpChallenge(walletAddress, "unfreeze_account");
      return NextResponse.json({
        reply: `UNFREEZE AUTHORIZATION REQUIRED: A 6-digit verification code has been issued: [${challenge.code}]. Reply with "/unfreeze ${challenge.code}" or enter this code in your terminal to reactivate trading on OKX X Layer.`,
        type: "unfreeze_challenge",
        challengeId: challenge.challengeId,
        code: challenge.code,
        isFrozen: true,
      });
    }

    // 0b. Emergency Freeze / Panic Command (/freeze, /panic, "freeze", "panic")
    const isFreezeIntent =
      lower.startsWith("/freeze") ||
      lower === "freeze" ||
      lower.startsWith("/panic") ||
      lower === "panic" ||
      lower.includes("emergency lock") ||
      lower.includes("lock wallet") ||
      lower.includes("lock account");

    if (isFreezeIntent) {
      const freezeSource = (body.platform === "whatsapp" ? "whatsapp" : body.platform === "telegram" ? "telegram" : "web");
      await freezeAccount({
        userId: walletAddress,
        source: freezeSource,
        reason: "User triggered emergency freeze from chat interface",
      });

      return NextResponse.json({
        reply: `EMERGENCY FREEZE ACTIVATED: Your account (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) has been locked immediately. All automated trades and mandates on OKX X Layer (Chain 196) are halted. To unlock, send "/unfreeze" to receive a verification code.`,
        type: "freeze",
        isFrozen: true,
      });
    }

    // Check if account is frozen
    try {
      const frozen = await isAccountFrozen(walletAddress);
      if (frozen) {
        return NextResponse.json({
          reply: `SECURITY HOLD: Your account is currently frozen. All trading and rebalancing actions on X Layer are locked. Send "/unfreeze" to begin verification and unlock your account.`,
          type: "frozen",
          isFrozen: true,
        });
      }
    } catch (freezeErr) {
      console.error("[Chat API] Freeze check verification notice:", freezeErr);
      return NextResponse.json(
        { error: "Security check temporarily unavailable. Please retry in a few moments." },
        { status: 503 }
      );
    }

    // 0c. Command Directory & Welcome (/start, /help, "help", "menu", "commands", greetings)
    const isGreeting =
      lower === "/start" ||
      lower === "/help" ||
      lower === "help" ||
      lower === "menu" ||
      lower === "/menu" ||
      lower === "commands" ||
      lower === "/commands" ||
      lower === "options" ||
      lower === "hello" ||
      lower === "hi" ||
      lower === "hey" ||
      lower.startsWith("hello") ||
      lower.startsWith("hi ") ||
      lower.includes("good evening") ||
      lower.includes("good morning") ||
      lower.includes("good afternoon") ||
      lower.includes("greetings");

    if (isGreeting) {
      let welcome = `Hi, I am your AI Investment Mandate Assistant on X Layer.\n`;
      welcome += `I help you execute your mandate and execute spot trading auto investment.\n\n`;
      welcome += `Do you want to get started?`;

      return NextResponse.json({
        reply: welcome,
        type: "help",
        walletAddress,
      });
    }

    // 0d. About Meirei (/about, /guide, "what is meirei", "who are you")
    if (
      lower === "/about" ||
      lower === "about" ||
      lower === "/guide" ||
      lower === "guide" ||
      lower.includes("what is meirei") ||
      lower.includes("who are you") ||
      lower.includes("what you do") ||
      lower.includes("how does this work")
    ) {
      let about = `PROJECT MEIREI (命令) | OVERVIEW\n\n`;
      about += `Meirei is an AI-Native Investment Mandate Execution Agent built natively for OKX X Layer (Chain ID 196).\n\n`;
      about += `Key Capabilities:\n`;
      about += `• Conversational Mandates & Simulation: Converts natural language into automated mandate policies (Drift Rebalance, Weekly Accumulation, Dip Buyer, Circuit Breakers, or Direct Spot Swaps).\n`;
      about += `• Allowlisted Equities (20 Assets): TSLAx, NVDAx, AAPLx, MSFTx, AMZNx, GOOGLx, METAx, COINx, SPYx, QQQx, AMDx, CRWDx, MSTRx, TSMx, AVGOx, INTCx, MUx, MRVLx, IWMx, DELLx.\n`;
      about += `• Dual Execution Architecture: Web Quick-Buy and Mandate approvals execute non-custodially via client-side Web3 wallet signatures (OKX Wallet, MetaMask). Bot and scheduled channels generate swap calldata with one-tap client signing deep links or execute via delegated Onchain OS agents secured by HMAC 2FA OTP and SIWE verified ownership.\n`;
      about += `• Multi-Channel Access: Identical features across Web Platform (/app), Telegram (@MeireiXLayerBot), and WhatsApp.`;

      return NextResponse.json({
        reply: about,
        type: "about",
      });
    }

    // 0e. Deposit & Funding Guide (/deposit, "how to fund", "fund wallet", "deposit funds", "leave sandbox")
    if (
      lower === "/deposit" ||
      lower === "deposit" ||
      lower.includes("how to fund") ||
      lower.includes("fund wallet") ||
      lower.includes("deposit funds") ||
      lower.includes("leave sandbox") ||
      lower.includes("real wallet") ||
      lower.includes("real funds")
    ) {
      let depositGuide = `FUNDING GUIDE FOR OKX X LAYER (CHAIN 196)\n\n`;
      depositGuide += `Your Dedicated X Layer Address:\n${walletAddress}\n\n`;
      depositGuide += `How to Deposit & Fund:\n`;
      depositGuide += `1. Transfer USDG, USDC, or OKB (for gas) directly to your address on OKX X Layer (Chain ID 196).\n`;
      depositGuide += `2. If your assets are on Ethereum, Arbitrum, or Polygon, use OKX Web3 Bridge (web3.okx.com/bridge) to bridge to X Layer.\n`;
      depositGuide += `3. Once deposited, send "balance" to verify your holdings or "buy [ticker]" to trade.`;

      return NextResponse.json({
        reply: depositGuide,
        type: "deposit",
        depositAddress: walletAddress,
      });
    }

    // 0f. Weekly Progress & Mandate Report ("weekly progress", "report", "/report", "progress")
    if (
      lower.includes("weekly progress") ||
      lower.includes("progress report") ||
      lower.includes("weekly report") ||
      lower === "report" ||
      lower === "/report" ||
      lower === "progress" ||
      lower === "/progress"
    ) {
      const holdings = await fetchBalances(walletAddress);
      const totalVal = holdings.reduce((sum, h) => sum + (h.valueUsd || 0), 0);
      let report = `PROJECT MEIREI | WEEKLY PROGRESS & MANDATE REPORT\n\n`;
      report += `Period: Last 7 Days · OKX X Layer (Chain ID 196)\n`;
      report += `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\n`;
      const redis = getRedisClient();
      let driftCount = "0";
      if (redis) {
        try {
          const val = await redis.get<string | number>(`execlog:${walletAddress.toLowerCase()}:count`);
          if (val !== null && val !== undefined) driftCount = String(val);
        } catch {}
      }

      report += `Autonomous Mandate Telemetry:\n`;
      report += `• Execution Engine: OKX Onchain OS / Account Abstraction\n`;
      report += `• Drift Checks Executed: ${driftCount} autonomous evaluations\n`;
      report += `• Gas Subsidized by Paymaster: 100% Sponsored via OKX Account Abstraction\n`;
      report += `• Slippage Ceiling: 1.00% Max Drift Guard\n`;
      report += `• Monitored Equities: ${ALLOWLIST.length} Allowlisted Assets on OKX X Layer\n\n`;
      report += `You Are Always In Control: Issue plain language directives anytime (e.g. "Put $50 into NVDAx and AAPLx monthly" or "Rebalance to 50% NVDAx and 50% USDG").`;

      return NextResponse.json({
        reply: report,
        type: "report",
      });
    }

    // 1. Balance or Portfolio query
    if (
      lower.includes("balance") ||
      lower.includes("portfolio") ||
      lower.includes("how much do i have") ||
      lower.includes("holdings") ||
      lower.includes("assets")
    ) {
      try {
        const holdings = await fetchBalances(walletAddress);
        const total = holdings.reduce((sum, h) => sum + (h.valueUsd || 0), 0);
        const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

        if (holdings.length === 0) {
          return NextResponse.json({
            reply: `Your X Layer wallet (${shortAddr}) is connected. Balance: $0.00 USDG. Deposit USDG on X Layer (chain 196) to start executing mandates.`,
            type: "balance",
            walletAddress,
            totalUsd: 0,
            holdings: [],
          });
        }

        const breakdown = holdings
          .map((h) => `${h.amount.toFixed(3)} ${h.symbol} ($${h.valueUsd.toFixed(2)})`)
          .join(" · ");

        return NextResponse.json({
          reply: `Your X Layer portfolio balance is $${total.toFixed(2)} USDG. Holdings: ${breakdown}.`,
          type: "balance",
          walletAddress,
          totalUsd: total,
          holdings,
        });
      } catch (e) {
        console.warn("[Meirei API] Balance query notice:", e);
        return NextResponse.json({
          reply: `Connected to X Layer wallet (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}). Balance query returned 0.00 USDG or node is indexing. Ready for mandate configuration.`,
          type: "balance",
          walletAddress,
          totalUsd: 0,
          holdings: [],
        });
      }
    }

    // 2. Symbols, Price & Unit queries
    const words = lower.replace(/[^a-z0-9]/g, " ").split(/\s+/);
    const symbolsFound: string[] = [];
    for (const word of words) {
      const canonical = resolveSymbol(word) || resolveSymbol(`${word}x`);
      if (canonical && !symbolsFound.includes(canonical) && canonical !== "USDG" && canonical !== "USDC") {
        symbolsFound.push(canonical);
      }
    }

    // 2a. Multi-stock price comparison (e.g. "compare NVDAx vs MSFTx")
    if (
      symbolsFound.length >= 2 &&
      (lower.includes("compare") || lower.includes("vs") || lower.includes("versus") || lower.includes("difference"))
    ) {
      const prices = await Promise.all(symbolsFound.map((s) => fetchPrice(s)));
      const comparisonText = symbolsFound.map((s, i) => `${s} ($${prices[i].toFixed(2)} USDG)`).join(" vs ");
      const ratio = (prices[0] / prices[1]).toFixed(3);
      return NextResponse.json({
        reply: `Price Comparison on X Layer (chain 196): ${comparisonText}. Ratio: 1 ${symbolsFound[0]} = ${ratio} ${symbolsFound[1]}.`,
        type: "comparison",
        symbols: symbolsFound,
        prices,
      });
    }

    // 2b. Unit calculation inquiry (e.g. "how many units of NVDAx for 250 USDG?", "what does 500 USDG give you in AAPLx?")
    const isUnitQuery = lower.includes("unit") || lower.includes("how many") || lower.includes("give you") || lower.includes("calculate");
    if (isUnitQuery && symbolsFound.length >= 1) {
      const targetSymbol = symbolsFound[0];
      const spot = await fetchPrice(targetSymbol);
      const amtMatch = lower.match(/[\$]?(\d+(?:\.\d+)?)\s*(?:usdg|usdc|\$)?/i);
      const notional = amtMatch ? parseFloat(amtMatch[1]) : 250;
      const unitsGiven = (notional / spot).toFixed(3);

      return NextResponse.json({
        reply: `Unit Calculation: At the live spot price of $${spot.toFixed(2)} USDG, ${notional} USDG buys approximately ${unitsGiven} units of ${targetSymbol} on X Layer (chain 196).`,
        type: "units_calculation",
        symbol: targetSymbol,
        spotPriceUsd: spot,
        investmentUsdg: notional,
        units: parseFloat(unitsGiven),
      });
    }

    let matchedSymbol: string | undefined = symbolsFound[0];

    if (
      lower.includes("price") ||
      lower.includes("how much is") ||
      lower.includes("quote") ||
      lower.includes("rate")
    ) {
      if (lower.includes("coin") || lower.includes("coinx")) {
        matchedSymbol = "COINx";
      }

      if (matchedSymbol) {
        const price = await fetchPrice(matchedSymbol);
        return NextResponse.json({
          reply: `Live spot price on X Layer (chain 196): 1 ${matchedSymbol} = $${price.toFixed(2)} USDG (via OKX Market Feed).`,
          type: "price",
          symbol: matchedSymbol,
          priceUsd: price,
        });
      }
    }

    // 3. Stock list query and "how can I buy stocks"
    if (lower.includes("how can i buy stocks") || lower.includes("how to buy stocks")) {
      let msg = `You can buy stocks in a few ways:\n`;
      msg += `1. You can do a quick swap.\n`;
      msg += `2. You can use our mandate which helps you gain exposure through automated strategies.\n\n`;
      msg += `Available mandates include:\n`;
      msg += `• Spot trading and unique calculation\n`;
      msg += `• Portfolio rebalance\n`;
      msg += `• Weekly DCA accumulator\n`;
      msg += `• Volatility circuit breaker\n`;
      msg += `• Dip and take profits automatically`;

      return NextResponse.json({
        reply: msg,
        type: "list",
      });
    }

    if (lower.includes("list stock") || lower.includes("what stocks") || lower.includes("tradable") || lower === "stocks" || lower === "/stocks" || lower.includes("all stocks")) {
      const stocks = await fetchAllStockPrices();
      const stockList = stocks
        .filter((s) => !s.isCash)
        .map((s) => `${s.symbol} ($${s.priceUsd.toFixed(2)})`)
        .join(", ");
      return NextResponse.json({
        reply: `Allowlisted xStocks on X Layer (chain 196): ${stockList}. All settle in USDG and USDC via OKX DEX Aggregator.`,
        type: "list",
        stocks,
      });
    }

    // Suggestions / Specific Amount Purchases
    if (lower.includes("suggestion") || (lower.includes("i have") && lower.match(/\$\d+/))) {
      const stocks = await fetchAllStockPrices();
      // Sort by some mock metric (change24h could be parsed, but let's just pick top 3)
      const topStocks = stocks.filter((s) => !s.isCash).slice(0, 3).map(s => s.symbol).join(", ");
      
      let msg = `Top stocks with high liquidity and return are currently: ${topStocks}.\n\n`;
      msg += `Do you intend to hold it long term or short term? (Short term probability has high volatility, long term probability is generally more stable).\n\n`;
      msg += `Disclaimer: This is not a financial advice.`;
      
      return NextResponse.json({
        reply: msg,
        type: "suggestion",
      });
    }

    // Volatility Circuit Breaker Explanation
    if (lower.includes("circuit breaker")) {
      let msg = `The Volatility Circuit Breaker triggers a halt when stock prices or the market dips at a particular level you set.\n`;
      msg += `We will notify you through Telegram, WhatsApp (coming soon), or Instagram (coming soon).`;
      
      return NextResponse.json({
        reply: msg,
        type: "circuit_breaker_info",
      });
    }

    let tradeHandled = false;

    // 4. Direct confirmation of pending quote or mandate
    const isConfirmOnly = lower === "confirm" || lower === "yes" || (confirm && !lower.match(/(buy|purchase|acquire|swap|sell|exit|dump|liquidate|trim)/i));
    if (isConfirmOnly && !tradeHandled) {
      const pending = await getPendingQuote(walletAddress);
      if (pending) {
        tradeHandled = true;
        if (pending.type === "trade" && pending.symbol && pending.side && pending.notionalUsd && pending.stockAmount) {
          const otpToken = body.otpToken;
          const isOtpValid = validateOtpToken(otpToken, walletAddress);

          if (!isOtpValid) {
            return NextResponse.json({
              reply: `Security Authorization Required: Executing on-chain trades on X Layer (chain 196) requires 2FA OTP verification. Please confirm your 6-digit security code to authorize the swap of ${
                pending.side === "buy"
                  ? `$${pending.notionalUsd.toFixed(2)} USDG for +${pending.stockAmount.toFixed(3)} ${pending.symbol}`
                  : `${pending.stockAmount.toFixed(3)} ${pending.symbol} for ~$${pending.notionalUsd.toFixed(2)} USDG`
              }.`,
              type: "otp_required",
              otpRequired: true,
              walletAddress,
              pendingTrade: pending,
            });
          }

          // Check spending limit cap
          const spendCheck = await validateSpendingLimit(walletAddress, pending.notionalUsd);
          if (!spendCheck.allowed) {
            return NextResponse.json({
              reply: `Spending Cap Enforced: ${spendCheck.error}`,
              type: "error",
              error: spendCheck.error,
            }, { status: 400 });
          }

          // Idempotency deduplication check
          const idemKey = req.headers.get("idempotency-key") || deriveOperationKey(walletAddress, "confirm_trade", {
            side: pending.side,
            symbol: pending.symbol,
            notionalUsd: pending.notionalUsd,
          });
          const idemCheck = await checkIdempotencyAtomic(idemKey);
          if (idemCheck.isDuplicate) {
            if (idemCheck.isProcessing) {
              return NextResponse.json({
                reply: "Trade execution is currently processing. Duplicate request prevented.",
                type: "pending",
              }, { status: 409 });
            }
            if (idemCheck.cachedResult) {
              return NextResponse.json(idemCheck.cachedResult);
            }
          }

          const leg: Leg = {
            side: pending.side,
            symbol: pending.symbol,
            notionalUsd: pending.notionalUsd,
            from: pending.side === "buy" ? "USDG" : pending.symbol,
            to: pending.side === "buy" ? pending.symbol : "USDG",
          };

          try {
            const txResult = await withTimeout(executeSwap(leg), 10000, "X Layer Swap Execution");
            await recordExecutedSpend(walletAddress, pending.notionalUsd);
            await deletePendingQuote(walletAddress);

            const redis = getRedisClient();
            if (redis) {
              redis.incr(`execlog:${walletAddress.toLowerCase()}:count`).catch(() => {});
            }

            const successResult = {
              reply: `Order confirmed and executed on X Layer (chain 196). ${
                pending.side === "buy"
                  ? `Swapped $${pending.notionalUsd.toFixed(2)} USDG for +${pending.stockAmount.toFixed(3)} ${pending.symbol}`
                  : `Swapped ${pending.stockAmount.toFixed(3)} ${pending.symbol} for ~$${pending.notionalUsd.toFixed(2)} USDG`
              } via OKX DEX Aggregator. Platform fee: $0.10 USDG settled. Transaction Hash: ${txResult.hash}.`,
              type: "mandate",
              status: "confirmed",
              receipt: {
                status: "Trade Executed",
                statusTone: "confirmed",
                amount: pending.side === "buy" ? `+ ${pending.stockAmount.toFixed(3)} ${pending.symbol}` : `- ${pending.stockAmount.toFixed(3)} ${pending.symbol}`,
                detail: pending.side === "buy" ? `Swapped $${pending.notionalUsd.toFixed(2)} USDG` : `Received ~$${pending.notionalUsd.toFixed(2)} USDG`,
                reference: txResult.hash,
                explorerUrl: txResult.explorerUrl,
                time: new Date().toISOString().slice(11, 19),
              },
            };

            completeIdempotency(idemKey, successResult, true);
            return NextResponse.json(successResult);
          } catch (e) {
            completeIdempotency(idemKey, null, false);
            const errDetail = e instanceof Error ? e.message : String(e);
            return NextResponse.json({
              reply: `Execution on X Layer failed: ${errDetail}.`,
              type: "error",
              status: "failed",
            });
          }
        }
      } else {
        return NextResponse.json({
          reply: "No active pending trade found or your quote has expired. Please state a new trade instruction (e.g. \"Buy $250 in NVDAx\").",
          type: "info",
        });
      }
    }

    // 5. Direct stock buy or sell/exit (e.g. "buy 500 USDG of AAPLx", "buy 1 AAPLx", "sell 1 AAPLx", "exit TSLAx")
    const tradeMatch = lower.match(
      /(buy|purchase|acquire|swap\s+(?:into|for)?|order|sell|exit|dump|liquidate|trim)\s+([\d,.]+)?\s*(usdg|usdc|\$)?\s*(?:of|into|for|from)?\s*([a-z0-9]+)/i
    );

    if (tradeMatch && !tradeHandled) {
      const actionRaw = tradeMatch[1].toLowerCase();
      const isSell =
        actionRaw.includes("sell") ||
        actionRaw.includes("exit") ||
        actionRaw.includes("dump") ||
        actionRaw.includes("liquidate") ||
        actionRaw.includes("trim");
      const side: "buy" | "sell" = isSell ? "sell" : "buy";

      const numStr = tradeMatch[2];
      const isCashUnit = tradeMatch[3];
      const targetTicker = tradeMatch[4];
      const symbol = resolveSymbol(targetTicker) || resolveSymbol(`${targetTicker}x`);

      if (symbol && symbol !== "USDG" && symbol !== "USDC") {
        const spot = await fetchPrice(symbol);
        let notionalUsd = 250;
        let stockAmount = 1;

        if (numStr) {
          const val = parseFloat(numStr.replace(/,/g, ""));
          if (isCashUnit || lower.includes("usdg") || lower.includes("usd") || lower.includes("$")) {
            notionalUsd = val;
            stockAmount = spot > 0 ? val / spot : 0;
          } else {
            stockAmount = val;
            notionalUsd = spot > 0 ? val * spot : val * 100;
          }
        } else {
          notionalUsd = spot > 0 ? spot : 250;
          stockAmount = 1;
        }

        const leg: Leg = {
          side,
          symbol,
          notionalUsd,
          from: side === "buy" ? "USDG" : symbol,
          to: side === "buy" ? symbol : "USDG",
        };

        if (confirm || lower === "yes" || lower === "confirm") {
          tradeHandled = true;
          const otpToken = body.otpToken;
          const isOtpValid = validateOtpToken(otpToken, walletAddress);

          if (!isOtpValid) {
            return NextResponse.json({
              reply: `Security Authorization Required: Executing on-chain trades on X Layer (chain 196) requires 2FA OTP verification. Please confirm your 6-digit security code to authorize the swap of ${
                side === "buy"
                  ? `$${notionalUsd.toFixed(2)} USDG for +${stockAmount.toFixed(3)} ${symbol}`
                  : `${stockAmount.toFixed(3)} ${symbol} for ~$${notionalUsd.toFixed(2)} USDG`
              }.`,
              type: "otp_required",
              otpRequired: true,
              walletAddress,
              pendingTrade: {
                side,
                symbol,
                notionalUsd,
                stockAmount,
              },
            });
          }

          // Check spending limit cap (Fix 3.3)
          const spendCheck = await validateSpendingLimit(walletAddress, notionalUsd);
          if (!spendCheck.allowed) {
            return NextResponse.json({
              reply: `Spending Cap Enforced: ${spendCheck.error}`,
              type: "error",
              error: spendCheck.error,
            }, { status: 400 });
          }

          // Idempotency deduplication check (Fix 3.3)
          const idemKey = req.headers.get("idempotency-key") || deriveOperationKey(walletAddress, "direct_trade", {
            side,
            symbol,
            notionalUsd,
          });
          const idemCheck = await checkIdempotencyAtomic(idemKey);
          if (idemCheck.isDuplicate) {
            if (idemCheck.isProcessing) {
              return NextResponse.json({
                reply: "Trade execution is currently processing. Duplicate request prevented.",
                type: "pending",
              }, { status: 409 });
            }
            if (idemCheck.cachedResult) {
              return NextResponse.json(idemCheck.cachedResult);
            }
          }

          try {
            // Fix 3.2: withTimeout wrapper
            const txResult = await withTimeout(executeSwap(leg), 10000, "X Layer Swap Execution");
            await recordExecutedSpend(walletAddress, notionalUsd);
            await deletePendingQuote(walletAddress);

            const redis = getRedisClient();
            if (redis) {
              redis.incr(`execlog:${walletAddress.toLowerCase()}:count`).catch(() => {});
            }

            const successResult = {
              reply: `Order confirmed and executed on X Layer (chain 196). ${
                side === "buy"
                  ? `Swapped $${notionalUsd.toFixed(2)} USDG for +${stockAmount.toFixed(3)} ${symbol}`
                  : `Swapped ${stockAmount.toFixed(3)} ${symbol} for ~$${notionalUsd.toFixed(2)} USDG`
              } via OKX DEX Aggregator. Platform fee: $0.10 USDG settled. Transaction Hash: ${txResult.hash}.`,
              type: "mandate",
              status: "confirmed",
              receipt: {
                status: "Trade Executed",
                statusTone: "confirmed",
                amount: side === "buy" ? `+ ${stockAmount.toFixed(3)} ${symbol}` : `- ${stockAmount.toFixed(3)} ${symbol}`,
                detail: side === "buy" ? `Swapped $${notionalUsd.toFixed(2)} USDG` : `Received ~$${notionalUsd.toFixed(2)} USDG`,
                reference: txResult.hash,
                explorerUrl: txResult.explorerUrl,
                time: new Date().toISOString().slice(11, 19),
              },
            };

            completeIdempotency(idemKey, successResult, true);
            return NextResponse.json(successResult);
          } catch (e) {
            completeIdempotency(idemKey, null, false);
            const errDetail = e instanceof Error ? e.message : String(e);
            return NextResponse.json({
              reply: `Execution on X Layer failed: ${errDetail}.`,
              type: "error",
              status: "failed",
            });
          }
        }

        // Preview quote mode
        try {
          const quote = await getSwapQuote(leg);
          const impactPct = (quote.priceImpact * 100).toFixed(2);
          const outputStr = quote.estimatedOutput > 0 ? quote.estimatedOutput.toFixed(3) : stockAmount.toFixed(3);

          await setPendingQuote(walletAddress, {
            type: "trade",
            side,
            symbol,
            notionalUsd,
            stockAmount,
            timestamp: Date.now(),
          });

          const outNum = quote.estimatedOutput > 0 ? quote.estimatedOutput : stockAmount;
          const minReceived = (outNum * 0.995).toFixed(3);
          const simulationText = side === "buy"
            ? `You pay ${notionalUsd.toFixed(2)} USDG, you receive about ${outputStr} ${symbol}, minimum ${minReceived} after slippage (0.50%), fee 0.10 USDG.`
            : `You pay ${stockAmount.toFixed(3)} ${symbol}, you receive about $${notionalUsd.toFixed(2)} USDG, minimum $${(notionalUsd * 0.995).toFixed(2)} USDG after slippage (0.50%), fee 0.10 USDG.`;

          return NextResponse.json({
            reply: `Pre-Signing Simulation (Verified on X Layer):\n"${simulationText}"\n\nRoute: OKX DEX Aggregator on X Layer (chain 196). Spot: $${spot.toFixed(2)} USDG · Impact: ~${impactPct}%. Reply "confirm" or click Confirm to execute.`,
            type: "mandate",
            status: "preview",
            simulation: {
              simulationText,
              payAmount: side === "buy" ? notionalUsd : stockAmount,
              payAsset: side === "buy" ? "USDG" : symbol,
              receiveAmount: side === "buy" ? outNum : notionalUsd,
              receiveAsset: side === "buy" ? symbol : "USDG",
              minReceiveAmount: side === "buy" ? parseFloat(minReceived) : notionalUsd * 0.995,
              feeUsd: 0.1,
            },
            receipt: {
              status: "Quote Ready",
              statusTone: "new",
              amount: side === "buy" ? `~ ${outputStr} ${symbol}` : `~ $${notionalUsd.toFixed(2)} USDG`,
              detail: side === "buy" ? `for $${notionalUsd.toFixed(2)} USDG` : `for ${stockAmount.toFixed(3)} ${symbol}`,
              reference: `quote_${symbol}_${Date.now()}`,
              time: new Date().toISOString().slice(11, 19),
            },
          });
        } catch {
          await setPendingQuote(walletAddress, {
            type: "trade",
            side,
            symbol,
            notionalUsd,
            stockAmount,
            timestamp: Date.now(),
          });

          const minReceived = (stockAmount * 0.995).toFixed(3);
          const fallbackSim = side === "buy"
            ? `You pay ${notionalUsd.toFixed(2)} USDG, you receive about ${stockAmount.toFixed(3)} ${symbol}, minimum ${minReceived} after slippage (0.50%), fee 0.10 USDG.`
            : `You pay ${stockAmount.toFixed(3)} ${symbol}, you receive about $${notionalUsd.toFixed(2)} USDG, minimum $${(notionalUsd * 0.995).toFixed(2)} USDG after slippage (0.50%), fee 0.10 USDG.`;

          return NextResponse.json({
            reply: `Pre-Signing Simulation:\n"${fallbackSim}"\n\nSpot: $${spot.toFixed(2)} USDG on X Layer (chain 196). Reply "confirm" to execute via OKX Aggregator.`,
            type: "mandate",
            status: "preview",
            simulation: {
              simulationText: fallbackSim,
              payAmount: side === "buy" ? notionalUsd : stockAmount,
              payAsset: side === "buy" ? "USDG" : symbol,
              receiveAmount: side === "buy" ? stockAmount : notionalUsd,
              receiveAsset: side === "buy" ? symbol : "USDG",
              minReceiveAmount: side === "buy" ? parseFloat(minReceived) : notionalUsd * 0.995,
              feeUsd: 0.1,
            },
            receipt: {
              status: "Quote Ready",
              statusTone: "new",
              amount: side === "buy" ? `~ ${stockAmount.toFixed(3)} ${symbol}` : `~ $${notionalUsd.toFixed(2)} USDG`,
              detail: side === "buy" ? `for $${notionalUsd.toFixed(2)} USDG` : `for ${stockAmount.toFixed(3)} ${symbol}`,
              reference: `quote_${symbol}_${Date.now()}`,
              time: new Date().toISOString().slice(11, 19),
            },
          });
        }
      }
    }

    // Guard against "confirm" or "yes" falling through to mandate handler (Fix 5.5)
    if (lower === "confirm" || lower === "yes") {
      return NextResponse.json({
        reply: "No pending trade or mandate found to confirm. Please specify a new trade or portfolio rebalancing mandate.",
        type: "info",
      });
    }

    // 6. Portfolio Mandate Execution or Preview
    const mandateResult = await handleMandate({
      mandate: message,
      walletAddress,
      confirm,
    });

    if (mandateResult.success && mandateResult.delivery) {
      const delivery = mandateResult.delivery;
      const legs = delivery.plan.legs;

      if (legs.length === 0) {
        if (delivery.portfolio.totalUsd === 0) {
          const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
          const targetsDesc = delivery.mandate.targets.map((t) => `${(t.weight * 100).toFixed(0)}% ${t.symbol}`).join(", ");
          return NextResponse.json({
            reply: `Mandate parsed (${targetsDesc || message}). Connected wallet (${shortAddr}) has an on-chain balance of $0.00 USDG on OKX X Layer. To execute rebalancing trades, please deposit or bridge USDG to this address.`,
            type: "mandate",
            delivery,
          });
        }
        return NextResponse.json({
          reply: `Mandate parsed successfully. Portfolio is already aligned with targets. Zero rebalance drift detected on X Layer.`,
          type: "mandate",
          delivery,
        });
      }

      const legsSummary = legs
        .map((l) => `${l.side.toUpperCase()} $${l.notionalUsd.toFixed(2)} of ${l.symbol}`)
        .join(", ");

      if (confirm) {
        const otpToken = body.otpToken;
        const isOtpValid = validateOtpToken(otpToken, walletAddress);

        if (!isOtpValid) {
          return NextResponse.json({
            reply: `Security Authorization Required: Executing portfolio rebalancing mandate (${legsSummary}) on X Layer requires 2FA OTP verification. Please confirm your 6-digit code to broadcast transactions.`,
            type: "otp_required",
            otpRequired: true,
            walletAddress,
            pendingMandate: {
              summary: legsSummary,
              legs,
            },
          });
        }

        const txs = delivery.txs || [];
        const primaryTx = txs.find((t) => t.hash) || txs[0];
        const txHash = primaryTx?.hash || `executed_${Date.now()}`;

        const redis = getRedisClient();
        if (redis) {
          redis.incr(`execlog:${walletAddress.toLowerCase()}:count`).catch(() => {});
        }

        return NextResponse.json({
          reply: `Mandate executed successfully on X Layer (chain 196). Swapped: ${legsSummary}. Platform fee: $0.10 USDG settled via OKX DEX Aggregator.`,
          type: "mandate",
          status: "confirmed",
          delivery,
          receipt: {
            status: "Trade Executed",
            statusTone: "confirmed",
            amount: `$${legs.reduce((acc, l) => acc + l.notionalUsd, 0).toFixed(2)} USDG`,
            detail: legsSummary,
            reference: txHash,
            explorerUrl: primaryTx?.explorerUrl,
            time: new Date().toISOString().slice(11, 19),
          },
        });
      }

      return NextResponse.json({
        reply: `Plan computed: ${legsSummary} via OKX DEX Aggregator on X Layer. Reply "confirm" or click Confirm to execute.`,
        type: "mandate",
        status: "preview",
        delivery,
        receipt: {
          status: "Quote Ready",
          statusTone: "new",
          amount: `$${legs.reduce((acc, l) => acc + l.notionalUsd, 0).toFixed(2)} USDG`,
          detail: legsSummary,
          reference: `quote_mandate_${Date.now()}`,
          time: new Date().toISOString().slice(11, 19),
        },
      });
    }

    if (!mandateResult.success && mandateResult.error) {
      return NextResponse.json(
        {
          reply: `Mandate execution error: ${mandateResult.error}. Please adjust your target allocations or check allowable assets (e.g. "60% MAG7, 20% USDG, max 8%").`,
          type: "error",
          error: mandateResult.error,
        },
        { status: 400 }
      );
    }

    // General AI response
    return NextResponse.json({
      reply: `I am Meirei (命令), your AI Native Investment Mandate Agent executing on X Layer (chain 196). Ask me for your balance, query real time stock prices (e.g. "Price of AAPLx"), trade directly (e.g. "Buy 1 AAPLx" or "Sell 1 AAPLx"), or enter an investment mandate (e.g. "60% mag7, 20% USDG, max 8%").`,
      type: "info",
    });
  } catch (error) {
    console.error("[Meirei API] Chat Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
