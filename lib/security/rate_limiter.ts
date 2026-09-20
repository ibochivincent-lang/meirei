import { NextRequest } from "next/server";

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
  refillRatePerSec: number; // Tokens added per second
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
 * Applies token bucket rate limiting based on client IP or wallet address.
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
