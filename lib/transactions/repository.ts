import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { tellaTransaction, TransactionDirection } from "@/lib/supabase/types";

export async function recordTransaction({
  userId,
  direction,
  amountUsdc,
  amountNgn,
  token = "USDC",
  counterpartyLabel,
  counterpartyAddress,
  txHash = null,
  stellarOperationId = null,
  status,
}: {
  userId: string;
  direction: TransactionDirection;
  amountUsdc: string;
  amountNgn: string;
  token?: string;
  counterpartyLabel: string | null;
  counterpartyAddress: string | null;
  txHash?: string | null;
  stellarOperationId?: string | null;
  status: "submitted" | "complete";
}): Promise<tellaTransaction> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tella_transactions")
    .insert({
      user_id: userId,
      direction,
      amount_usdc: amountUsdc,
      amount_ngn: amountNgn,
      token,
      counterparty_label: counterpartyLabel,
      counterparty_address: counterpartyAddress,
      tx_hash: txHash,
      stellar_operation_id: stellarOperationId,
      status,
    })
    .select()
    .single();

  if (error) throw new Error(`recordTransaction failed: ${error.message}`);
  return data as tellaTransaction;
}

/**
 * Reserve a send against the daily cap and record it, in one atomic step.
 *
 * This is the authoritative daily-cap gate. checkSendLimits still runs its own
 * daily arithmetic and still produces the message the user reads, but that
 * check is advisory in the same sense the compose-time one is: it reads a
 * total, and between reading it and the transfer happening, another confirm
 * can pass the identical read. Only this call is safe under a burst, because
 * the check and the write are the same statement — see
 * migrations/0022_spend_reservation.sql.
 *
 * Returns the id of the tella_transactions row it created, which the caller
 * must then either complete (attachCircleTransactionId) or, if the transfer
 * definitely failed, remove (releaseReservedSend).
 *
 * FAILS CLOSED. A missing function, an unreachable database, or a malformed
 * response all refuse the send. "We could not establish that this is within
 * your limit" must never resolve to "so go ahead", which is the same rule
 * checkSendLimits and recordAuthAttempt already follow.
 */
/**
 * The outcome of a reservation attempt.
 *
 * Discriminated rather than a bare boolean, because the two refusals need
 * different words. "You are over your daily limit" and "I could not check"
 * are different facts about someone's money, and collapsing them produced the
 * worse of the two: a fail-closed database error rendered as "that would put
 * you over the 500 USDC daily limit — you've sent 0 USDC in the last 24
 * hours", which is wrong and impossible to act on.
 */
export type SpendReservation =
  | { ok: true; transactionId: string; already: number }
  | { ok: false; reason: "over_cap"; already: number }
  | { ok: false; reason: "unavailable" };

/**
 * Infinity has no numeric representation to send over the wire, and an
 * enormous stand-in would be indistinguishable from a real cap somebody set.
 * Null is the RPC's own word for "no cap".
 */
export function capParam(dailyCap: number): number | null {
  return Number.isFinite(dailyCap) ? dailyCap : null;
}

/**
 * Read what the RPC returned. Pure, so every shape below — including the ones
 * that must fail closed — is testable without a database.
 *
 * supabase-js hands back either a single row or a one-element array depending
 * on how the function is declared, and anything it cannot parse arrives as
 * null. All three are handled here rather than at the call site.
 */
export function parseReservationRow(data: unknown): SpendReservation {
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed?: unknown; transaction_id?: unknown; already?: unknown }
    | null
    | undefined;

  if (!row || typeof row !== "object") return { ok: false, reason: "unavailable" };

  const alreadyNum = Number(row.already);
  const already = Number.isFinite(alreadyNum) ? alreadyNum : 0;

  if (row.allowed !== true) return { ok: false, reason: "over_cap", already };

  // Allowed with no row id is incoherent — the function inserts before it says
  // yes. Refusing is the only safe reading: proceeding would move money with
  // nothing reserved and nothing to complete or roll back afterwards.
  if (typeof row.transaction_id !== "string" || !row.transaction_id) {
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, transactionId: row.transaction_id, already };
}

