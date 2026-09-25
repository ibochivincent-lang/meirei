/**
 * Non-Custodial Wallet Linking Challenge Endpoint
 * Platform: OKX X Layer (Chain ID 196)
 *
 * Generates EIP-4361 / SIWE style cryptographic nonce challenges
 * for verifying wallet ownership before linking to social channels or sessions.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRedisClient } from "@/lib/redis/client";
import { isValidEvmAddress } from "@/lib/wallet/xlayer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = (body.walletAddress || "").trim().toLowerCase();
    const channel = (body.channel || "web").trim();
    const handle = (body.handle || "").trim();

    if (walletAddress && !isValidEvmAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid EVM wallet address format." },
        { status: 400 }
      );
    }

    const nonce = crypto.randomBytes(16).toString("hex");
    const issuedAt = new Date().toISOString();
    const message = [
      "Meirei Non-Custodial Ownership Verification",
      "",
      "Network: OKX X Layer (Chain ID 196)",
      `Wallet: ${walletAddress || "Web3 Wallet"}`,
      `Channel: ${channel}`,
      `Handle: ${handle || "anonymous"}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
      "",
      "Sign this message to prove non-custodial ownership of your wallet.",
      "This action does not execute an on-chain transaction and costs zero gas.",
    ].join("\n");

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(
          `link_nonce:${nonce}`,
          JSON.stringify({ walletAddress, channel, handle, issuedAt }),
          { ex: 300 }
        );
      } catch (redisErr) {
        console.warn("[Challenge API] Redis write notice:", redisErr);
      }
    }

    return NextResponse.json({
      ok: true,
      nonce,
      message,
      issuedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to generate linkage challenge", detail: msg },
      { status: 500 }
    );
  }
}
