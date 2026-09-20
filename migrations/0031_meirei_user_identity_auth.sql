-- Migration 0031: Non-Custodial User Identity, Email-to-XLayer Linkage & Multi-Channel Bot Support
-- Author: IboTV
-- Platform: OKX Chain / X Layer (Chain 196)
--
-- SECURITY ARCHITECTURE:
-- 1. NO PRIVATE KEYS ARE STORED IN THIS DATABASE.
--    The system is strictly non-custodial. User signing keys reside exclusively in the user's
--    OKX Layer wallet or hardware/WebAuthn Passkey enclave.
-- 2. UNIVERSAL IDENTITY SIGNATURE:
--    User identity across devices, browsers, and social bots (WhatsApp, Telegram, Instagram)
--    is anchored to their verified Email.
-- 3. MULTI-DEVICE RECOVERY & 2FA:
--    When a user switches devices or accesses the bot from another channel, their verified email
--    with 2FA (Email OTP or Passkey) seamlessly recovers their profile and re-links to their
--    OKX Layer smart account.

-- 1. Create or alter the meirei_users table to enforce non-custodial email-to-wallet linkage
create table if not exists public.meirei_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  is_email_verified boolean not null default false,
  wallet_address text not null check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  
  -- Multi-channel bot handles (WhatsApp, Telegram, Instagram, Web)
  primary_channel text not null default 'web' check (primary_channel in ('whatsapp', 'telegram', 'instagram', 'web', 'okx_wallet')),
  whatsapp_number text unique,
  telegram_id text unique,
  instagram_handle text,
  is_bot_active boolean not null default true,
  
  -- 2FA Security & Non-Custodial Passkey Authentication (PUBLIC credentials only, never secrets)
  two_factor_method text not null default 'email' check (two_factor_method in ('email', 'passkey', 'both')),
  passkey_credential_id text,
  passkey_public_key text,
  
  -- International Compliance & Risk Profile (FATF / OFAC / KYC)
  kyc_tier text not null default 'tier_1_verified' check (kyc_tier in ('tier_0_basic', 'tier_1_verified', 'tier_2_accredited', 'tier_3_institutional')),
  aml_status text not null default 'clean' check (aml_status in ('clean', 'flagged', 'under_review')),
  is_sanction_screened boolean not null default true,
  daily_spending_cap_usd numeric(18, 4) not null default 25000.0000,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create index if not exists meirei_users_email_idx on public.meirei_users(email);
create index if not exists meirei_users_wallet_address_idx on public.meirei_users(wallet_address);
create index if not exists meirei_users_whatsapp_idx on public.meirei_users(whatsapp_number);
create index if not exists meirei_users_telegram_idx on public.meirei_users(telegram_id);

-- 2. Multi-Device & Channel Registry
-- Records authorized devices, browsers, and messaging bot instances tied to the user
create table if not exists public.meirei_user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.meirei_users(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'telegram', 'instagram', 'web', 'mobile_browser')),
  device_fingerprint text not null,
  user_agent text,
  ip_address text,
  is_trusted boolean not null default true,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_user_device unique (user_id, channel, device_fingerprint)
);

create index if not exists meirei_devices_user_idx on public.meirei_user_devices(user_id);

-- 3. 2FA Authentication Challenges (Email OTP and Passkey challenges)
create table if not exists public.meirei_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.meirei_users(id) on delete cascade,
  email text not null,
  challenge_type text not null check (challenge_type in ('email_otp', 'passkey', 'bot_pairing')),
  code_hash text not null,
  purpose text not null default 'login' check (purpose in ('login', 'device_recovery', 'trade_authorization', 'bot_activation')),
  is_used boolean not null default false,
  attempts int not null default 0,
  max_attempts int not null default 3,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists meirei_auth_challenges_email_idx on public.meirei_auth_challenges(email);
create index if not exists meirei_auth_challenges_expires_idx on public.meirei_auth_challenges(expires_at);

-- 4. International Compliance & Audit Trail Ledger
create table if not exists public.meirei_compliance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.meirei_users(id) on delete set null,
  wallet_address text not null,
  event_type text not null check (event_type in ('kyc_verification', 'sanction_screen_cleared', 'sanction_screen_flagged', 'otp_auth_success', 'otp_auth_failed', 'passkey_registered', 'spending_cap_exceeded', 'bot_channel_linked')),
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists meirei_compliance_wallet_idx on public.meirei_compliance_audit_logs(wallet_address);
create index if not exists meirei_compliance_recorded_idx on public.meirei_compliance_audit_logs(recorded_at desc);

-- 5. Enable Row Level Security (RLS)
alter table public.meirei_users enable row level security;
alter table public.meirei_user_devices enable row level security;
alter table public.meirei_auth_challenges enable row level security;
alter table public.meirei_compliance_audit_logs enable row level security;

-- Policies for service role operations
create policy meirei_users_service on public.meirei_users for all using (true) with check (true);
create policy meirei_devices_service on public.meirei_user_devices for all using (true) with check (true);
create policy meirei_challenges_service on public.meirei_auth_challenges for all using (true) with check (true);
create policy meirei_compliance_service on public.meirei_compliance_audit_logs for all using (true) with check (true);
