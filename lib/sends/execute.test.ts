/**
 * Tests for the pure parts of the send path. Runner-free — run with
 * `pnpm test`. Exits non-zero on any failure.
 *
 * The classification below decides whether a user is told "your balance is
 * unchanged" or "I can't tell whether that went through". Getting it wrong
 * in the safe direction costs a balance check; getting it wrong in the
 * other direction means telling someone their money didn't move when it
 * did, and they send again. That asymmetry is the whole design here, so
 * these cases are worth pinning down.
 */

import {
  isAmbiguousFailure,
  formatSendResultForChat,
  sendFailureStatus,
} from "./execute";
import { TransactionFailedError } from "@stellar/stellar-sdk";

/** A TransactionFailedError, without needing a real Horizon response object. */
function transactionFailed(resultCode: string): TransactionFailedError {
  const err = new TransactionFailedError("Transaction Failed", {
    status: 400,
    data: { extras: { result_codes: { transaction: resultCode }, envelope_xdr: "", result_xdr: "" } },
  });
  return err;
}

let passed = 0;
const failures: string[] = [];

function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failures.push(
      `  ✗ ${name}\n      got:      ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(expected)}`,
    );
  }
}

/* ---------- isAmbiguousFailure ---------- */

// Definite rejections: Horizon relayed a real verdict from stellar-core.
check(
  "op_underfunded is a definite rejection",
  isAmbiguousFailure(transactionFailed("tx_failed")),
  false,
);
check(
  "tx_bad_seq is a definite rejection",
  isAmbiguousFailure(transactionFailed("tx_bad_seq")),
  false,
);
check(
  "tx_insufficient_fee is a definite rejection",
  isAmbiguousFailure(transactionFailed("tx_insufficient_fee")),
  false,
);

// Ambiguous: no verdict ever arrived, so the transaction may still have
// reached the network.
check("a generic Horizon 5xx is ambiguous", isAmbiguousFailure({ response: { status: 500 } }), true);
check("a rate limit is ambiguous", isAmbiguousFailure({ response: { status: 429 } }), true);
check("timeout with no response is ambiguous", isAmbiguousFailure(new Error("ETIMEDOUT")), true);
check("null error is ambiguous", isAmbiguousFailure(null), true);
check("undefined error is ambiguous", isAmbiguousFailure(undefined), true);
check("string error is ambiguous", isAmbiguousFailure("socket hang up"), true);

/* ---------- formatSendResultForChat ---------- */

const unchanged = "Your balance is unchanged";

check(
  "a definite failure may say the balance is unchanged",
  formatSendResultForChat({ ok: false, reason: "transfer_failed" }).includes(unchanged),
  true,
);
check(
  "an ambiguous failure must NOT say the balance is unchanged",
  formatSendResultForChat({ ok: false, reason: "transfer_unknown" }).includes(unchanged),
  false,
);
check(
  "an ambiguous failure tells the user to check their balance",
  formatSendResultForChat({ ok: false, reason: "transfer_unknown" })
    .toLowerCase()
    .includes("balance"),
  true,
);
check(
  "a duplicate confirm says it did not send twice",
  formatSendResultForChat({ ok: false, reason: "already_used" }).includes("twice"),
  true,
);
check(
  "an over-cap send explains the cap",
  formatSendResultForChat({
    ok: false,
    reason: "limit",
    failure: { kind: "over_per_tx", cap: 100, requested: 250 },
  }).includes("100"),
  true,
);
check(
  "insufficient balance reports what is actually available",
  formatSendResultForChat({
    ok: false,
    reason: "limit",
    failure: { kind: "insufficient", available: 3.5, requested: 10 },
  }).includes("3.5"),
  true,
);
check(
  "a failed balance check does not claim the balance is unchanged",
  formatSendResultForChat({
    ok: false,
    reason: "limit",
    failure: { kind: "check_failed" },
  }).includes(unchanged),
  false,
);

/* ---------- sendFailureStatus ---------- */

check("limit breaches are 422, not 502", sendFailureStatus("limit"), 422);
check("a reused link is 409", sendFailureStatus("already_used"), 409);
check("an inactive wallet is 409", sendFailureStatus("wallet_inactive"), 409);
check("a definite transfer failure is 502", sendFailureStatus("transfer_failed"), 502);
check("an ambiguous transfer failure is 502", sendFailureStatus("transfer_unknown"), 502);

const total = passed + failures.length;
console.log(`execute: ${passed}/${total} passed`);
if (failures.length) {
  console.error("\nFailures:\n" + failures.join("\n"));
  process.exit(1);
}
