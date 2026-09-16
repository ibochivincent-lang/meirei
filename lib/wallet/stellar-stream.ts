import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findUserByWalletAddress } from "@/lib/users/repository";
import { notifyUser, notifyUserWithImage } from "@/lib/messaging/notify";
import { recordTransaction } from "@/lib/transactions/repository";
import { getUsdToNgnRate, usdToNgn } from "@/lib/fx/naira";
import { getFormattedBalanceLines } from "@/lib/wallet/stellar";
import { explorerTxUrl, usdcAsset } from "@/lib/wallet/network";
import { factorCount } from "@/lib/auth/factors";
import { hasPanicCode, issuePanicCode } from "@/lib/security/panic-code";
import type { tellaUser } from "@/lib/supabase/types";

/**
 * Processing for incoming Stellar payments — the replacement for the deleted
 * Circle webhook's `transactions.inbound` handler.
 *
 * Stellar has no push notification for "someone paid you" the way Circle's
 * webhook did. Instead, workers/stellar-stream-worker.ts holds one global
 * Horizon payments stream and POSTs each USDC payment it sees to
 * app/api/internal/stellar-payment/route.ts, which calls processIncomingPayment
 * below. Everything about CREDITING the user (notify, record history, offer
 * account security) is ported near-verbatim from the old route's
 * handleInboundTransaction; what's new is entirely about DISCOVERING the
 * payment in the first place.
 */

const CURSOR_TABLE = "tella_stellar_stream_cursor";
const CURSOR_ROW_ID = "singleton";
const PROCESSED_TABLE = "tella_processed_stellar_operation";

/** Where the stream should resume from. "now" is Horizon's own "start fresh". */
export async function getStreamCursor(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(CURSOR_TABLE)
    .select("last_paging_token")
    .eq("id", CURSOR_ROW_ID)
    .maybeSingle();

  if (error) throw new Error(`getStreamCursor failed: ${error.message}`);
  return (data as { last_paging_token: string } | null)?.last_paging_token ?? "now";
}

/**
 * Advances the resume position. Called only AFTER a payment has been fully
 * handled (or definitively skipped) — never before — so a crash mid-handling
 * replays from the same point rather than skipping the payment it died on.
 */
export async function setStreamCursor(pagingToken: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(CURSOR_TABLE).upsert({
    id: CURSOR_ROW_ID,
    last_paging_token: pagingToken,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`setStreamCursor failed: ${error.message}`);
}

/**
 * Once-only processing for a Stellar payment operation.
 *
 * Simpler than Circle's tella_processed_notification: a Stellar operation id
 * is one-shot and globally unique — nothing re-delivers it the way Circle
 * reused a notification id across a transaction's state sequence — so the
 * key is the operation id alone, no composite needed.
 */
async function claimOperation(operationId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(PROCESSED_TABLE)
    .insert({ operation_id: operationId });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`claimOperation failed: ${error.message}`);
}

/** Never throws — see processIncomingPayment's comment for why this exists. */
async function releaseOperation(operationId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(PROCESSED_TABLE)
      .delete()
      .eq("operation_id", operationId);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[stellar-stream] claim release failed", { operationId, err });
  }
}

export interface IncomingPayment {
  /** Horizon operation id — globally unique, one-shot. */
  operationId: string;
  /** Horizon paging token for this operation — the stream's resume position. */
  pagingToken: string;
  txHash: string;
  from: string;
  to: string;
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  amount: string;
}

/**
 * Handles one payment operation seen by the stream, exactly once.
 *
 * Two gates, same order as the old route's for the same reason: the asset
 * check is first because failing it means there's nothing to credit at all;
 * the claim is second because claiming an operation this deployment doesn't
 * even recognize as its own USDC would burn a key for nothing.
 */
export async function processIncomingPayment(payment: IncomingPayment): Promise<void> {
  const { code, issuer } = usdcAsset();
  const isConfiguredUsdc =
    payment.assetType !== "native" &&
    payment.assetCode === code &&
    payment.assetIssuer === issuer;

  if (!isConfiguredUsdc) {
    // Not our USDC — including a lookalike asset code from a different
    // issuer (see lib/wallet/stellar.ts's balance-filtering comment for why
    // that distinction matters). Nothing to credit; still advance past it.
    await setStreamCursor(payment.pagingToken);
    return;
  }

  const claimed = await claimOperation(payment.operationId);
  if (!claimed) {
    console.log("[stellar-stream] duplicate operation ignored", {
      operationId: payment.operationId,
    });
    await setStreamCursor(payment.pagingToken);
    return;
  }

  try {
    await handleIncomingUsdcPayment(payment);
  } catch (err) {
    // Hand the claim back: a transient failure here (a WhatsApp send that
    // 503s, a database blip) must not permanently swallow the only
    // notification a user was ever going to get about their money. The
    // cursor has NOT been advanced yet, so the next stream connection
    // replays from before this operation and retries it in full.
    await releaseOperation(payment.operationId);
    throw err;
  }

  await setStreamCursor(payment.pagingToken);
}

