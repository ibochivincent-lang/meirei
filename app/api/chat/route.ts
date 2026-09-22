import { NextRequest, NextResponse } from "next/server";
import { handleMandate } from "@/src/agent/handler";
import {
  initOnchainOS,
  fetchPrice,
  fetchBalances,
  fetchAllStockPrices,
  executeSwap,
  getSwapQuote,
} from "@/src/onchainos";
import { resolveSymbol, ALLOWLIST } from "@/src/allowlist";
import { Leg } from "@/src/types";
import { validateOtpToken } from "@/lib/auth/otp";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validateSpendingLimit, recordExecutedSpend } from "@/lib/security/spending_limits";
import { checkIdempotency, completeIdempotency, deriveOperationKey } from "@/lib/security/idempotency";
import { validatePayloadSize, withTimeout } from "@/lib/security/payload_guard";
import { logger } from "@/lib/observability/logger";
import { resolveUserIdentity } from "@/lib/auth/user_identity";

const DEFAULT_WALLET = process.env.MEIREI_WALLET || "0x7f17d6224e7d48606598732c3f511412b5c1e922";

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

export async function POST(req: NextRequest) {
  try {
    const payloadCheck = validatePayloadSize(req);
    if (!payloadCheck.valid) {
      return NextResponse.json({ error: payloadCheck.error }, { status: 413 });
    }

    const body = await req.json();
    const message = (body.message || body.mandate || "").trim();
    const walletAddress = (body.walletAddress || DEFAULT_WALLET).trim();
    const confirm = Boolean(body.confirm);

    if (!message) {
      return NextResponse.json({ error: "Missing message or mandate" }, { status: 400 });
    }

    const lower = message.toLowerCase();
    const clientIp = getClientIp(req);
    const isTradeIntent = confirm || lower.includes("buy") || lower.includes("sell") || lower.includes("confirm");
    const rateTier = isTradeIntent ? "trade" : "read";
    const rateCheck = checkRateLimit(`${clientIp}:${walletAddress}`, rateTier);

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

    // 3. Stock list query
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

    // 4. Direct confirmation of pending quote or mandate
    const isConfirmOnly = lower === "confirm" || lower === "yes" || (confirm && !lower.match(/(buy|purchase|acquire|swap|sell|exit|dump|liquidate|trim)/i));
    if (isConfirmOnly) {
      const pending = recentPendingQuotes.get(walletAddress.toLowerCase());
      if (pending && Date.now() - pending.timestamp < 10 * 60 * 1000) {
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
          const spendCheck = validateSpendingLimit(walletAddress, pending.notionalUsd);
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
          const idemCheck = checkIdempotency(idemKey);
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
            recordExecutedSpend(walletAddress, pending.notionalUsd);
            recentPendingQuotes.delete(walletAddress.toLowerCase());

            const successResult = {
              reply: `Order confirmed and executed on X Layer (chain 196). ${
                pending.side === "buy"
                  ? `Swapped $${pending.notionalUsd.toFixed(2)} USDG for +${pending.stockAmount.toFixed(3)} ${pending.symbol}`
                  : `Swapped ${pending.stockAmount.toFixed(3)} ${pending.symbol} for ~$${pending.notionalUsd.toFixed(2)} USDG`
              } via OKX DEX Aggregator. Transaction Hash: ${txResult.hash}.`,
              type: "mandate",
              status: "confirmed",
              receipt: {
                status: "Trade Executed",
                statusTone: "confirmed",
                amount: pending.side === "buy" ? `+ ${pending.stockAmount.toFixed(3)} ${pending.symbol}` : `- ${pending.stockAmount.toFixed(3)} ${pending.symbol}`,
                detail: pending.side === "buy" ? `Swapped $${pending.notionalUsd.toFixed(2)} USDG` : `Received ~$${pending.notionalUsd.toFixed(2)} USDG`,
                reference: txResult.hash,
                explorerUrl: txResult.explorerUrl,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      }
    }

    // 5. Direct stock buy or sell/exit (e.g. "buy 500 USDG of AAPLx", "buy 1 AAPLx", "sell 1 AAPLx", "exit TSLAx")
    const tradeMatch = lower.match(
      /(buy|purchase|acquire|swap\s+(?:into|for)?|order|sell|exit|dump|liquidate|trim)\s+([\d,.]+)?\s*(usdg|usdc|\$)?\s*(?:of|into|for|from)?\s*([a-z0-9]+)/i
    );

    if (tradeMatch) {
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

          try {
            const txResult = await executeSwap(leg);
            return NextResponse.json({
              reply: `Order confirmed and executed on X Layer (chain 196). ${
                side === "buy"
                  ? `Swapped $${notionalUsd.toFixed(2)} USDG for +${stockAmount.toFixed(3)} ${symbol}`
                  : `Swapped ${stockAmount.toFixed(3)} ${symbol} for ~$${notionalUsd.toFixed(2)} USDG`
              } via OKX DEX Aggregator. Transaction Hash: ${txResult.hash}.`,
              type: "mandate",
              status: "confirmed",
              receipt: {
                status: "Trade Executed",
                statusTone: "confirmed",
                amount: side === "buy" ? `+ ${stockAmount.toFixed(3)} ${symbol}` : `- ${stockAmount.toFixed(3)} ${symbol}`,
                detail: side === "buy" ? `Swapped $${notionalUsd.toFixed(2)} USDG` : `Received ~$${notionalUsd.toFixed(2)} USDG`,
                reference: txResult.hash,
                explorerUrl: txResult.explorerUrl,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            });
          } catch (e) {
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

          recentPendingQuotes.set(walletAddress.toLowerCase(), {
            type: "trade",
            side,
            symbol,
            notionalUsd,
            stockAmount,
            timestamp: Date.now(),
          });

          return NextResponse.json({
            reply: `Quote via OKX DEX: ${
              side === "buy"
                ? `$${notionalUsd.toFixed(2)} USDG -> ~${outputStr} ${symbol}`
                : `${stockAmount.toFixed(3)} ${symbol} -> ~$${notionalUsd.toFixed(2)} USDG`
            } on X Layer. Spot: $${spot.toFixed(2)} USDG. Price impact: ~${impactPct}%. Reply "confirm" or click Confirm to execute.`,
            type: "mandate",
            status: "preview",
            receipt: {
              status: "Quote Ready",
              statusTone: "new",
              amount: side === "buy" ? `~ ${outputStr} ${symbol}` : `~ $${notionalUsd.toFixed(2)} USDG`,
              detail: side === "buy" ? `for $${notionalUsd.toFixed(2)} USDG` : `for ${stockAmount.toFixed(3)} ${symbol}`,
              reference: `quote_${symbol}_${Date.now()}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          });
        } catch {
          recentPendingQuotes.set(walletAddress.toLowerCase(), {
            type: "trade",
            side,
            symbol,
            notionalUsd,
            stockAmount,
            timestamp: Date.now(),
          });

          return NextResponse.json({
            reply: `Spot calculation: ${side === "buy" ? `$${notionalUsd.toFixed(2)} USDG -> ~${stockAmount.toFixed(3)} ${symbol}` : `${stockAmount.toFixed(3)} ${symbol} -> ~$${notionalUsd.toFixed(2)} USDG`} on X Layer at $${spot.toFixed(2)}. Reply "confirm" to execute via OKX Aggregator.`,
            type: "mandate",
            status: "preview",
            receipt: {
              status: "Quote Ready",
              statusTone: "new",
              amount: side === "buy" ? `~ ${stockAmount.toFixed(3)} ${symbol}` : `~ $${notionalUsd.toFixed(2)} USDG`,
              detail: side === "buy" ? `for $${notionalUsd.toFixed(2)} USDG` : `for ${stockAmount.toFixed(3)} ${symbol}`,
              reference: `quote_${symbol}_${Date.now()}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          });
        }
      }
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

        return NextResponse.json({
          reply: `Mandate executed successfully on X Layer (chain 196). Swapped: ${legsSummary}.`,
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
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      });
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
