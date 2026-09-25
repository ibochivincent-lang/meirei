import { z } from "zod";
import { Mandate, Target, CashSymbol } from "../types";
import { MAG7_SYMBOLS, CASH_SYMBOLS, isCashSymbol, resolveSymbol, suggestSymbol, validateSymbols } from "../allowlist";
import { TEMPLATES as TEMPLATE_MAP } from "./templates";

export { TEMPLATES, listTemplates, getTemplate } from "./templates";

/** Applied to sleeve-style mandates (mag7 / equal weight) when no `max N%` is given. */
export const DEFAULT_MAX_SINGLE = 0.25;
export const DEFAULT_CASH_WEIGHT = 0.2;
export const DEFAULT_REBALANCE_BAND = 0.03;
export const DEFAULT_MAG7_SLEEVE = 0.6;

const MandateSchema = z.object({
  targets: z.array(z.object({ symbol: z.string().min(1), weight: z.number().min(0).max(1) })).min(1),
  cashSymbol: z.enum(["USDG", "USDC"]),
  maxSingle: z.number().min(0).max(1),
  rebalanceBand: z.number().min(0).max(1),
});

/** Words that sit next to a percentage but are not tickers. */
const NON_TICKER_WORDS = new Set([
  "mag", "mag7", "magnificent", "xstocks", "xstock", "stocks", "stock", "cash", "stable",
  "stablecoin", "rest", "remainder", "remaining", "leftover", "balance", "max", "maximum",
  "band", "drift", "threshold", "single", "name", "names", "weight", "weights", "equal",
  "portfolio", "mandate", "rebalance", "weekly", "monthly", "daily", "usdg", "usdc", "usdt0",
  "percent", "and", "or", "the", "of", "to", "in", "with", "keep", "hold", "buy", "sell",
  "invest", "allocate", "target", "targets", "into", "my", "wallet", "layer", "chain", "pct",
]);

/**
 * Words that mean "percent" when they follow a number: "30 percent nvdax".
 * Terminal quirk: a literal `%` never survives cmd.exe argument passing.
 */
const PERCENT_WORDS = "(?:percent|pct|pc|percentage)";

/**
 * Natural language -> Mandate.
 *
 * Rules (also documented in docs/architecture.md):
 *  1. `max N%` sets maxSingle. Without it, sleeve mandates use DEFAULT_MAX_SINGLE and
 *     explicit-weight mandates use their largest stated weight (so intent is honoured).
 *  2. `band|drift|threshold N%` sets rebalanceBand (default 0.03).
 *  3. `mag7` => equal weight across MAG7_SYMBOLS; `equal weight` => equal weight across the
 *     allowlisted symbols named in the mandate.
 *  4. Otherwise every explicit `SYMBOL n%` / `n% SYMBOL` pair becomes a target.
 *  5. The cash sleeve absorbs everything left over; when a single-name cap binds, the excess
 *     also goes to cash (never silently redistributed into other names).
 *  6. Unknown symbols are rejected with a "did you mean" suggestion.
 */
