-- Migration 0030: Performance Indexes, Idempotency & Spending Limits
-- Author: IboTV
-- Platform: X Layer (Chain 196)

-- 1. Index high-frequency timestamp query paths
create index if not exists meirei_executions_executed_at_idx
  on public.meirei_executions(executed_at desc);

create index if not exists meirei_portfolio_snapshots_captured_at_idx
  on public.meirei_portfolio_snapshots(captured_at desc);

-- 2. Persistent Idempotency Ledger to prevent duplicate executions (dup payment / dup sub)
create table if not exists public.meirei_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  wallet_address text not null check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  operation_type text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  response_payload jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists meirei_idempotency_key_idx
  on public.meirei_idempotency_keys(idempotency_key);

create index if not exists meirei_idempotency_wallet_idx
  on public.meirei_idempotency_keys(wallet_address);

-- 3. Daily Spending Quota Tracking
create table if not exists public.meirei_daily_spending (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  spend_date date not null default current_date,
  total_usd numeric(18, 4) not null default 0,
  transaction_count int not null default 1,
  updated_at timestamptz not null default now(),
  constraint uq_wallet_spend_date unique (wallet_address, spend_date)
);

create index if not exists meirei_daily_spending_lookup_idx
  on public.meirei_daily_spending(wallet_address, spend_date);

-- Enable RLS
alter table public.meirei_idempotency_keys enable row level security;
alter table public.meirei_daily_spending enable row level security;

create policy meirei_idempotency_service_all on public.meirei_idempotency_keys
  for all using (true) with check (true);

create policy meirei_spending_service_all on public.meirei_daily_spending
  for all using (true) with check (true);
