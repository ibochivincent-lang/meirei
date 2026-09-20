import { Mandate, Target } from "../types";
import { MAG7_SYMBOLS, isCashSymbol } from "../allowlist";

/**
 * Every template is a valid Mandate: weights sum to 1.0 and no equity name
 * exceeds its own `maxSingle`. `src/mandate/parse.test.ts` asserts this.
 */

function mag7Sleeve(perName: number): Target[] {
  return MAG7_SYMBOLS.map((symbol) => ({ symbol, weight: perName }));
}

function sum(targets: Target[]): number {
  return targets.reduce((s, t) => s + t.weight, 0);
}

function make(targets: Target[], cashSymbol: Mandate["cashSymbol"], maxSingle: number, rebalanceBand = 0.03): Mandate {
  const mandate: Mandate = { targets, cashSymbol, maxSingle, rebalanceBand };
  const total = sum(targets);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`Template weights must sum to 1.0, got ${total.toFixed(4)}`);
  }
  for (const t of targets) {
    // Cash sleeves (USDG, USDC) are exempt from the single-name cap.
    if (isCashSymbol(t.symbol)) continue;
    if (t.weight > maxSingle + 1e-9) {
      throw new Error(`Template ${t.symbol} weight ${t.weight} exceeds maxSingle ${maxSingle}`);
    }
  }
  return mandate;
}

/** 56% Mag7 (8% each, capped) + 44% USDG. */
const mag7 = make([...mag7Sleeve(0.08), { symbol: "USDG", weight: 0.44 }], "USDG", 0.08);

/** ~58/42 split across Mag7 and two stablecoins. */
const balanced = make(
  [...mag7Sleeve(0.06), { symbol: "USDG", weight: 0.38 }, { symbol: "USDC", weight: 0.2 }],
  "USDG",
  0.1
);

/** Concentrated AI basket: NVDAx / MSFTx / GOOGLx + 60% USDG. */
const ai = make(
  [
    { symbol: "NVDAx", weight: 0.15 },
    { symbol: "MSFTx", weight: 0.15 },
    { symbol: "GOOGLx", weight: 0.1 },
    { symbol: "USDG", weight: 0.6 },
  ],
  "USDG",
  0.15
);

/** Defensive: 28% Mag7 (4% each) + 72% USDG. */
const conservative = make([...mag7Sleeve(0.04), { symbol: "USDG", weight: 0.72 }], "USDG", 0.05);

export const TEMPLATES: Record<string, Mandate> = { mag7, balanced, ai, conservative };

export function listTemplates(): string[] {
  return Object.keys(TEMPLATES);
}

export function getTemplate(name: string): Mandate | undefined {
  const key = (name ?? "").trim().toLowerCase();
  const hit = TEMPLATES[key];
  return hit ? { ...hit, targets: hit.targets.map((t) => ({ ...t })) } : undefined;
}