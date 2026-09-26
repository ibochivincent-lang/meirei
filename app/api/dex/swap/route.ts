import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const XLAYER_CHAIN_INDEX = "196";
const OKX_DEX_V6_BASE = "https://web3.okx.com";

/**
 * GET /api/dex/swap?fromToken=<addr>&toToken=<addr>&amount=<wei>&userWallet=<addr>&slippage=<num>
 *
 * Proxies the OKX DEX Aggregator v6 swap quote on X Layer (chainIndex 196)
 * with HMAC-SHA256 authentication.
 * Returns routerAddress and calldata so the client signs and broadcasts
 * the transaction directly from the user's connected wallet — non-custodial.
 * Author: IboTV
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fromTokenAddress = searchParams.get("fromToken");
  const toTokenAddress = searchParams.get("toToken");
  const amount = searchParams.get("amount"); // smallest unit (e.g. USDG 6 decimals)
  const userWalletAddress = searchParams.get("userWallet");
  const rawSlippage = searchParams.get("slippage") || "1";

  if (!fromTokenAddress || !toTokenAddress || !amount || !userWalletAddress) {
    return NextResponse.json(
      { error: "Missing required params: fromToken, toToken, amount, userWallet" },
      { status: 400 }
    );
  }

  // Convert decimal slippage (e.g. 0.05 or 0.01) to whole percentage for OKX v6 (e.g. 1 or 5)
  let slippagePercent = rawSlippage;
  const numSlippage = parseFloat(rawSlippage);
  if (!isNaN(numSlippage)) {
    if (numSlippage < 1 && numSlippage > 0) {
      slippagePercent = String(Math.round(numSlippage * 100));
    } else {
      slippagePercent = String(Math.round(numSlippage));
    }
  }

  const apiKey = process.env.OKX_API_KEY || "";
  const apiSecret = process.env.OKX_API_SECRET || process.env.OKX_SECRET_KEY || "";
  const passphrase = process.env.OKX_API_PASSPHRASE || process.env.OKX_PASSPHRASE || "";
  const projectId = process.env.OKX_PROJECT_ID || "";

  if (!apiKey || !apiSecret || !passphrase) {
    return NextResponse.json(
      { error: "OKX API credentials not configured in environment" },
      { status: 500 }
    );
  }

  try {
    const queryParams = new URLSearchParams({
      chainIndex: XLAYER_CHAIN_INDEX,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress,
      slippagePercent,
    });

    const path = `/api/v6/dex/aggregator/swap?${queryParams.toString()}`;
    const method = "GET";
    const timestamp = new Date().toISOString();

    const sign = crypto
      .createHmac("sha256", apiSecret)
      .update(timestamp + method + path)
      .digest("base64");

    const headers: Record<string, string> = {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    };

    if (projectId) {
      headers["OK-ACCESS-PROJECT"] = projectId;
    }

    const quoteRes = await fetch(`${OKX_DEX_V6_BASE}${path}`, {
      method,
      headers,
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

    if (quoteJson.code !== "0" || !quoteJson.data?.[0]) {
      return NextResponse.json(
        {
          error: `OKX DEX Aggregator returned error: ${quoteJson.msg || "Unknown error"}`,
          code: quoteJson.code,
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

    const dexList = Array.isArray(routerResult?.dexRouterList)
      ? routerResult.dexRouterList
          .map((r: { dexProtocol?: { dexName?: string } }) => r.dexProtocol?.dexName)
          .filter(Boolean)
          .join(" -> ")
      : "";

    return NextResponse.json({
      ok: true,
      routerAddress: tx.to as string,
      calldata: tx.data as string,
      value: tx.value || "0x0",
      gasEstimate: tx.gas,
      toAmount: routerResult?.toTokenAmount || tx.minReceiveAmount,
      minToAmount: tx.minReceiveAmount || routerResult?.toTokenAmount,
      priceImpact: routerResult?.priceImpactPercent || "0",
      dexName: dexList || "OKX DEX Aggregator",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to fetch DEX swap quote: ${msg}` },
      { status: 500 }
    );
  }
}
