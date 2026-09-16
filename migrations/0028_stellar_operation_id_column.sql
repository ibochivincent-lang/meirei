-- Stellar operation id + its dedup index — apply BEFORE deploying
-- lib/wallet/stellar-stream.ts and the rewritten lib/transactions/repository.ts.
--
-- Part of the Arc → Stellar migration. Direct counterpart to migration
-- 0011's circle_transaction_id column and its unique index, but for
-- Stellar's own operation id. circle_transaction_id is left in place,
-- unused going forward — see 0024's comment for why dead columns are kept
-- rather than dropped mid-migration.
--
-- Scoped to (user_id, direction, stellar_operation_id), same as 0011: a
-- self-transfer legitimately produces one 'sent' row and one 'received' row
-- that may carry the same operation id, and a unique index on the id alone
-- would reject the second one.
--
-- Apply via Supabase SQL editor or
-- `psql $SUPABASE_DB_URL -f migrations/0028_stellar_operation_id_column.sql`.

alter table public.tella_transactions
  add column if not exists stellar_operation_id text;

create unique index if not exists tella_transactions_stellar_operation_id_idx
  on public.tella_transactions(user_id, direction, stellar_operation_id)
  where stellar_operation_id is not null;