export function parseMandate(input: string): Mandate {
  if (!input || !input.trim()) {
    throw new Error('Mandate is empty. Example: "60% mag7, 20% USDG, max 8%"');
  }

  const text = collapse(input);
  const lower = text.toLowerCase();

  const explicitMax = extractMaxSingle(lower);
  const rebalanceBand = extractRebalanceBand(lower) ?? DEFAULT_REBALANCE_BAND;

  const cashSymbol = detectCashSymbol(lower) ?? "USDG";
  const restKeyword = /\b(rest|remainder|remaining|leftover|balance)\b/.test(lower);

  // Remove control phrases so their percentages are not read as ticker weights.
  const workingText = stripControlPhrases(text);
  const explicit = parseExplicitTargets(workingText);

  const explicitCash = sum(explicit.filter((t) => isCashSymbol(t.symbol)));
  const explicitEquities = explicit.filter((t) => !isCashSymbol(t.symbol));

  const sleeve = detectSleeve(lower);
  let equities: Target[];
  let cashWeight: number;

  if (sleeve === "mag7") {
    const sleeveWeight = extractSleevePercent(lower) ?? (explicitCash > 0 ? Math.max(0, 1 - explicitCash) : DEFAULT_MAG7_SLEEVE);
    const perName = sleeveWeight / MAG7_SYMBOLS.length;
    equities = MAG7_SYMBOLS.map((symbol) => ({ symbol, weight: perName }));
    cashWeight = explicitCash > 0 ? explicitCash : Math.max(0, 1 - sleeveWeight);
  } else if (sleeve === "equal") {
    const named = detectNamedEquities(text);
    if (!named.length) {
      throw new Error('Equal-weight mandate names no allowlisted symbols. Example: "equal weight AAPLx NVDAx TSLAx, rest USDG"');
    }
    const sleeveWeight = explicitCash > 0 ? Math.max(0, 1 - explicitCash) : 1 - DEFAULT_CASH_WEIGHT;
    const perName = sleeveWeight / named.length;
    equities = named.map((t) => ({ symbol: t.symbol, weight: perName }));
    cashWeight = explicitCash > 0 ? explicitCash : 1 - sleeveWeight;
  } else if (explicitEquities.length) {
    equities = explicitEquities;
    const equitySum = sum(equities);
    cashWeight = explicitCash > 0 ? explicitCash : Math.max(0, 1 - equitySum);
    if (explicitCash > 0 && equitySum + explicitCash > 1 + 1e-9) {
      // Honour the stated cash weight; scale the equities down proportionally.
      const scale = Math.max(0, 1 - explicitCash) / equitySum;
      for (const t of equities) t.weight *= scale;
    }
  } else if (explicitCash > 0) {
    equities = [];
    cashWeight = explicitCash;
  } else {
    throw new Error(
      `Could not find an allowlisted symbol in "${input}". Try a template (${Object.keys(TEMPLATE_MAP).join(", ")}) ` +
        `or name assets explicitly, e.g. "60% AAPLx, 40% USDG".`
    );
  }

  // Any leftover (rounding or an unspoken remainder) goes to cash.
  const residual = 1 - (sum(equities) + cashWeight);
  if (residual > 1e-9 || restKeyword) {
    cashWeight += Math.max(0, residual);
  }

  const maxSingle =
    explicitMax ?? (explicitEquities.length ? Math.max(...explicitEquities.map((t) => t.weight)) : DEFAULT_MAX_SINGLE);

  const targets: Target[] = [...equities, { symbol: cashSymbol, weight: cashWeight }];
  const mandate: Mandate = { targets, cashSymbol, maxSingle, rebalanceBand };

  applyCap(targets, cashSymbol, maxSingle);
  roundWeights(mandate);
  validate(mandate);
  return mandate;
}

/** Caps single names and lets the cash sleeve absorb the difference, so weights always total 1.0. */
export function applyCap(targets: Target[], cashSymbol: CashSymbol, maxSingle: number): Target[] {
  const cloned = targets.map((t) => ({ ...t }));
  const equities = cloned.filter((t) => !isCashSymbol(t.symbol));
  const cashTargets = cloned.filter((t) => isCashSymbol(t.symbol));

  let invested = 0;
  for (const t of equities) {
    if (t.weight > maxSingle) t.weight = maxSingle;
    invested += t.weight;
  }

  const targetCash = Math.max(0, 1 - invested);
  const cashTotal = sum(cashTargets);

  if (!cashTargets.length) {
    cloned.push({ symbol: cashSymbol, weight: targetCash });
  } else if (cashTotal > 1e-9) {
    const k = targetCash / cashTotal;
    for (const t of cashTargets) t.weight *= k;
  } else {
    cashTargets[0].weight = targetCash;
  }

  // Update target array elements in place with cloned objects to support array-mutating callers without mutating original object refs
  targets.length = 0;
  for (const item of cloned) {
    targets.push(item);
  }
  return cloned;
}

