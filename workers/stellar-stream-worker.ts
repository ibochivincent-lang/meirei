// workers/stellar-stream-worker.ts
//
// The always-on process Vercel's Functions can't be: it holds one long-lived
// Horizon SSE connection and forwards every incoming USDC-shaped payment to
// the Next.js app's internal API route for crediting. See the migration
// plan's note on why this can't live inside a Vercel Function — execution
// duration is capped (300s), and an indefinite SSE connection needs a
// runtime that doesn't recycle instances out from under it.
//
// Deploy this as its own small process (Fly.io, Railway, a bare VM — nothing
// exotic; it just needs to stay running and reach both Horizon and this
// app's APP_BASE_URL). It needs NO database or messaging credentials of its
// own: STELLAR_STREAM_WORKER_SECRET plus network access is the whole surface.
//
// Run with: tsx workers/stellar-stream-worker.ts

export {};

import { Horizon } from "@stellar/stellar-sdk";
import { horizonUrl } from "@/lib/wallet/network";
import type { IncomingPayment } from "@/lib/wallet/stellar-stream";

const APP_BASE_URL = requireEnv("APP_BASE_URL");
const WORKER_SECRET = requireEnv("STELLAR_STREAM_WORKER_SECRET");
const ENDPOINT = `${APP_BASE_URL.replace(/\/$/, "")}/api/internal/stellar-payment`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

async function fetchStartingCursor(): Promise<string> {
  const res = await fetch(ENDPOINT, {
    headers: { authorization: `Bearer ${WORKER_SECRET}` },
  });
  if (!res.ok) {
    throw new Error(`Fetching starting cursor failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { cursor: string };
  return body.cursor;
}

async function forwardPayment(payment: IncomingPayment): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${WORKER_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payment),
  });

  if (!res.ok) {
    // Logged, not thrown: the app-side route only advances its own cursor on
    // success, so a failed delivery here is safely retried the next time
    // this same operation is replayed — which happens automatically on the
    // NEXT worker restart, since the app's cursor was never advanced past it.
    // Within this run, the stream keeps flowing regardless of one delivery
    // failure; that is the correct tradeoff for a payments feed, where
    // stalling everything behind one bad delivery would be worse than
    // occasionally relying on the restart-level retry.
    console.error("[stellar-stream-worker] delivery failed", {
      operationId: payment.operationId,
      status: res.status,
    });
  }
}

async function main() {
  const server = new Horizon.Server(horizonUrl());
  const cursor = await fetchStartingCursor();

  console.log("[stellar-stream-worker] starting", { cursor, horizon: horizonUrl() });

  server
    .payments()
    .cursor(cursor)
    .stream({
      onmessage: (record) => {
        if (!("type" in record) || record.type !== "payment") {
          // create_account, path_payment, account_merge, etc. — this app
          // only ever sends and expects classic Payment operations.
          return;
        }

        const payment: IncomingPayment = {
          operationId: record.id,
          pagingToken: record.paging_token,
          txHash: record.transaction_hash,
          from: record.from,
          to: record.to,
          assetType: record.asset_type,
          assetCode: record.asset_code,
          assetIssuer: record.asset_issuer,
          amount: record.amount,
        };

        void forwardPayment(payment);
      },
      onerror: (event) => {
        // The SDK's own EventSource reconnects on transient errors using its
        // in-memory last-event-id — this is diagnostic logging, not a signal
        // to restart the process.
        console.error("[stellar-stream-worker] stream error", event);
      },
    });
}

main().catch((err) => {
  console.error("[stellar-stream-worker] fatal", err);
  process.exit(1);
});
