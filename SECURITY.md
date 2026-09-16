# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities — tella
moves real money and a public report is a public exploit. Report privately:

- **Preferred:** open a [GitHub security advisory](https://github.com/tella-cash/tella-cash/security/advisories/new).
- Otherwise, email the maintainer listed on the
  [tella-cash GitHub org](https://github.com/tella-cash).

We honour responsible disclosure and will credit reporters in the release
notes unless you prefer to remain anonymous.

## Supported versions

The `main` branch is the supported surface. There is no LTS branch.

## Custody model — read this before assuming "non-custodial"

tella is **self-custodial with server-held encrypted keys**, not
non-custodial. Being precise about the difference matters:

- Each user gets their own Stellar keypair, generated server-side.
- The secret key is **envelope-encrypted** (AES-256-GCM) before it ever
  touches the database — see [`lib/wallet/secret-envelope.ts`](lib/wallet/secret-envelope.ts).
  The master key-encryption-key lives in `STELLAR_WALLET_MASTER_KEY_V1`,
  server-side only.
- The **raw** secret key is decrypted only inside the one function that
  signs a transaction ([`lib/wallet/stellar.ts`](lib/wallet/stellar.ts)),
  as a local variable that goes out of scope the moment signing finishes.
  It is never logged.
- **The real-world consequence:** a compromised master key plus database
  access is every user's funds, at once — a fundamentally different risk
  shape than a wallet where the server never sees a private key at all
  (Stellar Intel's model, for comparison — see its
  [`docs/NON_CUSTODY.md`](https://github.com/Ezedike-Evan/stellar-intel/blob/main/docs/NON_CUSTODY.md)
  for what that looks like when it's actually true). Protecting
  `STELLAR_WALLET_MASTER_KEY_V1` is the single highest-value thing an
  operator of this codebase can do.
- An env-var master key is an accepted trade-off for testnet-only
  operation. **Move to a real KMS (AWS KMS, GCP KMS, or similar) before
  any mainnet deployment** — this is a hard blocker, not a nice-to-have.

## Every send requires a factor you hold

- **PIN** — set during onboarding, scrypt-hashed (`lib/auth/pin.ts`),
  never stored or transmitted in the clear.
- **WebAuthn** — device Face ID / fingerprint / platform authenticator
  (`lib/webauthn/`), preferred over PIN where available.
- **Confirm links are short-lived and single-use.** A send is proposed in
  chat and only executes after you open a confirm page and pass one of the
  above. A "yes" typed in chat never moves money on its own.
- **Rate limiting and lockout** on confirm attempts
  (`lib/auth/rate-limit.ts`) — a PIN's keyspace is small, so brute-force
  resistance comes from lockout, not the hash alone.

## If your phone is lost or stolen

- **Panic code**, issued the first time you receive money
  (`lib/security/panic-code.ts`). It **freezes the account from any
  device**, without logging in — and it can only freeze. It cannot spend,
  and it cannot unfreeze, so it's safe to write down anywhere.
- Freezing cancels every held (delayed) send and every unclaimed pending
  send immediately (`lib/users/freeze.ts`).
- **Large sends are delayed 24 hours** before execution
  (`lib/sends/tiers.ts`), specifically so a compromised account has a
  window to be noticed and frozen before the money actually leaves.

## Service-to-service authentication

Every internal endpoint fails closed when its secret is unset — "nobody
configured this" must never mean "anyone can call it":

- **Cron routes** (`app/api/cron/*`) require `CRON_SECRET` as a bearer
  token (`lib/cron/auth.ts`).
- **The Stellar payment-streaming worker → app** channel requires
  `STELLAR_STREAM_WORKER_SECRET` (`lib/wallet/stream-auth.ts`).
- **The admin dashboard** (`/admin`) requires Google sign-in against an
  explicit allowlist of Google subject IDs (`ADMIN_GOOGLE_SUBS`) — an
  unset allowlist means nobody gets in, never everybody.

## Network & data integrity

- Balances and spends are filtered by the **(asset code, asset issuer)
  pair**, never by asset code alone — Stellar lets anyone issue an asset
  called "USDC," so matching on code alone would let a lookalike asset
  from an unrelated issuer be shown or spent as if it were real money
  (`lib/wallet/stellar.ts`).
- Inbound-message and inbound-payment processing is deduplicated
  (`lib/messaging/processed-messages.ts`,
  `lib/wallet/stellar-stream.ts`) so a redelivered webhook or a replayed
  stream event can't double-credit an account or send a duplicate
  notification.
- Row-Level Security is enabled on sensitive tables (see
  `migrations/`).

## Supply chain

There is no automated dependency scanning (Dependabot, CodeQL) or CI
pipeline configured yet — this is an honest gap, not an oversight to paper
over. Contributions adding either are welcome.

## Related

- [`migrations/README.md`](migrations/README.md) — the schema history,
  including the full rationale behind the idempotency and dedup tables
  referenced above.
