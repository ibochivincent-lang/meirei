import { Mandate, Holding, Leg, RebalancePlan } from "../types";
import { isCashSymbol } from "../allowlist";

/** Minimum notional for a leg to be worth executing. */
export const MIN_LEG_USD = 1;

/**
 * Drift engine: target weights vs current holdings -> buy/sell legs in USD notional.
 * Pure: no I/O. Cash absorbs the residual.
 */
export function planRebalance(mandate: Mandate, holdings: Holding[]): RebalancePlan {
  const totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);
  const current = currentWeights(holdings, totalUsd);
  const warnings: string[] = [];

  const legs: Leg[] = [];
  const cashHoldings = holdings.filter((h) => isCashSymbol(h.symbol));
  const cashUsd = cashHoldings.reduce((s, h) => s + h.valueUsd, 0);

  // Buys are paid from the cash we actually hold (preferring the mandate's cash symbol).
  const fundingSymbol = mandate.cashSymbol;
  const primaryCashHeld = cashHoldings
    .filter((h) => h.symbol === mandate.cashSymbol)
    .reduce((s, h) => s + h.valueUsd, 0);
  const fallbackCash = cashHoldings
    .filter((h) => h.symbol !== mandate.cashSymbol)
    .sort((a, b) => b.valueUsd - a.valueUsd)[0];
  const fundingCash = primaryCashHeld > 0 || !fallbackCash ? fundingSymbol : fallbackCash.symbol;
  if (fundingCash !== fundingSymbol) {
    warnings.push(
      `No ${fundingSymbol} held — buys will be funded from ${fundingCash} instead.`
    );
  }

  for (const t of mandate.targets) {
    // The funding cash sleeve is the residual: spending it never becomes a swap leg
    // (a "USDG  USDG" leg would be nonsense).
    if (t.symbol === mandate.cashSymbol) continue;

    const currentWeight = current[t.symbol] ?? 0;
    const drift = t.weight - currentWeight;

    // Dead-band: skip drift smaller than the rebalance band.
    if (Math.abs(drift) < mandate.rebalanceBand) continue;

    const notionalUsd = Math.abs(drift) * totalUsd;
    if (notionalUsd < MIN_LEG_USD) continue;

    if (drift > 0) {
      legs.push({ side: "buy", symbol: t.symbol, notionalUsd, from: fundingCash, to: t.symbol });
    } else {
      legs.push({ side: "sell", symbol: t.symbol, notionalUsd, from: t.symbol, to: fundingCash });
    }
  }

  // Exit anything the mandate doesn't mention (and that isn't cash).
  // A rebalance means the target weight of an unlisted asset is zero.
  const targetSymbols = new Set(mandate.targets.map((t) => t.symbol));
  for (const h of holdings) {
    if (targetSymbols.has(h.symbol) || isCashSymbol(h.symbol)) continue;
    if (h.valueUsd < MIN_LEG_USD) continue;
    legs.push({ side: "sell", symbol: h.symbol, notionalUsd: h.valueUsd, from: h.symbol, to: fundingCash });
  }

  // Buys can only spend what is actually held (sells settle first).
  // NOTE: a mandate target's buy notional is expressed against totalUsd, but it is
  // funded from cash + sell proceeds. Anything the mandate doesn't mention becomes
  // a full exit sell below, so `availableUsd` covers those proceeds.
  // Scale buys down when execution would require more spend than is available.
  // Conservation: buys − (cash + sells) = −cashHeld ≤ 0, so a valid plan is
  // always fundable as long as sells execute before buys. Order the legs
  // accordingly — execution order is part of the plan.
  const legsOrdered = [
    ...legs.filter((l) => l.side === "sell"),
    ...legs.filter((l) => l.side === "buy"),
  ];

  const sellUsd = legsOrdered.filter((l) => l.side === "sell").reduce((s, l) => s + l.notionalUsd, 0);
  const buyUsd = legsOrdered.filter((l) => l.side === "buy").reduce((s, l) => s + l.notionalUsd, 0);

  // Sells settle into cash first, so proceeds count towards funding the buys.
  const availableUsd = cashUsd + sellUsd;
  let funded = true;

  if (buyUsd > availableUsd + MIN_LEG_USD) {
    // Defensive: unreachable for valid plans (see the invariant above), but kept
    // so a corrupt or partial input can never produce an unexecutable plan.
    funded = false;
    const scale = availableUsd > 0 ? availableUsd / buyUsd : 0;
    warnings.push(
      `Insufficient cash: need $${buyUsd.toFixed(2)}, have $${availableUsd.toFixed(2)} ` +
        `(cash $${cashUsd.toFixed(2)} + sells $${sellUsd.toFixed(2)}). Buy legs scaled to ${(scale * 100).toFixed(1)}%.`
    );
    if (scale <= 0) {
      warnings.push("No cash available — no buy legs will be executed. Fund the wallet on X Layer first.");
    }
    for (const leg of legsOrdered) {
      if (leg.side === "buy") leg.notionalUsd = Number((leg.notionalUsd * scale).toFixed(2));
    }
  } else if (buyUsd > cashUsd + MIN_LEG_USD && sellUsd > 0) {
    warnings.push(
      `Buys ($${buyUsd.toFixed(2)}) exceed cash on hand ($${cashUsd.toFixed(2)}) — ` +
        `sells are ordered first so their $${sellUsd.toFixed(2)} of proceeds covers the buys.`
    );
  }

  const legs2 = legsOrdered.filter((l) => l.notionalUsd >= MIN_LEG_USD || l.side === "sell");
  const buyUsd2 = legs2.filter((l) => l.side === "buy").reduce((s, l) => s + l.notionalUsd, 0);

  if (!holdings.length) {
    funded = false;
    warnings.push("Wallet holds nothing on X Layer — every target becomes a buy once funded.");
  }

  return {
    legs: legs2,
    totalUsd,
    cashSymbol: mandate.cashSymbol,
    cashUsd,
    buyUsd: buyUsd2,
    sellUsd,
    funded,
    warnings,
  };
}

