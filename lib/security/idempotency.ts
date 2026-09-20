import { createHash } from "node:crypto";

interface CachedIdempotencyRecord {
  result: unknown;
  status: "pending" | "completed" | "failed";
  timestamp: number;
}

const idempotencyStore = new Map<string, CachedIdempotencyRecord>();

// TTL: 2 minutes for trade deduplication window
const IDEMPOTENCY_TTL_MS = 2 * 60 * 1000;

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Derives a deterministic operation fingerprint if client did not supply an explicit Idempotency-Key header.
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
 * Checks whether an identical transaction or request is already being processed or has recently executed.
 */
export function checkIdempotency(key: string): IdempotencyCheckResult {
  const record = idempotencyStore.get(key);
  if (!record) {
    // Reserve the key as pending to prevent concurrent duplicate execution
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
