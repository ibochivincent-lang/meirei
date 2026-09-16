-- Horizon stream resume position — apply BEFORE deploying
-- lib/wallet/stellar-stream.ts and workers/stellar-stream-worker.ts.
--
-- Part of the Arc → Stellar migration. Circle's webhook pushed inbound
-- transfers to this app; Stellar has no equivalent push, so
-- workers/stellar-stream-worker.ts holds one global Horizon payments stream
-- instead. This table is where that stream's position survives a worker
-- restart (a crash, a redeploy) — reconnects WITHIN one run are the Horizon
-- SDK's own EventSource retry and never touch this table.
--
-- A single row ("singleton"), not one per user: the worker holds one
-- deployment-wide stream, not a connection per wallet.
--
-- Apply via Supabase SQL editor or
-- `psql $SUPABASE_DB_URL -f migrations/0025_stellar_stream_cursor.sql`.

create table if not exists public.tella_stellar_stream_cursor (
  id text primary key,
  last_paging_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.tella_stellar_stream_cursor enable row level security;
