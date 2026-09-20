export interface SpendingLimitConfig {
  maxPerTransactionUsd: number;
  maxDailyVolumeUsd: number;
}

export const DEFAULT_SPENDING_LIMITS: SpendingLimitConfig = {
  maxPerTransactionUsd: 50_000, // $50,000 max single swap
  maxDailyVolumeUsd: 100_000,  // $100,000 max daily cumulative volume
};

interface WalletDailySpend {
  date: string; // YYYY-MM-DD
  totalUsd: number;
}

const walletDailySpendingStore = new Map<string, WalletDailySpend>();

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SpendingLimitResult {
  allowed: boolean;
  error?: string;
  currentDailySpend: number;
  maxDailyVolume: number;
  maxPerTransaction: number;
}

/**
 * Validates whether a proposed transaction complies with per-transaction and daily spending caps.
 */
export function validateSpendingLimit(
  walletAddress: string,
  amountUsd: number,
  config: SpendingLimitConfig = DEFAULT_SPENDING_LIMITS
): SpendingLimitResult {
  const addr = walletAddress.trim().toLowerCase();
  const today = getTodayString();

  if (amountUsd > config.maxPerTransactionUsd) {
    return {
      allowed: false,
      error: `Transaction exceeds maximum per-trade limit of $${config.maxPerTransactionUsd.toLocaleString()} USDG. Proposed: $${amountUsd.toFixed(2)} USDG.`,
      currentDailySpend: 0,
      maxDailyVolume: config.maxDailyVolumeUsd,
      maxPerTransaction: config.maxPerTransactionUsd,
    };
  }

  let record = walletDailySpendingStore.get(addr);
  if (!record || record.date !== today) {
    record = { date: today, totalUsd: 0 };
    walletDailySpendingStore.set(addr, record);
  }

  const projectedDailyTotal = record.totalUsd + amountUsd;

  if (projectedDailyTotal > config.maxDailyVolumeUsd) {
    return {
      allowed: false,
      error: `Transaction exceeds 24-hour daily cumulative volume cap of $${config.maxDailyVolumeUsd.toLocaleString()} USDG. Current daily volume: $${record.totalUsd.toFixed(2)} USDG. Proposed addition: $${amountUsd.toFixed(2)} USDG.`,
      currentDailySpend: record.totalUsd,
      maxDailyVolume: config.maxDailyVolumeUsd,
      maxPerTransaction: config.maxPerTransactionUsd,
    };
  }

  return {
    allowed: true,
    currentDailySpend: record.totalUsd,
    maxDailyVolume: config.maxDailyVolumeUsd,
    maxPerTransaction: config.maxPerTransactionUsd,
  };
}

/**
 * Records an executed transaction against the wallet's daily spending quota.
 */
export function recordExecutedSpend(walletAddress: string, amountUsd: number): void {
  const addr = walletAddress.trim().toLowerCase();
  const today = getTodayString();

  let record = walletDailySpendingStore.get(addr);
  if (!record || record.date !== today) {
    record = { date: today, totalUsd: 0 };
    walletDailySpendingStore.set(addr, record);
  }

  record.totalUsd += amountUsd;
}