/** Backwards-compatible leg-only helper. */
export function computeDiff(mandate: Mandate, holdings: Holding[]): Leg[] {
  return planRebalance(mandate, holdings).legs;
}

export function currentWeights(holdings: Holding[], totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0)): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of holdings) out[h.symbol] = totalUsd > 0 ? h.valueUsd / totalUsd : 0;
  return out;
}

export function formatPlan(mandate: Mandate, holdings: Holding[], plan: RebalancePlan): string {
  const current = currentWeights(holdings, plan.totalUsd);

  let out = "Meirei · X Layer (196) · OKX AI ASP\n\nMandate\n";
  out += `  ${mandate.targets.map((t) => `${t.symbol} ${(t.weight * 100).toFixed(1)}%`).join("  ·  ")}\n\n`;
  out += `Constraints\n  max single name ${(mandate.maxSingle * 100).toFixed(1)}%  ·  rebalance band ${(mandate.rebalanceBand * 100).toFixed(1)}%\n`;
  out += `\nTargets\n`;
  for (const t of mandate.targets) {
    const cw = (current[t.symbol] ?? 0) * 100;
    const drift = (t.weight - (current[t.symbol] ?? 0)) * 100;
    out += `  ${t.symbol.padEnd(8)} ${(t.weight * 100).toFixed(1).padStart(6)}%   now ${cw.toFixed(1).padStart(6)}%   drift ${drift >= 0 ? "+" : ""}${drift.toFixed(1)}%\n`;
  }

  out += `\nCurrent portfolio   $${plan.totalUsd.toFixed(2)}   (cash $${plan.cashUsd.toFixed(2)} in ${plan.cashSymbol})\n`;
  if (!holdings.length) out += "  (empty)\n";
  else
    for (const h of holdings) {
      const pct = plan.totalUsd > 0 ? ((h.valueUsd / plan.totalUsd) * 100).toFixed(2) : "0.00";
      out += `  ${h.symbol.padEnd(8)} $${h.valueUsd.toFixed(2).padStart(10)}  ${pct.padStart(6)}%\n`;
    }

  out += "\n";
  if (!plan.legs.length) out += "No trades needed (within rebalance band).\n";
  else {
    out += `Proposed trades   buys $${plan.buyUsd.toFixed(2)} · sells $${plan.sellUsd.toFixed(2)}\n`;
    for (const l of plan.legs) {
      out += `  ${l.side.toUpperCase().padEnd(5)} ${l.symbol.padEnd(8)} $${l.notionalUsd.toFixed(2).padStart(10)}   from ${l.from}\n`;
    }
  }

  for (const w of plan.warnings) out += `\nWARNING  ${w}\n`;
  return out + "\n";
}