export async function reserveSend({
  userId,
  amountUsdc,
  amountNgn,
  dailyCap,
  windowHours,
  counterpartyLabel,
  counterpartyAddress,
  excludeHeldSendId,
}: {
  userId: string;
  amountUsdc: string;
  amountNgn: string;
  /** Infinity for "no cap" — converted to null, which is what the RPC reads. */
  dailyCap: number;
  windowHours: number;
  counterpartyLabel: string | null;
  counterpartyAddress: string | null;
  excludeHeldSendId?: string;
}): Promise<SpendReservation> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("tella_reserve_daily_spend", {
    p_user_id: userId,
    p_amount_usdc: amountUsdc,
    p_amount_ngn: amountNgn,
    p_cap: capParam(dailyCap),
    p_window: `${windowHours} hours`,
    p_counterparty_label: counterpartyLabel,
    p_counterparty_address: counterpartyAddress,
    p_exclude_held_send_id: excludeHeldSendId ?? null,
  });

  if (error) {
    console.error("[transactions] spend reservation failed, refusing send", {
      userId,
      message: error.message,
    });
    return { ok: false, reason: "unavailable" };
  }

  const parsed = parseReservationRow(data);
  if (!parsed.ok && parsed.reason === "unavailable") {
    console.error("[transactions] spend reservation returned no usable row", { userId });
  }
  return parsed;
}

/**
 * Undo a reservation for a transfer that definitely did not happen.
 *
 * Only ever called for an unambiguous rejection — isAmbiguousFailure said the
 * request never reached Circle. A transfer whose outcome is UNKNOWN keeps its
 * row on purpose: it may have moved money, so it must keep consuming the
 * allowance and stay visible in history until a person reconciles it.
 */
export async function releaseReservedSend(transactionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tella_transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    // Never throws. The transfer already failed and the user is being told so;
    // a stale row overstates what they have spent, which is the safe direction
    // and a smaller problem than turning a handled failure into an exception.
    console.error("[transactions] releasing reservation failed", {
      transactionId,
      error: error.message,
    });
  }
}

/**
 * Persists a built-and-signed payment's XDR onto its reservation row, BEFORE
 * that payment is submitted.
 *
 * Stellar has no server-assigned idempotency key. Safety instead comes from
 * the transaction's own sequence number (a signed envelope can only ever
 * apply once) plus Horizon returning the ORIGINAL result if the exact same
 * signed XDR is resubmitted. So this is what lets a crash between building
 * and submitting retry safely: reload this row, resubmit the SAME xdr,
 * rather than building a fresh one against a sequence number that may have
 * already advanced — which would mint a genuinely new second payment.
 */
export async function attachStellarTxXdr(
  transactionId: string,
  xdr: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tella_transactions")
    .update({ stellar_tx_xdr: xdr })
    .eq("id", transactionId);

  if (error) {
    throw new Error(`attachStellarTxXdr failed: ${error.message}`);
  }
}

/**
 * Completes a reservation once its payment has been submitted successfully.
 *
 * Unlike Circle's async model — submit now, learn the real outcome later via
 * a webhook (attachCircleTransactionId, then markOutboundComplete once the
 * hash arrived) — Stellar's submitTransaction is SYNCHRONOUS: the hash and
 * the outcome are both known the moment this call is made. So there is no
 * separate "mark complete" step to run later; this is that step, run inline.
 */
export async function completeStellarSend(
  transactionId: string,
  { txHash, operationId }: { txHash: string; operationId: string },
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tella_transactions")
    .update({
      status: "complete",
      tx_hash: txHash,
      stellar_operation_id: operationId,
    })
    .eq("id", transactionId);

  if (error) {
    // Bookkeeping, after the money has moved. Logged, never thrown.
    console.error("[transactions] completing stellar send failed", {
      transactionId,
      error: error.message,
    });
  }
}

export async function listRecentTransactions(
  userId: string,
  limit = 10,
): Promise<tellaTransaction[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tella_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listRecentTransactions failed: ${error.message}`);
  return (data as tellaTransaction[]) ?? [];
}

/**
 * Total USDC this user has sent in the trailing `hours` window.
 *
 * Counts both `submitted` and `complete` rows: a send that's been handed to
 * Circle but hasn't confirmed yet has still left the wallet as far as a
 * spending limit is concerned. Excluding it would let someone burst past
 * the daily cap in the confirmation gap.
 */
export async function sumSentUsdcSince(
  userId: string,
  hours: number,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("tella_transactions")
    .select("amount_usdc")
    .eq("user_id", userId)
    .eq("direction", "sent")
    .gte("created_at", since);

  if (error) throw new Error(`sumSentUsdcSince failed: ${error.message}`);

  return ((data as { amount_usdc: string }[]) ?? []).reduce((sum, row) => {
    const n = parseFloat(row.amount_usdc);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

