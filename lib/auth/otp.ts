import { randomBytes, createHmac, createHash, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

export interface OtpChallenge {
  challengeId: string;
  identifier: string;
  code?: string;
  hashedOtp: string;
  purpose: string;
  expiresAt: number;
  attempts: number;
}

export interface OtpVerificationResult {
  valid: boolean;
  otpToken?: string;
  error?: string;
}

const OTP_SECRET = process.env.OTP_SECRET || "meirei_xlayer_otp_secret_key_v1";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

// Initialize Serverless Upstash Redis client if configured in environment
let redisClient: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn("[OTP] Upstash Redis initialization error, using in-memory fallback:", err);
  }
}

// Ephemeral in-memory fallback store for offline tests and local dev
const fallbackStore = new Map<string, OtpChallenge>();

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [id, c] of fallbackStore.entries()) {
    if (c.expiresAt < now) {
      fallbackStore.delete(id);
    }
  }
}

/**
 * Generates a 6-digit numeric OTP challenge, hashes it, and stores in serverless Redis with 300s TTL.
 */
export async function generateOtpChallenge(
  identifier: string,
  purpose = "trade_execution"
): Promise<{
  challengeId: string;
  expiresAt: number;
  code: string;
}> {
  cleanExpiredChallenges();

  const id = identifier.trim().toLowerCase();
  const randomNum = (parseInt(randomBytes(3).toString("hex"), 16) % 900000) + 100000;
  const code = randomNum.toString();
  const hashedOtp = createHash("sha256").update(code).digest("hex");

  const challengeId = `otp_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const expiresAt = Date.now() + OTP_TTL_MS;

  const challenge: OtpChallenge = {
    challengeId,
    identifier: id,
    code,
    hashedOtp,
    purpose,
    expiresAt,
    attempts: 0,
  };

  // 1. Store in Serverless Redis with 300s (5-minute) TTL
  if (redisClient) {
    try {
      await Promise.all([
        redisClient.set(`user_otp_${id}`, JSON.stringify(challenge), { ex: 300 }),
        redisClient.set(`otp_challenge_${challengeId}`, JSON.stringify(challenge), { ex: 300 }),
      ]);
    } catch (err) {
      console.warn("[OTP] Failed to write OTP to Redis, storing in memory fallback:", err);
    }
  }

  // 2. Always write to in-memory fallback
  fallbackStore.set(challengeId, challenge);
  fallbackStore.set(`user_otp_${id}`, challenge);

  return {
    challengeId,
    expiresAt,
    code,
  };
}

/**
 * Verifies a 6-digit OTP code against Redis (or fallback store) using constant-time check.
 */
export async function verifyOtpChallenge(
  challengeIdOrIdentifier: string,
  inputCode: string
): Promise<OtpVerificationResult> {
  cleanExpiredChallenges();

  const cleanInput = (inputCode || "").trim();
  if (!cleanInput || !challengeIdOrIdentifier) {
    return { valid: false, error: "Missing challenge identifier or verification code." };
  }

  const lookupKey = challengeIdOrIdentifier.trim().toLowerCase();
  let challenge: OtpChallenge | null = null;

  // 1. Read from Redis
  if (redisClient) {
    try {
      let raw = await redisClient.get<string | OtpChallenge>(`otp_challenge_${lookupKey}`);
      if (!raw) {
        raw = await redisClient.get<string | OtpChallenge>(`user_otp_${lookupKey}`);
      }
      if (raw) {
        challenge = typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    } catch (err) {
      console.warn("[OTP] Redis read failed, checking in-memory fallback:", err);
    }
  }

  // 2. Fallback store lookup if not found in Redis
  if (!challenge) {
    challenge = fallbackStore.get(lookupKey) || fallbackStore.get(`user_otp_${lookupKey}`) || null;
  }

  if (!challenge) {
    return { valid: false, error: "OTP challenge has expired or does not exist." };
  }

  if (Date.now() > challenge.expiresAt) {
    if (redisClient) {
      await Promise.all([
        redisClient.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
        redisClient.del(`user_otp_${challenge.identifier}`).catch(() => {}),
      ]);
    }
    fallbackStore.delete(challenge.challengeId);
    fallbackStore.delete(`user_otp_${challenge.identifier}`);
    return { valid: false, error: "OTP code has expired. Please request a new code." };
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    if (redisClient) {
      await Promise.all([
        redisClient.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
        redisClient.del(`user_otp_${challenge.identifier}`).catch(() => {}),
      ]);
    }
    fallbackStore.delete(challenge.challengeId);
    fallbackStore.delete(`user_otp_${challenge.identifier}`);
    return { valid: false, error: "Maximum verification attempts exceeded. Challenge invalidated." };
  }

  challenge.attempts += 1;

  // Constant-time verification using SHA-256 hash
  const inputHash = createHash("sha256").update(cleanInput).digest("hex");
  const storedHash = challenge.hashedOtp;

  const isHashMatch =
    inputHash.length === storedHash.length &&
    timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));

  if (!isHashMatch) {
    // Update attempts in Redis/fallback
    if (redisClient) {
      await redisClient
        .set(`otp_challenge_${challenge.challengeId}`, JSON.stringify(challenge), { ex: 300 })
        .catch(() => {});
    }
    return { valid: false, error: "Invalid OTP code. Please check and try again." };
  }

  // Verified! Delete from Redis and memory store to prevent replay
  if (redisClient) {
    await Promise.all([
      redisClient.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
      redisClient.del(`user_otp_${challenge.identifier}`).catch(() => {}),
    ]);
  }
  fallbackStore.delete(challenge.challengeId);
  fallbackStore.delete(`user_otp_${challenge.identifier}`);

  // Generate signed authorization token
  const issuedAt = Date.now();
  const tokenExpiresAt = issuedAt + TOKEN_TTL_MS;
  const payload = `${challenge.identifier}:${challenge.purpose}:${tokenExpiresAt}`;
  const signature = createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
  const otpToken = `${Buffer.from(payload).toString("base64url")}.${signature}`;

  return {
    valid: true,
    otpToken,
  };
}

/**
 * Validates whether an authorization token is authentic, unexpired, and matches the target wallet or identifier.
 */
export function validateOtpToken(otpToken: string, expectedIdentifier: string): boolean {
  if (!otpToken || typeof otpToken !== "string") return false;

  const parts = otpToken.split(".");
  if (parts.length !== 2) return false;

  const [encodedPayload, providedSignature] = parts;

  try {
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedSignature = createHmac("sha256", OTP_SECRET).update(payload).digest("hex");

    if (providedSignature !== expectedSignature) {
      return false;
    }

    const [tokenIdentifier, , tokenExpiresAtStr] = payload.split(":");
    const tokenExpiresAt = parseInt(tokenExpiresAtStr, 10);

    if (Date.now() > tokenExpiresAt) {
      return false;
    }

    if (tokenIdentifier.toLowerCase() !== expectedIdentifier.trim().toLowerCase()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
