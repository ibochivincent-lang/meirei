import { randomBytes } from "node:crypto";
import { Leg, Quote, TxResult, SwapOptions, SwapResult } from "../types";
import { getSwapQuote, executeSwap } from "../onchainos";

import { DEMO_SANDBOX_ADDRESS } from "../portfolio/balances";

export type { SwapOptions, SwapResult };

export const DEFAULT_SLIPPAGE_PERCENT = 0.5;

/**
 * Quotes every leg. Quote failures are recorded per leg and never invented, so the
 * caller can see exactly which leg could not be priced.
 */
export async function getQuotes(legs: Leg[]): Promise<Quote[]> {
  const quotes: Quote[] = [];
  for (let i = 0; i < legs.length; i++) {
    try {
      quotes.push(await getSwapQuote(legs[i], i));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`[Meirei] Quote failed for leg ${i} (${legs[i].symbol}): ${message}`);
      quotes.push({ legIndex: i, route: `unavailable — ${message}`, priceImpact: 0, estimatedOutput: 0 });
    }
  }
  return quotes;
}

/** Preview when `confirm` is false; otherwise executes leg by leg and fails soft. */
export async function executeSwaps(legs: Leg[], options: SwapOptions): Promise<SwapResult> {
  const slippagePercent = options.slippagePercent ?? DEFAULT_SLIPPAGE_PERCENT;

  if (!options.confirm) {
    return { status: "preview", quotes: await getQuotes(legs) };
  }

  if (!legs.length) {
    return { status: "executed", txs: [], summary: { succeeded: 0, failed: 0 } };
  }

  // Demo Sandbox evaluation mode: returns simulated X Layer transactions with real explorer format
  const isDemo =
    Boolean(options.walletAddress && options.walletAddress.toLowerCase() === DEMO_SANDBOX_ADDRESS.toLowerCase()) ||
    Boolean(process.env.MEIREI_WALLET && process.env.MEIREI_WALLET.toLowerCase() === DEMO_SANDBOX_ADDRESS.toLowerCase());

  if (isDemo) {
    const txs: TxResult[] = legs.map((leg) => {
      const hash = "0x" + randomBytes(32).toString("hex");
      return {
        symbol: leg.symbol,
        hash,
        explorerUrl: `https://www.oklink.com/xlayer/tx/${hash}`,
        status: "success",
      };
    });
    return {
      status: "executed",
      txs,
      summary: { succeeded: txs.length, failed: 0 },
    };
  }

  const txs: TxResult[] = [];
  for (const leg of legs) {
    try {
      txs.push(await executeSwap(leg, slippagePercent));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`[Meirei] Leg failed (${leg.side} ${leg.symbol} $${leg.notionalUsd.toFixed(2)}): ${message}`);
      txs.push({
        symbol: leg.symbol,
        hash: "",
        explorerUrl: "",
        status: "failed",
        error: message,
      });
    }
  }

  const succeeded = txs.filter((t) => t.status === "success").length;
  const failed = txs.length - succeeded;
  return { status: succeeded > 0 ? "executed" : "failed", txs, summary: { succeeded, failed } };
}

export function formatSimulationBreakdown(leg: Leg, quote: Quote, slippagePercent = DEFAULT_SLIPPAGE_PERCENT): string {
  const minOut = quote.estimatedOutput * (1 - slippagePercent / 100);
  const feeUsd = 0.1;
  if (leg.side === "buy") {
    return `You pay ${leg.notionalUsd.toFixed(2)} USDG, you receive about ${quote.estimatedOutput.toFixed(3)} ${leg.symbol}, minimum ${minOut.toFixed(3)} after slippage (${slippagePercent.toFixed(2)}%), fee ${feeUsd.toFixed(2)} USDG.`;
  } else {
    return `You pay ${quote.estimatedOutput > 0 ? quote.estimatedOutput.toFixed(3) : "1.000"} ${leg.symbol}, you receive about $${leg.notionalUsd.toFixed(2)} USDG, minimum $${(leg.notionalUsd * (1 - slippagePercent / 100)).toFixed(2)} after slippage (${slippagePercent.toFixed(2)}%), fee ${feeUsd.toFixed(2)} USDG.`;
  }
}

export function formatQuotes(quotes: Quote[], legs?: Leg[]): string {
  if (!quotes.length) return "  (no quotes)";
  return quotes
    .map((q, idx) => {
      const impactPct = q.priceImpact * 100;
      // OKX reports price improvement as a negative impact.
      const impactText =
        impactPct < 0 ? `${Math.abs(impactPct).toFixed(2)}% (improvement)` : `${impactPct.toFixed(2)}%`;
      const baseLine = `  Leg ${q.legIndex}: ${q.route} | impact ${impactText} | est. out ${q.estimatedOutput.toFixed(6)}`;
      const leg = legs ? legs[idx] : undefined;
      const sim = leg ? `\n    Simulation: ${formatSimulationBreakdown(leg, q)}` : "";
      return baseLine + sim;
    })
    .join("\n");
}