function validate(mandate: Mandate): void {
  const shape = MandateSchema.safeParse(mandate);
  if (!shape.success) {
    throw new Error(`Invalid mandate: ${shape.error.errors.map((e) => e.message).join(", ")}`);
  }

  const { invalid } = validateSymbols(mandate.targets.map((t) => t.symbol));
  if (invalid.length) {
    throw new Error(
      invalid
        .map((s) => {
          const hint = suggestSymbol(s);
          return `Unknown symbol "${s}"${hint ? ` — did you mean ${hint}?` : ""}`;
        })
        .join("; ")
    );
  }

  if (!isCashSymbol(mandate.cashSymbol)) {
    throw new Error(`Cash symbol "${mandate.cashSymbol}" is not an allowlisted stablecoin (${CASH_SYMBOLS.join(", ")}).`);
  }

  const total = sum(mandate.targets);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`Weights must sum to 100%, got ${(total * 100).toFixed(2)}%`);
  }

  for (const t of mandate.targets) {
    if (isCashSymbol(t.symbol)) continue;
    if (t.weight > mandate.maxSingle + 1e-9) {
      throw new Error(
        `${t.symbol} weight ${(t.weight * 100).toFixed(2)}% exceeds max single ${(mandate.maxSingle * 100).toFixed(2)}%`
      );
    }
  }
}