async function handleIncomingUsdcPayment(payment: IncomingPayment): Promise<void> {
  const user = await findUserByWalletAddress(payment.to);
  if (!user) {
    console.warn("[stellar-stream] no user for destination address", {
      address: shortenAddress(payment.to),
    });
    return;
  }

  const senderUser = await findUserByWalletAddress(payment.from);
  const sourceLabel = senderUser?.profile_name ?? shortenAddress(payment.from);

  let balanceLines: string[] = [];
  try {
    balanceLines = await getFormattedBalanceLines(payment.to);
  } catch (err) {
    console.error("[stellar-stream] balance fetch for notification image failed", {
      userId: user.id,
      err,
    });
  }

  const explorerLink = explorerTxUrl(payment.txHash);

  const fallbackText = [
    `💰 Received ${payment.amount} USDC`,
    "",
    `From: ${sourceLabel}`,
    "",
    explorerLink,
    "",
    `Ask me "what's my balance?" to see your updated total.`,
  ].join("\n");

  try {
    const imageUrl = buildReceivedImageUrl({
      amount: payment.amount,
      token: "USDC",
      sender: sourceLabel,
      balanceLines,
    });
    const caption = [`💰 Received ${payment.amount} USDC from ${sourceLabel}`, explorerLink].join(
      "\n",
    );
    await notifyUserWithImage({ user, imageUrl, caption });
  } catch (err) {
    console.error("[stellar-stream] image notify failed, falling back to text", {
      userId: user.id,
      err,
    });
    await notifyUser({ user, body: fallbackText });
  }

  try {
    const rate = await getUsdToNgnRate();
    await recordTransaction({
      userId: user.id,
      direction: "received",
      amountUsdc: payment.amount,
      amountNgn: String(usdToNgn(parseFloat(payment.amount), rate)),
      counterpartyLabel: sourceLabel,
      counterpartyAddress: payment.from,
      txHash: payment.txHash,
      // Stored so the unique index from migration 0028 can refuse a second
      // row for this same payment even if the claim above is somehow lost.
      stellarOperationId: payment.operationId,
      status: "complete",
    });
  } catch (err) {
    console.error("[stellar-stream] transaction record failed", { userId: user.id, err });
  }

  await maybeOfferAccountSecurity(user);

  console.log("[stellar-stream] notified user of inbound", {
    userId: user.id,
    amount: payment.amount,
  });
}

/**
 * Offer to secure the account, once, at the first moment the user has
 * something to lose. Ported verbatim from the old circle-webhook route —
 * this logic has nothing to do with which chain the money arrived on.
 */
async function maybeOfferAccountSecurity(user: tellaUser): Promise<void> {
  try {
    if (hasPanicCode(user)) return;
    if ((await factorCount(user)) > 0) return;

    const code = await issuePanicCode(user.id);

    await notifyUser({
      user,
      body: [
        "🔐 One thing worth doing now you're holding money.",
        "",
        "Right now anyone with access to your chat can send from your wallet. Next time you send, I'll ask you to set up Face ID or a PIN — that takes about ten seconds and it's worth doing.",
        "",
        "In the meantime, here's your panic code:",
        "",
        `*${code}*`,
        "",
        "Save it somewhere that isn't this phone. If your phone is ever lost or stolen, go to " +
          `${(process.env.APP_BASE_URL ?? "").replace(/\/$/, "")}/panic` +
          " from any device, enter your number and this code, and everything stops leaving your wallet.",
        "",
        "It can only freeze. It can't spend, and it can't unfreeze — so it's safe to write down.",
      ].join("\n"),
    });

    console.log("[stellar-stream] offered account security", { userId: user.id });
  } catch (err) {
    // Never let this break a receipt notification. The money arriving is the
    // important message; this is the useful one that can wait for next time.
    console.error("[stellar-stream] security offer failed", { userId: user.id, err });
  }
}

/** "GABCDEF...WXYZ" → "GABCDE…WXYZ" */
function shortenAddress(address: string | undefined): string {
  if (!address) return "an external wallet";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Builds the absolute URL for the "money received" notification image
 * (app/api/notifications/received-image), which the messaging providers
 * fetch directly over HTTPS to deliver as chat media.
 */
function buildReceivedImageUrl(params: {
  amount: string;
  token: string;
  sender: string;
  balanceLines: string[];
}): string {
  const base = process.env.APP_BASE_URL;
  if (!base) {
    throw new Error("Missing APP_BASE_URL environment variable");
  }
  const qs = new URLSearchParams({
    amount: params.amount,
    token: params.token,
    sender: params.sender,
    balances: params.balanceLines.join(","),
  });
  return `${base.replace(/\/$/, "")}/api/notifications/received-image?${qs}`;
}
