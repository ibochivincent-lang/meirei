import { NextRequest, NextResponse } from "next/server";

const XLAYER_CHAIN_ID = "196";
const OKX_DEX_API_BASE = "https://www.okx.com/api/v5/dex/aggregator";

/**
 * GET /api/dex/swap?fromToken=<addr>&toToken=<addr>&amount=<wei>&userWallet=<addr>
 *
 * Proxies the OKX DEX Aggregator swap quote on X Layer (chain 196).
 * Returns routerAddress and calldata so the client can sign and broadcast
 * the transaction directly from the user's wallet — no server custody.
 *
 * OKX DEX Aggregator docs:
 * https://www.okx.com/web3/build/docs/waas/dex-get-swap-data
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fromTokenAddress = searchParams.get("fromToken");
  const toTokenAddress = searchParams.get("toToken");
  const amount = searchParams.get("amount"); // in smallest unit (e.g. USDG in 6-decimal units)
  const userWalletAddress = searchParams.get("userWallet");
  const slippage = searchParams.get("slippage") || "0.05"; // 5% default

  if (!fromTokenAddress || !toTokenAddress || !amount || !userWalletAddress) {
    return NextResponse.json(
      { error: "Missing required params: fromToken, toToken, amount, userWallet" },
      { status: 400 }
    );
  }

  try {
    // 1. Get a swap quote from the OKX DEX Aggregator (no API key required for quotes)
    const quoteParams = new URLSearchParams({
      chainId: XLAYER_CHAIN_ID,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress,
      slippage,
    });

    const quoteUrl = `${OKX_DEX_API_BASE}/swap?${quoteParams.toString()}`;

    const quoteRes = await fetch(quoteUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Do not cache swap quotes — they expire quickly
      next: { revalidate: 0 },
    });

    if (!quoteRes.ok) {
      const errBody = await quoteRes.text();
      return NextResponse.json(
        { error: `OKX DEX Aggregator error: ${quoteRes.status}`, details: errBody },
        { status: 502 }
      );
    }

    const quoteJson = await quoteRes.json();

    // OKX DEX API returns: { code: "0", data: [{ tx: { to, data, value, gas }, routerResult: {...} }] }
    if (quoteJson.code !== "0" || !quoteJson.data?.[0]) {
      return NextResponse.json(
        {
          error: `OKX DEX Aggregator returned error: ${quoteJson.msg || "Unknown error"}`,
          raw: quoteJson,
        },
        { status: 422 }
      );
    }

    const swapData = quoteJson.data[0];
    const tx = swapData.tx;
    const routerResult = swapData.routerResult;

    if (!tx?.to || !tx?.data) {
      return NextResponse.json(
        { error: "OKX DEX Aggregator did not return valid tx calldata", raw: quoteJson },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      routerAddress: tx.to as string,
      calldata: tx.data as string,
      value: tx.value || "0x0",
      gasEstimate: tx.gas,
      toAmount: routerResult?.toTokenAmount,
      minToAmount: routerResult?.minimumReceived,
      priceImpact: routerResult?.priceImpactPercentage,
      dexName: routerResult?.dexRouterList?.[0]?.router,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to fetch DEX swap quote: ${msg}` },
      { status: 500 }
    );
  }
}
