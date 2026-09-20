-- Adds core schema for Project Meirei on X Layer (chain 196).
-- Tracks user EVM wallets, portfolio rebalancing mandates, on-chain executions, and portfolio snapshots.
-- Author: IboTV

create table if not exists public.meirei_users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  platform text not null default 'web',
  handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meirei_users_wallet_address_idx
  on public.meirei_users(wallet_address);

create table if not exists public.meirei_mandates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.meirei_users(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  rule_text text not null,
  targets jsonb not null default '[]'::jsonb,
  cash_symbol text not null default 'USDG' check (cash_symbol in ('USDG', 'USDC')),
  rebalance_band numeric(5, 4) not null default 0.0300,
  frequency text not null default '7d',
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  last_rebalanced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meirei_mandates_wallet_idx
  on public.meirei_mandates(wallet_address);

create index if not exists meirei_mandates_status_idx
  on public.meirei_mandates(status);

create table if not exists public.meirei_executions (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid references public.meirei_mandates(id) on delete set null,
  wallet_address text not null check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  legs jsonb not null default '[]'::jsonb,
  tx_hashes text[] not null default '{}',
  total_notional_usd numeric(18, 4) not null default 0,
  fee_amount numeric(18, 6) not null default 0,
  fee_asset text not null default 'USDG',
  status text not null check (status in ('preview', 'success', 'failed')),
  error_message text,
  executed_at timestamptz not null default now()
);

create index if not exists meirei_executions_mandate_idx
  on public.meirei_executions(mandate_id);

create index if not exists meirei_executions_wallet_idx
  on public.meirei_executions(wallet_address);

create table if not exists public.meirei_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  total_usd numeric(18, 4) not null default 0,
  holdings jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists meirei_portfolio_snapshots_wallet_idx
  on public.meirei_portfolio_snapshots(wallet_address);

-- Enable RLS
alter table public.meirei_users enable row level security;
alter table public.meirei_mandates enable row level security;
alter table public.meirei_executions enable row level security;
alter table public.meirei_portfolio_snapshots enable row level security;

-- Default service role policies
create policy meirei_users_service_all on public.meirei_users
  for all using (true) with check (true);

create policy meirei_mandates_service_all on public.meirei_mandates
  for all using (true) with check (true);

create policy meirei_executions_service_all on public.meirei_executions
  for all using (true) with check (true);

create policy meirei_snapshots_service_all on public.meirei_portfolio_snapshots
  for all using (true) with check (true);
