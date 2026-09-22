/**
 * OKX X Layer Real-Time On-Chain Wallet Balance Endpoint
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 * Author: IboTV <290086463+ibochivincent-lang@users.noreply.github.com>
 *
 * Queries authentic on-chain balances from OKX X Layer JSON-RPC.
 * Returns real USDG, USDC, OKB, and allowlisted tokenized equities (NVDAx, AAPLx, etc.).
 * No fake data or simulated balances.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchLiveXLayerBalances, isValidEvmAddress } from "@/lib/wallet/xlayer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";

    if (!address || !isValidEvmAddress(address)) {
      return NextResponse.json({
        ok: false,
        error: "Valid EVM wallet address is required.",
        walletAddress: address,
        totalValueUsd: 0,
        usdgBalance: 0,
        okbBalance: 0,
        holdings: [],
      });
    }

    const snapshot = await fetchLiveXLayerBalances(address);

    return NextResponse.json({
      ok: true,
      walletAddress: snapshot.walletAddress,
      totalValueUsd: snapshot.totalValueUsd,
      usdgBalance: snapshot.usdgBalance,
      usdcBalance: snapshot.usdcBalance,
      okbBalance: snapshot.okbBalance,
      holdings: snapshot.holdings,
      timestamp: snapshot.timestamp,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to query on-chain balances on X Layer: ${msg}`,
        totalValueUsd: 0,
        usdgBalance: 0,
        holdings: [],
      },
      { status: 500 }
    );
  }
}
