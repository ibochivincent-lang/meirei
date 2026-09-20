import { Leg, Quote, TxResult, SwapOptions, SwapResult } from "../types";
import { getSwapQuote, executeSwap } from "../onchainos";

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

export function formatQuotes(quotes: Quote[]): string {
  if (!quotes.length) return "  (no quotes)";
  return quotes
    .map((q) => {
      const impactPct = q.priceImpact * 100;
      // OKX reports price improvement as a negative impact.
      const impactText =
        impactPct < 0 ? `${Math.abs(impactPct).toFixed(2)}% (improvement)` : `${impactPct.toFixed(2)}%`;
      return `  Leg ${q.legIndex}: ${q.route} | impact ${impactText} | est. out ${q.estimatedOutput.toFixed(6)}`;
    })
    .join("\n");
}