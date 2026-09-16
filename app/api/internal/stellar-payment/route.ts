import { NextResponse } from "next/server";
import { isAuthorizedStreamWorker } from "@/lib/wallet/stream-auth";
import {
  processIncomingPayment,
  getStreamCursor,
  type IncomingPayment,
} from "@/lib/wallet/stellar-stream";

export const dynamic = "force-dynamic";

/**
 * GET /api/internal/stellar-payment
 *
 * Where the worker resumes from on startup. The DB cursor only needs to
 * cover WORKER PROCESS RESTARTS (a crash, a redeploy) — reconnects within a
 * single run are the Horizon SDK's own EventSource retry, tracked in-memory
 * by the stream() call itself, not this.
 */
export async function GET(request: Request) {
  if (!isAuthorizedStreamWorker(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = await getStreamCursor();
  return NextResponse.json({ cursor });
}

/**
 * POST /api/internal/stellar-payment
 *
 * Called by workers/stellar-stream-worker.ts — the standalone process that
 * holds the one long-lived Horizon payments stream Vercel's Functions can't
 * (see the migration plan's note on the 300s execution cap). This route is
 * the app-side half: it never talks to Horizon itself, it just runs the
 * "credit the user" logic for a payment the worker already saw.
 *
 * Verification happens before anything else and fails closed — the same
 * discipline the old Circle webhook route used, for the same reason: an
 * unauthenticated POST here could tell a real user that money they never
 * received has arrived.
 */
export async function POST(request: Request) {
  if (!isAuthorizedStreamWorker(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payment: IncomingPayment;
  try {
    payment = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await processIncomingPayment(payment);
  } catch (err) {
    console.error("[stellar-payment] processing error", err);
    // 500 so the worker's retry logic knows this attempt did not complete —
    // the cursor was deliberately not advanced for the same reason.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
