import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;
let hasLoggedInit = false;

/**
 * Returns the singleton Upstash Redis client for ephemeral security states:
 * - Account freeze flags (SET freeze:{profileId} 1)
 * - Atomic idempotency locks (SET idem:{hash} 1 NX EX 86400)
 * - Sliding window rate-limit buckets
 * - HMAC-SHA256 OTP challenges and cooldown timers
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && !url.includes("CHANGE_ME") && !url.includes("your-upstash")) {
    try {
      redisInstance = new Redis({ url, token });
      if (!hasLoggedInit) {
        console.log("[Upstash Redis] Ephemeral security state store connected.");
        hasLoggedInit = true;
      }
      return redisInstance;
    } catch (err) {
      console.warn("[Upstash Redis] Connection failed, using in-memory fallback:", err);
      return null;
    }
  }

  return null;
}
