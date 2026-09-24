import { getRedisClient } from "@/lib/redis/client";
import { logEvent } from "./logger";

// In-memory fallback counters for local and offline dev
const inMemoryCounters = {
  quotes_generated: 0,
  trades_signed: 0,
  otp_attempts_total: 0,
  otp_attempts_failed: 0,
  otp_lockouts: 0,
  webhook_events_total: 0,
  webhook_duplicates_dropped: 0,
  sanctions_screened: 0,
  sanctions_blocked: 0,
};

type MetricKey = keyof typeof inMemoryCounters;

/**
 * Increment a metric counter in Redis and in-memory fallback
 */
export async function incrementMetric(key: MetricKey, amount = 1): Promise<void> {
  inMemoryCounters[key] += amount;

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.incrby(`metric:${key}`, amount);
    } catch (err) {
      console.warn(`[Metrics] Redis increment failed for ${key}:`, err);
    }
  }
}

/**
 * Record quote generation event for conversion tracking
 */
export async function recordQuoteGenerated(correlationId?: string, walletAddress?: string): Promise<void> {
  await incrementMetric("quotes_generated", 1);
  logEvent({
    level: "INFO",
    action: "quote_generated",
    correlationId,
    walletAddress,
  });
}

/**
 * Record trade signed event for conversion tracking
 */
export async function recordTradeSigned(correlationId?: string, walletAddress?: string, txHash?: string): Promise<void> {
  await incrementMetric("trades_signed", 1);
  logEvent({
    level: "INFO",
    action: "trade_signed",
    correlationId,
    walletAddress,
    details: { txHash },
  });
}

/**
 * Record OTP verification attempt (success or failure)
 */
export async function recordOtpAttempt(success: boolean, profileId: string, correlationId?: string): Promise<void> {
  await incrementMetric("otp_attempts_total", 1);
  if (!success) {
    await incrementMetric("otp_attempts_failed", 1);
    logEvent({
      level: "WARN",
      action: "otp_verification_failed",
      correlationId,
      profileId,
    });
  } else {
    logEvent({
      level: "INFO",
      action: "otp_verification_success",
      correlationId,
      profileId,
    });
  }
}

/**
 * Record OTP lockout event (3-attempt limit reached)
 */
export async function recordOtpLockout(profileId: string, correlationId?: string): Promise<void> {
  await incrementMetric("otp_lockouts", 1);
  logEvent({
    level: "ERROR",
    action: "otp_lockout_triggered",
    correlationId,
    profileId,
    details: { cooldownMinutes: 15 },
  });
}

/**
 * Record incoming webhook event and whether it was dropped as duplicate
 */
export async function recordWebhookEvent(source: "telegram" | "whatsapp", isDuplicate: boolean, correlationId?: string): Promise<void> {
  await incrementMetric("webhook_events_total", 1);
  if (isDuplicate) {
    await incrementMetric("webhook_duplicates_dropped", 1);
    logEvent({
      level: "WARN",
      action: "webhook_duplicate_dropped",
      correlationId,
      channel: source,
      details: { reason: "Idempotency key collision" },
    });
  } else {
    logEvent({
      level: "INFO",
      action: "webhook_received",
      correlationId,
      channel: source,
    });
  }
}

export interface MetricsSummary {
  counters: typeof inMemoryCounters;
  rates: {
    quoteToSignConversionPercent: number;
    failedOtpPercent: number;
    webhookDuplicatePercent: number;
  };
  timestamp: string;
}

/**
 * Retrieve current metrics summary and conversion rates
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  const current = { ...inMemoryCounters };
  const redis = getRedisClient();

  if (redis) {
    try {
      const keys = Object.keys(current) as MetricKey[];
      const pipeline = redis.pipeline();
      for (const k of keys) {
        pipeline.get<string | number>(`metric:${k}`);
      }
      const results = await pipeline.exec();
      if (results) {
        keys.forEach((k, idx) => {
          const val = Number(results[idx]);
          if (!isNaN(val) && val > 0) {
            current[k] = val;
          }
        });
      }
    } catch (err) {
      console.warn("[Metrics] Redis fetch failed; using in-memory values:", err);
    }
  }

  const quoteToSignConversionPercent =
    current.quotes_generated > 0
      ? Number(((current.trades_signed / current.quotes_generated) * 100).toFixed(2))
      : 0;

  const failedOtpPercent =
    current.otp_attempts_total > 0
      ? Number(((current.otp_attempts_failed / current.otp_attempts_total) * 100).toFixed(2))
      : 0;

  const webhookDuplicatePercent =
    current.webhook_events_total > 0
      ? Number(((current.webhook_duplicates_dropped / current.webhook_events_total) * 100).toFixed(2))
      : 0;

  return {
    counters: current,
    rates: {
      quoteToSignConversionPercent,
      failedOtpPercent,
      webhookDuplicatePercent,
    },
    timestamp: new Date().toISOString(),
  };
}
