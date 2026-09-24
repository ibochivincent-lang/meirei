import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertSecureOtpSecret } from "../../lib/auth/otp";

describe("Production Startup Guard (assertSecureOtpSecret)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("permits safe execution in non-production environments", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.OTP_SECRET = "short";
    expect(() => assertSecureOtpSecret()).not.toThrow();
  });

  it("throws fatal error in production when OTP_SECRET is shorter than 32 bytes", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.OTP_SECRET = "too_short_secret_under_32";
    expect(() => assertSecureOtpSecret()).toThrow(/at least 32 bytes/);
  });

  it("throws fatal error in production when OTP_SECRET is a placeholder", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.OTP_SECRET = "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_48";
    expect(() => assertSecureOtpSecret()).toThrow(/insecure pattern/);
  });

  it("succeeds in production when OTP_SECRET is a genuine high-entropy secret >= 32 bytes", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.OTP_SECRET = "mK8zV2xL5qR9tY3wP7bN1cA4dF6gH8jK0mZ2xC4vB6nN8mK0pQ2wE4rT6yU8iO0p";
    expect(() => assertSecureOtpSecret()).not.toThrow();
  });
});
