import { Mandate, Delivery, FeeReceipt, AgentInput, AgentOutput, TxResult, Holding } from "../types";
import { parseMandate } from "../mandate/parse";
import { fetchBalances, calculateTotalValue } from "../portfolio/balances";
import { planRebalance } from "../portfolio/diff";
import { executeSwaps } from "../execution/swap";
import { chargeFee, formatFeeReceipt, SERVICE_NAME } from "../fee/charge";
import { getOnchainOSConfig } from "../onchainos";

/**
 * A2A entrypoint: mandate string + wallet in, full `Delivery` envelope out.
 * Fail-soft per leg, but a run with zero successful swaps is reported as a failure.
 */
export async function handleMandate(input: AgentInput): Promise<AgentOutput> {
  try {
    const cfg = getOnchainOSConfig();
    console.log(`[Meirei] Mandate: "${input.mandate}"`);
    console.log(`[Meirei] Chain: ${cfg.chain.name} (${cfg.chain.id})${cfg.mock ? " [MOCK]" : ""}`);

    const mandate = parseMandate(input.mandate);
    const holdings = await fetchBalances(input.walletAddress);
    const total = calculateTotalValue(holdings);
    console.log(`[Meirei] Portfolio: $${total.toFixed(2)} across ${holdings.length} asset(s)`);

    const plan = planRebalance(mandate, holdings);
    console.log(`[Meirei] ${plan.legs.length} leg(s) — buys $${plan.buyUsd.toFixed(2)}, sells $${plan.sellUsd.toFixed(2)}`);
    for (const w of plan.warnings) console.warn(`[Meirei] WARNING ${w}`);

    const swap = await executeSwaps(plan.legs, {
      confirm: input.confirm ?? false,
      slippagePercent: input.slippagePercent,
      walletAddress: input.walletAddress,
    });

    if (swap.status === "preview") {
      return {
        success: true,
        delivery: {
          service: SERVICE_NAME,
          chain: cfg.chain.id,
          mandate,
          plan: { mandate, holdings, legs: plan.legs, quotes: swap.quotes },
          txs: [],
          portfolio: { holdings, totalUsd: total },
          fee: pendingFee("Preview only — nothing was broadcast."),
          timestamp: Date.now(),
          warnings: plan.warnings,
        },
      };
    }

    const txs: TxResult[] = swap.txs ?? [];
    const summary = swap.summary ?? { succeeded: 0, failed: 0 };

    if (summary.succeeded === 0) {
      const reasons = txs.map((t) => `${t.symbol}: ${t.error ?? "failed"}`).join(" | ");
      return {
        success: false,
        error: `No legs executed (${summary.failed} failed). ${reasons}`,
        delivery: buildDelivery(cfg.chain.id, mandate, holdings, total, plan, txs, pendingFee("Delivery failed."), plan.warnings),
      };
    }

    // Re-read the chain so the report reflects reality, not the plan.
    const updated = await fetchBalances(input.walletAddress);
    const updatedTotal = calculateTotalValue(updated);
    const base: Delivery = buildDelivery(
      cfg.chain.id,
      mandate,
      holdings,
      total,
      { ...plan, legs: plan.legs },
      txs,
      pendingFee("Calculating…"),
      plan.warnings
    );
    base.portfolio = { holdings: updated, totalUsd: updatedTotal };

    const fee = input.feeOptions ? await chargeFee(base, input.feeOptions) : pendingFee("No fee options supplied.");
    console.log(`[Meirei] Fee: ${fee.amount} ${fee.asset} — ${fee.status}${fee.reason ? ` (${fee.reason})` : ""}`);

    return { success: true, delivery: { ...base, fee } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function pendingFee(reason: string): FeeReceipt {
  return { amount: "0", asset: "USDG", status: "pending", reason };
}

function buildDelivery(
  chain: number,
  mandate: Mandate,
  holdings: Holding[],
  totalUsd: number,
  plan: { legs: Delivery["plan"]["legs"]; quotes?: Delivery["plan"]["quotes"] },
  txs: TxResult[],
  fee: FeeReceipt,
  warnings: string[]
): Delivery {
  return {
    service: SERVICE_NAME,
    chain,
    mandate,
    plan: { mandate, holdings, legs: plan.legs, quotes: plan.quotes },
    txs,
    portfolio: { holdings, totalUsd },
    fee,
    timestamp: Date.now(),
    warnings,
  };
}

export function formatDelivery(d: Delivery): string {
  let out = `Meirei · ${d.service} · chain ${d.chain}\n\nMandate\n  `;
  out += d.mandate.targets.map((t) => `${t.symbol} ${(t.weight * 100).toFixed(1)}%`).join("  ·  ");
  out += `\n  max single ${(d.mandate.maxSingle * 100).toFixed(1)}%  ·  band ${(d.mandate.rebalanceBand * 100).toFixed(1)}%\n`;

  out += "\nResult\n";
  if (!d.txs.length) out += "  (preview — nothing broadcast)\n";
  else
    for (const tx of d.txs) {
      if (tx.status === "success") {
        out += `   ${tx.symbol.padEnd(8)} ${tx.hash}\n`;
        if (tx.explorerUrl) out += `      ${tx.explorerUrl}\n`;
      } else {
        out += `   ${tx.symbol.padEnd(8)} ${tx.error ?? "failed"}\n`;
      }
    }

  out += `\nFinal portfolio   $${d.portfolio.totalUsd.toFixed(2)}\n`;
  for (const h of d.portfolio.holdings) {
    const pct = d.portfolio.totalUsd > 0 ? ((h.valueUsd / d.portfolio.totalUsd) * 100).toFixed(2) : "0.00";
    out += `  ${h.symbol.padEnd(8)} $${h.valueUsd.toFixed(2).padStart(10)}  ${pct.padStart(6)}%\n`;
  }

  for (const w of d.warnings ?? []) out += `\nWARNING  ${w}\n`;
  return out + formatFeeReceipt(d.fee);
}