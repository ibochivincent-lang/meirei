import { NextResponse } from "next/server";
import { getMetricsSummary } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/metrics
 * Institutional observability endpoint exposing live conversion rates,
 * OTP failure rates, webhook deduplication rates, and execution counters.
 */
export async function GET() {
  try {
    const summary = await getMetricsSummary();
    return NextResponse.json({
      ok: true,
      service: "meirei-xlayer-agent",
      network: "OKX X Layer (Chain ID 196)",
      settlementAsset: "USDG",
      metrics: summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
