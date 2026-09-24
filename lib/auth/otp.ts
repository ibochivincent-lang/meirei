import { randomBytes, createHmac, createHash, timingSafeEqual } from "node:crypto";
import { getRedisClient } from "@/lib/redis/client";

export interface TradeBinding {
  symbol?: string;
  side?: "buy" | "sell";
  notionalUsd?: number;
  recipient?: string;
  calldataHash?: string;
}

export interface OtpChallenge {
  challengeId: string;
  identifier: string;
  code?: string;
  hashedOtp: string;
  tradeDigest: string;
  purpose: string;
  expiresAt: number;
  attempts: number;
}

export interface OtpVerificationResult {
  valid: boolean;
  otpToken?: string;
  error?: string;
}

const OTP_SECRET = process.env.OTP_SECRET || "meirei_dev_test_otp_secret_min_32_bytes_safe!";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
const LOCKOUT_COOLDOWN_SECONDS = 15 * 60; // 15-minute cooldown after 3 failed attempts

/**
 * Startup security guard: Refuses to boot or issue tokens in production if OTP_SECRET
 * is shorter than 32 bytes or equals placeholder / known dev strings.
 */
export function assertSecureOtpSecret(): void {
  const secret = process.env.OTP_SECRET;
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const INSECURE_PATTERNS = [
    "CHANGE_ME",
    "meirei_live_security_hmac_secret_2026_chain196",
    "meirei_xlayer_otp_secret_key_v1",
    "placeholder",
  ];

  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error(
        "[SECURITY CRITICAL] Server refusing to boot: OTP_SECRET must be at least 32 bytes in production. Generate using: openssl rand -base64 48"
      );
    }
    for (const pat of INSECURE_PATTERNS) {
      if (secret.includes(pat)) {
        throw new Error(
          `[SECURITY CRITICAL] Server refusing to boot: OTP_SECRET matches insecure pattern "${pat}". Rotate secret in environment.`
        );
      }
    }
  }
}

// In-memory fallback stores for offline testing
const fallbackStore = new Map<string, OtpChallenge>();
const fallbackCooldowns = new Map<string, number>();

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [id, c] of fallbackStore.entries()) {
    if (c.expiresAt < now) {
      fallbackStore.delete(id);
    }
  }
  for (const [id, expiry] of fallbackCooldowns.entries()) {
    if (expiry < now) {
      fallbackCooldowns.delete(id);
    }
  }
}

export function computeTradeDigest(binding?: TradeBinding): string {
  if (!binding) return "generic_action";
  const norm = [
    binding.symbol || "",
    binding.side || "",
    binding.notionalUsd ? binding.notionalUsd.toFixed(2) : "",
    binding.recipient || "",
    binding.calldataHash || "",
  ].join("|");
  return createHash("sha256").update(norm).digest("hex");
}

export function computeHmacOtp(challengeId: string, code: string, tradeDigest: string): string {
  return createHmac("sha256", OTP_SECRET)
    .update(`${challengeId}:${code}:${tradeDigest}`)
    .digest("hex");
}

/**
 * Checks whether an identifier is currently in lockout cooldown.
 */
async function isProfileInCooldown(identifier: string): Promise<boolean> {
  const redis = getRedisClient();
  const id = identifier.trim().toLowerCase();
  if (redis) {
    try {
      const active = await redis.get(`cooldown:otp:${id}`);
      return Boolean(active);
    } catch {
      // fallback
    }
  }
  const exp = fallbackCooldowns.get(id);
  return Boolean(exp && exp > Date.now());
}

/**
 * Applies a 15-minute lockout cooldown to an identifier.
 */
async function applyProfileCooldown(identifier: string): Promise<void> {
  const redis = getRedisClient();
  const id = identifier.trim().toLowerCase();
  if (redis) {
    try {
      await redis.set(`cooldown:otp:${id}`, "1", { ex: LOCKOUT_COOLDOWN_SECONDS });
    } catch {
      // fallback
    }
  }
  fallbackCooldowns.set(id, Date.now() + LOCKOUT_COOLDOWN_SECONDS * 1000);
}

