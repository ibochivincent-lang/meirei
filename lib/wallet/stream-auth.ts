import crypto from "node:crypto";

/**
 * Auth for app/api/internal/stellar-payment, the route the standalone
 * Horizon-streaming worker (workers/stellar-stream-worker.ts) calls to
 * report a payment it saw.
 *
 * Same shape and same fail-closed discipline as lib/cron/auth.ts: this route
 * can make the bot tell a real user that money arrived, so an unauthenticated
 * caller must never reach it, and "nobody configured the secret" must not
 * quietly mean "anyone can trigger it".
 */
export function isAuthorizedStreamWorker(request: Request): boolean {
  const secret = process.env.STELLAR_STREAM_WORKER_SECRET;
  if (!secret) {
    console.error("[stellar-stream] STELLAR_STREAM_WORKER_SECRET is not set — refusing");
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
