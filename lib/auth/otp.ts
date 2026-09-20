import { randomBytes, createHmac } from "node:crypto";

export interface OtpChallenge {
  challengeId: string;
  identifier: string;
  code: string;
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

// Active challenge storage (in-memory store with auto-cleanup)
const challengeStore = new Map<string, OtpChallenge>();

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [id, c] of challengeStore.entries()) {
    if (c.expiresAt < now) {
      challengeStore.delete(id);
    }
  }
}

/**
 * Generates a 6-digit numeric OTP challenge for a wallet address or user handle.
 */
export function generateOtpChallenge(identifier: string, purpose = "trade_execution"): {
  challengeId: string;
  expiresAt: number;
  code: string;
} {
  cleanExpiredChallenges();

  const id = identifier.trim().toLowerCase();
  // Generate random 6-digit numeric code
  const randomNum = parseInt(randomBytes(3).toString("hex"), 16) % 900000 + 100000;
  const code = randomNum.toString();

  const challengeId = `otp_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const expiresAt = Date.now() + OTP_TTL_MS;

  challengeStore.set(challengeId, {
    challengeId,
    identifier: id,
    code,
    purpose,
    expiresAt,
    attempts: 0,
  });

  return {
    challengeId,
    expiresAt,
    code,
  };
}

/**
 * Verifies a 6-digit OTP code against an active challenge and returns a signed authorization token.
 */
export function verifyOtpChallenge(challengeId: string, inputCode: string): OtpVerificationResult {
  cleanExpiredChallenges();

  const challenge = challengeStore.get(challengeId);
  if (!challenge) {
    return { valid: false, error: "OTP challenge has expired or does not exist." };
  }

  if (Date.now() > challenge.expiresAt) {
    challengeStore.delete(challengeId);
    return { valid: false, error: "OTP code has expired. Please request a new code." };
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    challengeStore.delete(challengeId);
    return { valid: false, error: "Maximum verification attempts exceeded. Challenge invalidated." };
  }

  challenge.attempts += 1;

  if (challenge.code !== inputCode.trim()) {
    return { valid: false, error: "Invalid OTP code. Please check and try again." };
  }

  // Code verified; invalidate challenge
  challengeStore.delete(challengeId);

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
