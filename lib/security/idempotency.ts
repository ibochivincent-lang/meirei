import { createHash } from "node:crypto";
import { getRedisClient } from "@/lib/redis/client";

interface CachedIdempotencyRecord {
  result: unknown;
  status: "pending" | "completed" | "failed";
  timestamp: number;
}

const idempotencyStore = new Map<string, CachedIdempotencyRecord>();

// TTL: 24 hours (86400s) for transaction and webhook deduplication
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const REDIS_IDEMPOTENCY_TTL_SEC = 86400;

// Periodic cleanup of in-memory fallback
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Derives a deterministic operation fingerprint for transactions or webhook deliveries.
 */
export function deriveOperationKey(
  walletAddress: string,
  operationType: string,
  details: Record<string, unknown>
): string {
  const normalized = `${walletAddress.toLowerCase()}:${operationType}:${JSON.stringify(details)}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  isProcessing: boolean;
  cachedResult?: unknown;
}

/**
 * Atomic idempotency check backed by Upstash Redis:
 * Executes: `SET idem:{hash} 1 NX EX 86400`
 * The NX flag guarantees atomic check-and-set to safely prevent race conditions between concurrent webhook deliveries.
 */
export async function checkIdempotencyAtomic(key: string): Promise<IdempotencyCheckResult> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const res = await redis.set(`idem:${key}`, "1", {
        nx: true,
        ex: REDIS_IDEMPOTENCY_TTL_SEC,
      });

      // "OK" means the key was set atomically (first caller)
      if (res === "OK") {
        idempotencyStore.set(key, { result: null, status: "pending", timestamp: Date.now() });
        return { isDuplicate: false, isProcessing: false };
      }

      // Key already existed -> duplicate or concurrent request
      const cached = idempotencyStore.get(key);
      return {
        isDuplicate: true,
        isProcessing: cached?.status === "pending",
        cachedResult: cached?.result,
      };
    } catch (err) {
      console.warn("[idempotency] Redis atomic set failed, checking in-memory:", err);
    }
  }

  // Fallback in-memory check
  return checkIdempotency(key);
}

/**
 * Synchronous in-memory idempotency check (fallback for test suites and offline execution).
 */
export function checkIdempotency(key: string): IdempotencyCheckResult {
  const record = idempotencyStore.get(key);
  if (!record) {
    idempotencyStore.set(key, {
      result: null,
      status: "pending",
      timestamp: Date.now(),
    });
    return { isDuplicate: false, isProcessing: false };
  }

  if (record.status === "pending") {
    return { isDuplicate: true, isProcessing: true };
  }

  return {
    isDuplicate: true,
    isProcessing: false,
    cachedResult: record.result,
  };
}

/**
 * Records the completed execution result for an idempotency key.
 */
export function completeIdempotency(key: string, result: unknown, success = true): void {
  idempotencyStore.set(key, {
    result,
    status: success ? "completed" : "failed",
    timestamp: Date.now(),
  });
}
