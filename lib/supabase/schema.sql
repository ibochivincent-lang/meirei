-- Meirei Supabase Identity & WebAuthn Schema
-- Platform: OKX X Layer (Chain ID 196)
-- Author: IboTV

CREATE TABLE IF NOT EXISTS meirei_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  is_email_verified BOOLEAN DEFAULT TRUE,
  wallet_address TEXT,
  wallet_status TEXT DEFAULT 'active',
  primary_channel TEXT DEFAULT 'web',
  whatsapp_number TEXT UNIQUE,
  whatsapp_channel TEXT DEFAULT 'meta',
  telegram_id TEXT,
  instagram_handle TEXT,
  profile_name TEXT,
  onboarding_step TEXT DEFAULT 'completed',
  pin_hash TEXT,
  pin_salt TEXT,
  pin_set_at TIMESTAMPTZ,
  frozen_at TIMESTAMPTZ,
  frozen_reason TEXT,
  frozen_source TEXT,
  panic_code_hash TEXT,
  is_bot_active BOOLEAN DEFAULT TRUE,
  two_factor_method TEXT DEFAULT 'email',
  passkey_credential_id TEXT,
  passkey_public_key TEXT,
  kyc_tier TEXT DEFAULT 'tier_1_verified',
  aml_status TEXT DEFAULT 'clean',
  is_sanction_screened BOOLEAN DEFAULT TRUE,
  daily_spending_cap_usd NUMERIC DEFAULT 25000.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meirei_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  transports TEXT[],
  device_label TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meirei_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meirei_processed_message (
  key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  message_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meirei_auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meirei_user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  device_fingerprint TEXT,
  device_identifier TEXT,
  is_trusted BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT meirei_user_devices_unique UNIQUE (user_id, channel, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS meirei_google_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  google_sub TEXT UNIQUE NOT NULL,
  google_email TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