/**
 * Generates a 6-digit numeric OTP challenge, computes HMAC-SHA256 bound to the transaction digest,
 * and stores in serverless Redis with 300s TTL.
 */
export async function generateOtpChallenge(
  identifier: string,
  purpose = "trade_execution",
  tradeBinding?: TradeBinding
): Promise<{
  challengeId: string;
  expiresAt: number;
  code: string;
  error?: string;
}> {
  assertSecureOtpSecret();
  cleanExpiredChallenges();

  const id = identifier.trim().toLowerCase();

  // Enforce lockout cooldown check
  if (await isProfileInCooldown(id)) {
    return {
      challengeId: "",
      expiresAt: 0,
      code: "",
      error: "Profile is temporarily locked out due to multiple failed verification attempts. Please wait 15 minutes before requesting a new code.",
    };
  }

  const randomNum = (parseInt(randomBytes(3).toString("hex"), 16) % 900000) + 100000;
  const code = randomNum.toString();
  const challengeId = `otp_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const expiresAt = Date.now() + OTP_TTL_MS;
  const tradeDigest = computeTradeDigest(tradeBinding);
  const hashedOtp = computeHmacOtp(challengeId, code, tradeDigest);

  const challenge: OtpChallenge = {
    challengeId,
    identifier: id,
    code,
    hashedOtp,
    tradeDigest,
    purpose,
    expiresAt,
    attempts: 0,
  };

  const redis = getRedisClient();
  if (redis) {
    try {
      await Promise.all([
        redis.set(`user_otp_${id}`, JSON.stringify(challenge), { ex: 300 }),
        redis.set(`otp_challenge_${challengeId}`, JSON.stringify(challenge), { ex: 300 }),
      ]);
    } catch (err) {
      console.warn("[OTP] Failed to write OTP to Redis, storing in memory fallback:", err);
    }
  }

  fallbackStore.set(challengeId, challenge);
  fallbackStore.set(`user_otp_${id}`, challenge);

  return {
    challengeId,
    expiresAt,
    code,
  };
}

/**
 * Verifies a 6-digit OTP code against Redis (or fallback store) using constant-time HMAC check
 * bound to transaction calldata/parameters.
 */
export async function verifyOtpChallenge(
  challengeIdOrIdentifier: string,
  inputCode: string,
  tradeBinding?: TradeBinding
): Promise<OtpVerificationResult> {
  assertSecureOtpSecret();
  cleanExpiredChallenges();

  const cleanInput = (inputCode || "").trim();
  if (!cleanInput || !challengeIdOrIdentifier) {
    return { valid: false, error: "Missing challenge identifier or verification code." };
  }

  const lookupKey = challengeIdOrIdentifier.trim().toLowerCase();

  // Check lockout cooldown
  if (await isProfileInCooldown(lookupKey)) {
    return {
      valid: false,
      error: "Profile is temporarily locked out due to multiple failed verification attempts. Please wait 15 minutes.",
    };
  }

  const redis = getRedisClient();
  let challenge: OtpChallenge | null = null;

  if (redis) {
    try {
      let raw = await redis.get<string | OtpChallenge>(`otp_challenge_${lookupKey}`);
      if (!raw) {
        raw = await redis.get<string | OtpChallenge>(`user_otp_${lookupKey}`);
      }
      if (raw) {
        challenge = typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    } catch (err) {
      console.warn("[OTP] Redis read failed, checking in-memory fallback:", err);
    }
  }

  if (!challenge) {
    challenge = fallbackStore.get(lookupKey) || fallbackStore.get(`user_otp_${lookupKey}`) || null;
  }

  if (!challenge) {
    return { valid: false, error: "OTP challenge has expired or does not exist." };
  }

  if (Date.now() > challenge.expiresAt) {
    if (redis) {
      await Promise.all([
        redis.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
        redis.del(`user_otp_${challenge.identifier}`).catch(() => {}),
      ]);
    }
    fallbackStore.delete(challenge.challengeId);
    fallbackStore.delete(`user_otp_${challenge.identifier}`);
    return { valid: false, error: "OTP code has expired. Please request a new code." };
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await applyProfileCooldown(challenge.identifier);
    if (redis) {
      await Promise.all([
        redis.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
        redis.del(`user_otp_${challenge.identifier}`).catch(() => {}),
      ]);
    }
    fallbackStore.delete(challenge.challengeId);
    fallbackStore.delete(`user_otp_${challenge.identifier}`);
    return {
      valid: false,
      error: "Maximum verification attempts exceeded. Account locked out for 15 minutes.",
    };
  }

  challenge.attempts += 1;

  // Constant-time HMAC verification bound to challengeId and trade digest
  const expectedDigest = challenge.tradeDigest || "generic_action";
  const providedDigest = tradeBinding ? computeTradeDigest(tradeBinding) : expectedDigest;

  // If a specific trade binding was stored, verify the trade matches
  if (challenge.tradeDigest && challenge.tradeDigest !== "generic_action" && providedDigest !== challenge.tradeDigest) {
    return {
      valid: false,
      error: "Security Mismatch: OTP was issued for a different transaction. Re-authorization required.",
    };
  }

  const computedHmac = computeHmacOtp(challenge.challengeId, cleanInput, expectedDigest);
  const storedHmac = challenge.hashedOtp;

  const isMatch =
    computedHmac.length === storedHmac.length &&
    timingSafeEqual(Buffer.from(computedHmac), Buffer.from(storedHmac));

  if (!isMatch) {
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await applyProfileCooldown(challenge.identifier);
      if (redis) {
        await Promise.all([
          redis.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
          redis.del(`user_otp_${challenge.identifier}`).catch(() => {}),
        ]);
      }
      fallbackStore.delete(challenge.challengeId);
      fallbackStore.delete(`user_otp_${challenge.identifier}`);
      return {
        valid: false,
        error: "Maximum verification attempts exceeded. Account locked out for 15 minutes.",
      };
    }

    if (redis) {
      await redis
        .set(`otp_challenge_${challenge.challengeId}`, JSON.stringify(challenge), { ex: 300 })
        .catch(() => {});
    }
    const remaining = MAX_ATTEMPTS - challenge.attempts;
    return {
      valid: false,
      error: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before 15-minute lockout.`,
    };
  }

  // Verified successfully: delete from Redis and memory store to prevent replay attacks
  if (redis) {
    await Promise.all([
      redis.del(`otp_challenge_${challenge.challengeId}`).catch(() => {}),
      redis.del(`user_otp_${challenge.identifier}`).catch(() => {}),
    ]);
  }
  fallbackStore.delete(challenge.challengeId);
  fallbackStore.delete(`user_otp_${challenge.identifier}`);

  // Generate signed authorization token bound to identifier, purpose, and tradeDigest
  const issuedAt = Date.now();
  const tokenExpiresAt = issuedAt + TOKEN_TTL_MS;
  const payload = `${challenge.identifier}:${challenge.purpose}:${tokenExpiresAt}:${expectedDigest}`;
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
export function validateOtpToken(
  otpToken: string,
  expectedIdentifier: string,
  tradeBinding?: TradeBinding
): boolean {
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

    const [tokenIdentifier, , tokenExpiresAtStr, tokenDigest] = payload.split(":");
    const tokenExpiresAt = parseInt(tokenExpiresAtStr, 10);

    if (Date.now() > tokenExpiresAt) {
      return false;
    }

    if (tokenIdentifier.toLowerCase() !== expectedIdentifier.trim().toLowerCase()) {
      return false;
    }

    // If token is bound to a specific trade digest, verify it matches
    if (tokenDigest && tokenDigest !== "generic_action" && tradeBinding) {
      const currentDigest = computeTradeDigest(tradeBinding);
      if (tokenDigest !== currentDigest) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
