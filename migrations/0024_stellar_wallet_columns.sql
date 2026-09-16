-- Stellar wallet secret storage — apply BEFORE deploying the Stellar wallet
-- code (lib/wallet/stellar.ts, lib/wallet/provision.ts).
--
-- Part of the Arc → Stellar migration. Circle's developer-controlled-wallets
-- SDK held custody itself; wallets are self-custodial from here on, so this
-- app must be able to sign with a user's Stellar secret key, which means
-- storing it — envelope-encrypted, never in the clear. See
-- lib/wallet/secret-envelope.ts for the encryption scheme.
--
-- tella_users.wallet_address is REUSED as-is for the new Stellar public key
-- (a "G..." StrKey) — no rename needed, it was already a generic address
-- column. tella_users.circle_wallet_id is left in place, unused going
-- forward: cheap to keep, expensive to need back, and it stays meaningful as
-- a marker of which users were ever provisioned on Arc.
--
-- Apply via Supabase SQL editor or
-- `psql $SUPABASE_DB_URL -f migrations/0024_stellar_wallet_columns.sql`.

alter table public.tella_users
  add column if not exists stellar_secret_ciphertext text;
