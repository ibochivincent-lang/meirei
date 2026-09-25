/**
 * Wallet Channel Linking & Unlinking API Endpoint
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Links and unlinks OKX Web3 wallet addresses to/from social bot users (WhatsApp / Telegram).
 */

import { NextRequest, NextResponse } from "next/server";
import { linkChannelWallet, unlinkChannelWallet } from "@/lib/auth/user_identity";
import { isValidEvmAddress } from "@/lib/wallet/xlayer";
import type { UserPrimaryChannel } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel = "whatsapp", handle, walletAddress, action } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "A valid channel handle or phone number is required." },
        { status: 400 }
      );
    }

    const validChannels: UserPrimaryChannel[] = ["whatsapp", "telegram", "web", "instagram"];
    const targetChannel: UserPrimaryChannel = validChannels.includes(channel) ? channel : "whatsapp";

    // Handle Unlink action
    if (action === "unlink") {
      const user = await unlinkChannelWallet({
        channel: targetChannel,
        handle: handle.trim(),
      });

      return NextResponse.json({
        ok: true,
        unlinked: true,
        channel: targetChannel,
        handle: handle.trim(),
        walletAddress: user.wallet_address,
        message: `Successfully unlinked wallet from ${targetChannel}.`,
      });
    }

    // Handle Link action
    if (!walletAddress || !isValidEvmAddress(walletAddress)) {
      return NextResponse.json(
        { error: "A valid 0x-prefixed EVM wallet address is required." },
        { status: 400 }
      );
    }

    const { signature, message, nonce } = body;

    // Cryptographic Ownership Verification (SIWE / EIP-4361)
    if (signature && message) {
      try {
        const { verifyMessage } = await import("viem");
        const isValid = await verifyMessage({
          address: walletAddress.trim() as `0x${string}`,
          message,
          signature: signature.trim() as `0x${string}`,
        });

        if (!isValid) {
          return NextResponse.json(
            {
              error: "Cryptographic signature verification failed. The recovered signer does not match the provided wallet address.",
            },
            { status: 401 }
          );
        }

        // Invalidate nonce in Redis to prevent replay
        if (nonce) {
          const redis = (await import("@/lib/redis/client")).getRedisClient();
          if (redis) {
            await redis.del(`link_nonce:${nonce}`).catch(() => {});
          }
        }
      } catch (verifyErr: unknown) {
        const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
        return NextResponse.json(
          { error: `Cryptographic verification error: ${msg}` },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error: "Signature and challenge message are required to verify non-custodial wallet ownership.",
        },
        { status: 401 }
      );
    }

    const user = await linkChannelWallet({
      channel: targetChannel,
      handle: handle.trim(),
      walletAddress: walletAddress.trim(),
    });

    return NextResponse.json({
      ok: true,
      channel: targetChannel,
      handle: handle.trim(),
      walletAddress: user.wallet_address,
      message: `Successfully verified and linked ${user.wallet_address} to ${targetChannel}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Wallet Link API] Error processing wallet linkage:", msg);
    return NextResponse.json(
      { error: "Internal error processing wallet linkage.", detail: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = (searchParams.get("channel") || "whatsapp") as UserPrimaryChannel;
    const handle = searchParams.get("handle") || "";

    if (!handle.trim()) {
      return NextResponse.json(
        { error: "A valid channel handle or phone number is required." },
        { status: 400 }
      );
    }

    const user = await unlinkChannelWallet({
      channel,
      handle: handle.trim(),
    });

    return NextResponse.json({
      ok: true,
      unlinked: true,
      channel,
      handle: handle.trim(),
      walletAddress: user.wallet_address,
      message: `Successfully unlinked wallet from ${channel}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Wallet Link API] Error unlinking wallet:", msg);
    return NextResponse.json(
      { error: "Internal error unlinking wallet address.", detail: msg },
      { status: 500 }
    );
  }
}
