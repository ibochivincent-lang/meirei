-- Signed-payment XDR, persisted before submission — apply BEFORE deploying
-- the rewritten lib/sends/execute.ts / lib/wallet/stellar.ts.
--
-- Part of the Arc → Stellar migration. Stellar has no server-assigned
-- idempotency key the way Circle's createTransaction did — safety instead
-- comes from a transaction's own sequence number (a signed envelope can only
-- ever apply once) plus Horizon returning the ORIGINAL result if the exact
-- same signed XDR is resubmitted. This column is what makes that resubmit
-- possible: lib/sends/execute.ts's performTransfer writes the built,
-- SIGNED envelope here before calling submitSignedPayment, so a crash
-- between the two can retry with the identical envelope instead of building
-- a fresh one against a sequence number that may have already advanced —
-- which would mint a genuinely new second payment.
--
-- Apply via Supabase SQL editor or
-- `psql $SUPABASE_DB_URL -f migrations/0027_pending_send_stellar_xdr.sql`.

alter table public.tella_transactions
  add column if not exists stellar_tx_xdr text;
