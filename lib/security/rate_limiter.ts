import { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis/client";

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale records periodically
setInterval(() => {
  const now = Date.now();
  const maxIdleMs = 15 * 60 * 1000;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.lastRefill > maxIdleMs) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxTokens: number;
  refillRatePerSec: number;
}

export const RATE_LIMIT_TIERS = {
  // Read operations (prices, balances, news)
  read: { maxTokens: 60, refillRatePerSec: 1 },
  // Transaction submissions & rebalancing
  trade: { maxTokens: 12, refillRatePerSec: 0.2 }, // Max 12 burst, 1 trade per 5s
  // 2FA OTP generation and verification
  otp: { maxTokens: 5, refillRatePerSec: 0.1 }, // Max 5 attempts
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

/**
 * Sliding window rate limiting backed by Upstash Redis sorted sets.
 * Evaluates request count within a sliding window and auto-expires keys.
 */
export async function checkRateLimitRedis(
  identifier: string,
  tier: keyof typeof RATE_LIMIT_TIERS = "read"
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const config = RATE_LIMIT_TIERS[tier];
      const key = `ratelimit:${tier}:${identifier.trim().toLowerCase()}`;
      const now = Date.now();
      const windowMs = (config.maxTokens / config.refillRatePerSec) * 1000;
      const windowStart = now - windowMs;

      // Clean old timestamps and insert current request
      await redis.zremrangebyscore(key, 0, windowStart);
      const member = `${now}:${Math.random().toString(36).slice(2, 7)}`;
      await redis.zadd(key, { score: now, member });
      const count = await redis.zcard(key);
      await redis.pexpire(key, Math.ceil(windowMs));

      const allowed = count <= config.maxTokens;
      const remaining = Math.max(0, config.maxTokens - count);
      const resetSeconds = Math.ceil(windowMs / 1000);

      return { allowed, remaining, limit: config.maxTokens, resetSeconds };
    } catch (err) {
      console.warn("[rate_limiter] Redis sliding window notice:", err);
    }
  }

  return checkRateLimit(identifier, tier);
}

/**
 * In-memory token bucket rate limiting (synchronous fallback for tests and offline execution).
 */
export function checkRateLimit(
  identifier: string,
  tier: keyof typeof RATE_LIMIT_TIERS = "read"
): RateLimitResult {
  const config = RATE_LIMIT_TIERS[tier];
  const key = `${tier}:${identifier.trim().toLowerCase()}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { tokens: config.maxTokens, lastRefill: now };
    rateLimitStore.set(key, record);
  }

  // Refill tokens based on elapsed time
  const elapsedSeconds = (now - record.lastRefill) / 1000;
  record.tokens = Math.min(
    config.maxTokens,
    record.tokens + elapsedSeconds * config.refillRatePerSec
  );
  record.lastRefill = now;

  if (record.tokens >= 1) {
    record.tokens -= 1;
    const resetSeconds = Math.ceil(
      (config.maxTokens - record.tokens) / config.refillRatePerSec
    );
    return {
      allowed: true,
      remaining: Math.floor(record.tokens),
      limit: config.maxTokens,
      resetSeconds,
    };
  }

  const resetSeconds = Math.ceil((1 - record.tokens) / config.refillRatePerSec);
  return {
    allowed: false,
    remaining: 0,
    limit: config.maxTokens,
    resetSeconds,
  };
}

/**
 * Extracts best client identifier from request headers (IP or fallback).
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
