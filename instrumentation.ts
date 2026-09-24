import { assertSecureOtpSecret } from "@/lib/auth/otp";

/**
 * Next.js Server Startup Hook
 * Refuses to boot in production if critical security guards fail (e.g. OTP_SECRET < 32 bytes or placeholder).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Assert production secret security before any request can be accepted
    assertSecureOtpSecret();
  }
}
