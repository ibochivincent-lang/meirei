import { getRedisClient } from "@/lib/redis/client";

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

export async function readDailySpend(walletAddress: string): Promise<number> {
  const addr = walletAddress.trim().toLowerCase();
  const today = getTodayString();
  const redis = getRedisClient();
  if (redis) {
    try {
      const val = await redis.get<string | number>(`spend:daily:${addr}:${today}`);
      if (val !== null && val !== undefined) {
        return typeof val === "number" ? val : parseFloat(String(val)) || 0;
      }
    } catch (err) {
      console.warn("[spending_limits] Redis read failed:", err);
    }
  }
  const record = walletDailySpendingStore.get(addr);
  return record && record.date === today ? record.totalUsd : 0;
}

export async function addDailySpend(walletAddress: string, amountUsd: number): Promise<void> {
  const addr = walletAddress.trim().toLowerCase();
  const today = getTodayString();

  // Update in-memory fallback
  let record = walletDailySpendingStore.get(addr);
  if (!record || record.date !== today) {
    record = { date: today, totalUsd: 0 };
    walletDailySpendingStore.set(addr, record);
  }
  record.totalUsd += amountUsd;

  // Update Upstash Redis
  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `spend:daily:${addr}:${today}`;
      await redis.incrbyfloat(key, amountUsd);
      await redis.expire(key, 90000); // 25-hour TTL
    } catch (err) {
      console.warn("[spending_limits] Redis incrbyfloat failed:", err);
    }
  }
}

/**
 * Validates whether a proposed transaction complies with per-transaction and daily spending caps.
 * Checks Upstash Redis primary store with in-memory fallback.
 */
export async function validateSpendingLimit(
  walletAddress: string,
  amountUsd: number,
  config: SpendingLimitConfig = DEFAULT_SPENDING_LIMITS
): Promise<SpendingLimitResult> {
  const addr = walletAddress.trim().toLowerCase();

  if (amountUsd > config.maxPerTransactionUsd) {
    return {
      allowed: false,
      error: `Transaction exceeds maximum per-trade limit of $${config.maxPerTransactionUsd.toLocaleString()} USDG. Proposed: $${amountUsd.toFixed(2)} USDG.`,
      currentDailySpend: 0,
      maxDailyVolume: config.maxDailyVolumeUsd,
      maxPerTransaction: config.maxPerTransactionUsd,
    };
  }

  const currentDailySpend = await readDailySpend(addr);
  const projectedDailyTotal = currentDailySpend + amountUsd;

  if (projectedDailyTotal > config.maxDailyVolumeUsd) {
    return {
      allowed: false,
      error: `Transaction exceeds 24-hour daily cumulative volume cap of $${config.maxDailyVolumeUsd.toLocaleString()} USDG. Current daily volume: $${currentDailySpend.toFixed(2)} USDG. Proposed addition: $${amountUsd.toFixed(2)} USDG.`,
      currentDailySpend,
      maxDailyVolume: config.maxDailyVolumeUsd,
      maxPerTransaction: config.maxPerTransactionUsd,
    };
  }

  return {
    allowed: true,
    currentDailySpend,
    maxDailyVolume: config.maxDailyVolumeUsd,
    maxPerTransaction: config.maxPerTransactionUsd,
  };
}

/**
 * Records an executed transaction against the wallet's daily spending quota in Redis and memory.
 */
export async function recordExecutedSpend(walletAddress: string, amountUsd: number): Promise<void> {
  await addDailySpend(walletAddress, amountUsd);
}