function collapse(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Keeps JSON output clean (0.43999999999999995 -> 0.44), then normalizes the largest weight. */
function roundWeights(mandate: Mandate): void {
  for (const t of mandate.targets) {
    t.weight = Math.round(t.weight * 1e10) / 1e10;
  }
  const drift = 1 - mandate.targets.reduce((s, t) => s + t.weight, 0);
  if (Math.abs(drift) > 0) {
    const largest = [...mandate.targets].sort((a, b) => b.weight - a.weight)[0];
    if (largest) largest.weight += drift;
  }
}

function sum(targets: Target[]): number {
  return targets.reduce((s, t) => s + t.weight, 0);
}

function stripControlPhrases(text: string): string {
  const num = `\\d+(?:\\.\\d+)?\\s*(?:%|\\b${PERCENT_WORDS}\\b)?`;
  return text
    .replace(new RegExp(`\\bmax(?:imum)?\\s*${num}`, "gi"), " ")
    .replace(new RegExp(`\\b${num}\\s*max(?:imum)?\\b`, "gi"), " ")
    .replace(new RegExp(`\\b(?:band|drift|threshold)\\s*${num}`, "gi"), " ");
}

function extractMaxSingle(lower: string): number | undefined {
  const num = `(\\d+(?:\\.\\d+)?)\\s*(?:%|\\b${PERCENT_WORDS}\\b)?`;
  const m = lower.match(new RegExp(`\\bmax(?:imum)?\\s*${num}`)) ?? lower.match(new RegExp(`${num}\\s*max(?:imum)?\\b`));
  if (!m) return undefined;
  const pct = Number(m[1]);
  return Number.isFinite(pct) ? clamp01(pct / 100) : undefined;
}

function extractRebalanceBand(lower: string): number | undefined {
  const m = lower.match(new RegExp(`\\b(?:band|drift|threshold)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:%|\\b${PERCENT_WORDS}\\b)?`));
  if (!m) return undefined;
  const pct = Number(m[1]);
  return Number.isFinite(pct) ? clamp01(pct / 100) : undefined;
}

function detectCashSymbol(lower: string): CashSymbol | undefined {
  if (/\busdg\b/.test(lower)) return "USDG";
  if (/\busdc\b/.test(lower)) return "USDC";
  return undefined;
}

function detectSleeve(lower: string): "mag7" | "equal" | null {
  if (/\bmag\s*7\b/.test(lower) || /\bmagnificent\s*7\b/.test(lower)) return "mag7";
  if (/equal[\s-]?weight/.test(lower)) return "equal";
  return null;
}

function extractSleevePercent(lower: string): number | undefined {
  const keywords = "(?:mag\\s*7|magnificent\\s*7|equal[\\s-]?weight|stocks?)";
  const num = `(\\d+(?:\\.\\d+)?)\\s*(?:%|\\b${PERCENT_WORDS}\\b)?`;
  const before = lower.match(new RegExp(`${num}\\s*${keywords}`));
  const after = lower.match(new RegExp(`${keywords}\\s*${num}`));
  const m = before ?? after;
  if (!m) return undefined;
  const pct = Number(m[1]);
  return Number.isFinite(pct) ? clamp01(pct / 100) : undefined;
}

/** Allowlisted equity symbols named in the text (bare, no percentage). */
function detectNamedEquities(text: string): Target[] {
  const out: Target[] = [];
  const seen = new Set<string>();
  for (const token of tokenize(text)) {
    const canonical = resolveSymbol(token);
    if (!canonical || isCashSymbol(canonical) || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push({ symbol: canonical, weight: 0 });
  }
  return out;
}

function tokenize(text: string): string[] {
  return Array.from(text.matchAll(/[A-Za-z][A-Za-z0-9]{1,9}/g), (m) => m[0]);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Explicit `SYMBOL n%` and `n% SYMBOL` pairs. Unknown tickers are collected and thrown,
 * so a typo can never silently produce an all-cash portfolio.
 */
function parseExplicitTargets(text: string): Target[] {
  const out: Target[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  const consider = (symbolRaw: string, pctRaw: string, hasPercent: boolean) => {
    const word = symbolRaw.toLowerCase();
    if (NON_TICKER_WORDS.has(word)) return;
    // A bare number followed by a word (no % anywhere) is prose, not an allocation.
    if (!hasPercent && !resolveSymbol(symbolRaw)) return;
    const pct = Number(pctRaw);
    if (!Number.isFinite(pct) || pct <= 0) return;

    const canonical = resolveSymbol(symbolRaw);
    if (!canonical) {
      if (!unknown.includes(symbolRaw)) unknown.push(symbolRaw);
      return;
    }
    if (seen.has(canonical)) return;
    seen.add(canonical);
    out.push({ symbol: canonical, weight: clamp01(pct / 100) });
  };

  const num = `(\\d+(?:\\.\\d+)?)\\s*(%|\\b${PERCENT_WORDS}\\b)?`;
  const sym = `([A-Za-z][A-Za-z0-9]{1,9})`;

  // symbol-then-percentage:  "AAPLx 12%", "AAPLx: 12%", "AAPLx 12 percent"
  for (const m of text.matchAll(new RegExp(`${sym}\\s*[:=]?\\s*${num}`, "g"))) {
    consider(m[1], m[2], m[3] !== undefined);
  }
  // percentage-then-symbol:  "12% AAPLx", "12 percent AAPLx"
  for (const m of text.matchAll(new RegExp(`${num}\\s*${sym}`, "g"))) {
    consider(m[3], m[1], m[2] !== undefined);
  }
  // percentage-then-symbol without a % sign on the second token: "40 USDG" is NOT matched
  // (too ambiguous with prose) unless a % appears somewhere in the pair.

  if (unknown.length) {
    throw new Error(
      unknown
        .map((s) => {
          const hint = suggestSymbol(s);
          return `Unknown symbol "${s}"${hint ? ` — did you mean ${hint}?` : ""}`;
        })
        .join("; ")
    );
  }

  if (out.length) {
    const stated = sum(out);
    if (stated > 1 + 1e-9) {
      // Weights that overshoot are scaled down proportionally (e.g. 30% + 20% + 50% cash = 100%).
      const scale = 1 / stated;
      for (const t of out) t.weight *= scale;
    }
  }

  return out;
}
