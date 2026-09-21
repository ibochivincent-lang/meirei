/**
 * Wallet Channel Linking API Endpoint
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Links an OKX Web3 wallet address to a social bot user (WhatsApp / Telegram).
 */

import { NextRequest, NextResponse } from "next/server";
import { linkChannelWallet } from "@/lib/auth/user_identity";
import { isValidEvmAddress } from "@/lib/wallet/xlayer";
import type { UserPrimaryChannel } from "@/lib/supabase/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel = "whatsapp", handle, walletAddress } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "A valid channel handle or phone number is required." },
        { status: 400 }
      );
    }

    if (!walletAddress || !isValidEvmAddress(walletAddress)) {
      return NextResponse.json(
        { error: "A valid 0x-prefixed EVM wallet address is required." },
        { status: 400 }
      );
    }

    const validChannels: UserPrimaryChannel[] = ["whatsapp", "telegram", "web", "instagram"];
    const targetChannel: UserPrimaryChannel = validChannels.includes(channel) ? channel : "whatsapp";

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
      message: `Successfully linked ${user.wallet_address} to ${targetChannel}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Wallet Link API] Error linking wallet:", msg);
    return NextResponse.json(
      { error: "Internal error linking wallet address.", detail: msg },
      { status: 500 }
    );
  }
}
