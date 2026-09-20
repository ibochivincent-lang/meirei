import { FeeOptions, FeeReceipt, Delivery, CashSymbol, Leg } from "../types";
import { getOnchainOSConfig, sendToken, createEscrowCharge } from "../onchainos";
import { feeAddress, defaultFeeAmountUsd, defaultFeeBps } from "../config";
import { getAllowlistEntry, CASH_SYMBOLS } from "../allowlist";

export const DEFAULT_FEE_BPS = 50; // 0.5% of executed notional
export const DEFAULT_FIXED_FEE_USD = 5;
export const SERVICE_NAME = "Meirei Mandate Portfolio Execution";

/** USDT is not on X Layer; fees settle in an allowlisted stablecoin. */
export function feeAsset(): CashSymbol {
  const raw = (process.env.MEIREI_FEE_ASSET ?? "USDG").trim().toUpperCase();
  return (CASH_SYMBOLS as string[]).includes(raw) ? (raw as CashSymbol) : "USDG";
}

export function executedNotional(legs: Leg[]): number {
  return legs.reduce((s, l) => s + l.notionalUsd, 0);
}

export function computeFeeAmount(notionalUsd: number, options: FeeOptions): number {
  switch (options.mode) {
    case "fixed":
      return options.amountUsd ?? defaultFeeAmountUsd() ?? DEFAULT_FIXED_FEE_USD;
    case "percentage": {
      const bps = options.percentageBps ?? defaultFeeBps() ?? DEFAULT_FEE_BPS;
      return notionalUsd * (bps / 10_000);
    }
    case "a2a-escrow":
    default: {
      const bps = options.percentageBps ?? defaultFeeBps() ?? DEFAULT_FEE_BPS;
      return notionalUsd * (bps / 10_000);
    }
  }
}

/**
 * Collects the service fee.
 *
 * A receipt is only `settled` when it is backed by a real on-chain transfer.
 * Otherwise it is `pending` with an explanation. Meirei never fabricates a tx hash.
 */
export async function chargeFee(delivery: Delivery, options: FeeOptions): Promise<FeeReceipt> {
  const asset = feeAsset();
  const amountUsd = computeFeeAmount(executedNotional(delivery.plan.legs), options);
  const amount = amountUsd.toFixed(4);

  const succeeded = delivery.txs.filter((t) => t.status === "success").length;
  if (succeeded === 0) {
    return { amount, asset, status: "pending", reason: "No successful swaps in this delivery — nothing to charge for." };
  }
  if (amountUsd <= 0) {
    return { amount, asset, status: "pending", reason: "Computed fee is zero." };
  }

  const cfg = getOnchainOSConfig();
  const recipient = feeAddress();

  if (cfg.mock) {
    return {
      amount,
      asset,
      status: "pending",
      reason: "[MOCK] Payments are disabled in mock mode — no fee was collected.",
    };
  }
  if (!recipient) {
    return {
      amount,
      asset,
      status: "pending",
      reason: "MEIREI_FEE_ADDRESS is not configured, so the fee was not collected.",
    };
  }

  const entry = getAllowlistEntry(asset);
  if (!entry) {
    return { amount, asset, status: "failed", reason: `Fee asset ${asset} is not allowlisted on X Layer.` };
  }

  try {
    if (options.mode === "a2a-escrow") {
      const created = await createEscrowCharge({
        amount: amountUsd.toFixed(6),
        symbol: asset,
        recipient,
        chain: cfg.chain,
        description: `${SERVICE_NAME} — ${delivery.mandate.targets.length} targets, chain ${cfg.chain.id}`,
        externalId: `meirei_${delivery.timestamp}`,
      });
      return {
        amount,
        asset,
        status: "pending",
        escrowId: created.paymentId,
        reason: "A2A payment link created; it settles when the buyer pays.",
      };
    }

    const txHash = await sendToken({
      to: recipient,
      amount: amountUsd.toFixed(6),
      tokenAddress: entry.address,
      chain: cfg.chain,
    });
    return { amount, asset, status: "settled", txHash };
  } catch (e) {
    return {
      amount,
      asset,
      status: "failed",
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

export function formatFeeReceipt(f: FeeReceipt): string {
  let out = `\nFee\n  ${f.amount} ${f.asset}  ·  status: ${f.status}`;
  if (f.txHash) out += `\n  tx: ${f.txHash}`;
  if (f.escrowId) out += `\n  escrow: ${f.escrowId}`;
  if (f.reason) out += `\n  note: ${f.reason}`;
  return out;
}