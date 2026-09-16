-- Once-only processing for incoming Stellar payments — apply BEFORE
-- deploying lib/wallet/stellar-stream.ts.
--
-- Part of the Arc → Stellar migration. This is the Stellar-era counterpart
-- to tella_processed_notification (migration 0011), simplified: Circle
-- reused a notification id across a transfer's state sequence (INITIATED →
-- ... → COMPLETE), which is why that table keyed on
-- `{notificationType}:{notificationId}`. A Stellar operation id has no such
-- reuse — it is one-shot and globally unique the moment it lands in a
-- ledger — so the key here is the operation id alone.
--
-- Apply via Supabase SQL editor or
-- `psql $SUPABASE_DB_URL -f migrations/0026_processed_stellar_operation.sql`.

create table if not exists public.tella_processed_stellar_operation (
  operation_id text primary key,
  processed_at timestamptz not null default now()
);

-- Same pruning shape as tella_processed_notification: the cleanup job
-- removes rows past a retention window by age.
create index if not exists tella_processed_stellar_operation_processed_at_idx
  on public.tella_processed_stellar_operation(processed_at);

alter table public.tella_processed_stellar_operation enable row level security;
