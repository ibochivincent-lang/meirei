# Changelog

All notable changes to tella are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Self-custodial Stellar wallets: a Stellar keypair per user, generated
  server-side and envelope-encrypted at rest (`lib/wallet/secret-envelope.ts`,
  AES-256-GCM). Wallet provisioning funds the account via Friendbot and
  establishes the USDC trustline, resuming safely if interrupted mid-flight
  (`lib/wallet/provision.ts`).
- `workers/stellar-stream-worker.ts`: a standalone process holding one
  global Horizon payments stream, replacing the Circle webhook's role in
  detecting incoming transfers — Vercel Functions can't hold an indefinite
  SSE connection, so this runs outside them.
- `migrations/0024`–`0028`: schema for the encrypted wallet secret, the
  streaming worker's resume cursor, once-only Stellar-operation processing,
  and safe-retry transaction bookkeeping.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE` — OSS
  hygiene docs.

### Changed

- **Migrated from Circle's "Arc" chain to Stellar.** The
  `@circle-fin/developer-controlled-wallets` SDK has no Stellar support at
  all (no entry in its blockchain enum, no Stellar account model), so this
  was a full custody-layer rewrite rather than a config change. See
  `migrations/README.md`'s "Arc → Stellar migration" section for the full
  rationale and the schema changes involved.
- Address recognition switched from a hand-rolled `0x` + 40-hex-char regex
  (`isEvmAddress`) to the Stellar SDK's own `StrKey.isValidEd25519PublicKey`
  (`isStellarAddress`), and address handling is no longer case-normalized —
  Stellar's base32 StrKey encoding is case-significant, unlike EVM hex.
- Send execution is now synchronous: Stellar's `submitTransaction` returns
  pass/fail immediately, replacing Circle's submit-now/confirm-later-via-webhook
  model. A signed payment's XDR is persisted before submission so a crash
  mid-send can retry with the identical envelope instead of risking a
  second payment.
- The testnet faucet flow now points users at `faucet.circle.com` directly
  instead of an in-app asset-selection flow — Circle's programmatic faucet
  API requires a mainnet-verified account this deployment doesn't have, the
  same gate that already existed as a fallback.
- User-facing copy (chat replies, legal pages, admin dashboard, landing
  page) updated from Arc/Circle-custody language to Stellar/self-custody
  language.

### Removed

- The Circle webhook route and its signature-verification and
  notification-dedup modules (`app/api/circle-webhook/`, `lib/circle/`).
- `@circle-fin/developer-controlled-wallets` dependency, replaced by
  `@stellar/stellar-sdk`.
- The in-chat testnet faucet asset-selection flow (`native`/`USDC`/`EURC`
  choice) — no longer needed once faucet requests point at the web faucet.

[Unreleased]: https://github.com/tella-cash/tella-cash/commits/main
