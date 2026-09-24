import { NextResponse } from "next/server";
import { fetchAllStockPrices } from "@/src/onchainos";

export async function GET() {
  try {
    const stocks = await fetchAllStockPrices();
    return NextResponse.json({
      ok: true,
      chain: 196,
      chainAlias: "xlayer",
      stocks,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch stock prices" },
      { status: 502 }
    );
  }
}
