import { NextRequest, NextResponse } from "next/server";
import { generateOtpChallenge, verifyOtpChallenge } from "@/lib/auth/otp";
import { checkRateLimit, getClientIp } from "@/lib/security/rate_limiter";
import { validatePayloadSize } from "@/lib/security/payload_guard";
import { logger } from "@/lib/observability/logger";

export async function POST(req: NextRequest) {
  try {
    const payloadCheck = validatePayloadSize(req);
    if (!payloadCheck.valid) {
      return NextResponse.json({ error: payloadCheck.error }, { status: 413 });
    }

    const clientIp = getClientIp(req);
    const body = await req.json();
    const action = (body.action || "").trim().toLowerCase();

    if (action === "request") {
      const identifier = (body.email || body.identifier || body.walletAddress || "").trim();
      if (!identifier) {
        return NextResponse.json(
          { error: "Identifier (email address, wallet address, or user handle) is required." },
          { status: 400 }
        );
      }

      const rateCheck = checkRateLimit(`${clientIp}:${identifier}`, "otp");
      if (!rateCheck.allowed) {
        logger.warn("OtpAPI", "Rate limit exceeded for OTP challenge generation", { identifier, clientIp });
        return NextResponse.json(
          { error: `Too many OTP requests. Please wait ${rateCheck.resetSeconds}s before requesting again.` },
          { status: 429, headers: { "Retry-After": String(rateCheck.resetSeconds) } }
        );
      }

      const purpose = body.purpose || "trade_execution";
      const challenge = await generateOtpChallenge(identifier, purpose);

      const isEmail = identifier.includes("@");
      const maskedId = isEmail
        ? identifier.replace(/^(.)(.*)(@.*)$/, (_: string, a: string, b: string, c: string) => `${a}${"*".repeat(Math.min(b.length, 5))}${c}`)
        : identifier.length > 10
        ? `${identifier.slice(0, 6)}...${identifier.slice(-4)}`
        : identifier;

      return NextResponse.json({
        ok: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        message: `Security 2FA OTP generated for ${maskedId}. Valid for 5 minutes.`,
        // In local development or self-custodial web sessions, provide the verification code for immediate client confirmation
        devCode: process.env.NODE_ENV !== "production" ? challenge.code : undefined,
      });
    }

    if (action === "verify") {
      const challengeId = (body.challengeId || "").trim();
      const code = (body.code || "").trim();

      if (!challengeId || !code) {
        return NextResponse.json(
          { error: "Both challengeId and 6-digit OTP code are required." },
          { status: 400 }
        );
      }

      const result = await verifyOtpChallenge(challengeId, code);

      if (!result.valid) {
        return NextResponse.json(
          { ok: false, error: result.error || "Invalid OTP code." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        ok: true,
        otpToken: result.otpToken,
        message: "OTP successfully verified. Trading authorization granted for 10 minutes.",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'request' or 'verify'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[OTP API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process OTP request", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
