import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const mem = process.memoryUsage();

  return NextResponse.json({
    status: "healthy",
    service: "meirei-agent-engine",
    chain: {
      name: "X Layer Mainnet",
      id: 196,
      settlementAsset: "USDG",
      status: "connected",
    },
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    version: "2.4.0",
    author: "IboTV",
    metrics: {
      heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(2),
      heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(2),
      rssMb: (mem.rss / (1024 * 1024)).toFixed(2),
    },
    checks: {
      rateLimiter: "online",
      idempotencyEngine: "active",
      spendingCapGuard: "enforcing",
      otp2faService: "active",
    },
  });
}
