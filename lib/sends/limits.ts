export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  limitUsd?: number;
}

export const MIN_TRADE_USD = 1;
export const MAX_TRADE_USD = 100_000;

/**
 * Enforces trading and send limits per leg or transaction.
 */
export async function enforceLimits(params: {
  amountUsd?: number;
  userId?: string;
  symbol?: string;
}): Promise<LimitCheckResult> {
  const amount = params.amountUsd ?? 0;

  if (amount < MIN_TRADE_USD) {
    return {
      allowed: false,
      reason: `Trade amount $${amount.toFixed(2)} is below minimum $${MIN_TRADE_USD} USDG.`,
      limitUsd: MIN_TRADE_USD,
    };
  }

  if (amount > MAX_TRADE_USD) {
    return {
      allowed: false,
      reason: `Trade amount $${amount.toFixed(2)} exceeds maximum limit of $${MAX_TRADE_USD.toLocaleString()} USDG.`,
      limitUsd: MAX_TRADE_USD,
    };
  }

  return { allowed: true };
}
