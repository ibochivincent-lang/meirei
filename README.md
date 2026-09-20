# tella

[![License: MIT](https://img.shields.io/github/license/tella-cash/tella-cash?style=flat-square)](LICENSE)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-fe5196?style=flat-square&logo=conventionalcommits)](https://www.conventionalcommits.org)
[![Built on Stellar](https://img.shields.io/badge/built%20on-Stellar-7D00FF?style=flat-square)](https://stellar.org)

**A USDC wallet you talk to. No app, no seed phrase — just WhatsApp or
Telegram.**

tella holds a real, self-custodial USDC wallet on Stellar for you and lets
you send and receive money by chatting: `send 5 usdc to +234…`, `what's my
address?`, `balance`. Every send is confirmed with a PIN or a device
passkey before anything moves, large sends sit in a 24-hour window you can
cancel, and a panic code freezes the account from any device if your phone
is ever lost.

<p align="center">
  <em>Live at  <a href="https://www.tella.cash">tella.cash</a></em>
</p>

---

## Table of contents

- [Why this exists](#why-this-exists)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Why this exists

Sending USDC still means downloading a wallet app, protecting a seed
phrase, and copy-pasting addresses between apps — a real barrier for
someone who just wants to send their sister rent money. Everyone already
has WhatsApp or Telegram open. tella puts the wallet there instead of
asking people to leave the conversation they're already having.

Built for phone-first, chat-first users moving USDC in and out of Naira,
where the failure mode of a typical wallet — a typo'd address, a
misunderstood gas fee, a lost seed phrase — isn't a inconvenience, it's the
whole month's money gone.

## How it works

1. **Message the bot.** WhatsApp or Telegram; a wallet is generated and
   funded automatically on first contact.
2. **Send by phone number, saved name, or address** — `send 5 usdc to
   +234801…`, `send 5 to mum`, or a raw Stellar address.
3. **Confirm on a secure page.** A confirm link opens in-browser; you
   approve with a PIN or your device's Face ID / fingerprint (WebAuthn).
   Nothing moves from a "yes" typed in chat.
4. **Large sends wait 24 hours.** Above a threshold, a send is authorized
   immediately but executes a day later — a window to notice and freeze if
   it wasn't you.
5. **Lost your phone? Freeze it from anywhere.** A panic code (issued the
   first time you receive money) stops every outbound send from any
   device, no login required. It can only freeze — it can never spend or
   unfreeze, so it's safe to write down.

Wallets are **self-custodial**: each user gets their own Stellar keypair,
generated and envelope-encrypted (AES-256-GCM) at rest. tella never stores
a raw private key, and decrypts one only for the instant it takes to sign
a transaction you've already confirmed. See [SECURITY.md](SECURITY.md) for
the full key-handling and threat model.

---

## Tech stack

| Layer            | Technology                                         |
| ----------------- | --------------------------------------------------- |
| Framework         | Next.js 16 (App Router), React 19, TypeScript       |
| Styling           | Tailwind CSS v4                                     |
| Database          | Supabase (Postgres)                                 |
| Blockchain        | Stellar — `@stellar/stellar-sdk` v17, classic payments + trustlines |
| Messaging         | Twilio + Meta Cloud API (WhatsApp), Telegram Bot API |
| Device auth       | WebAuthn (`@simplewebauthn`) + PIN fallback         |
| Intent parsing    | sendam-ai (external service, free-form message decoding)   |
| Deployment        | Vercel (app) + a standalone worker (Horizon payment streaming) |

---

## Getting started

**Prerequisites:** Node.js 20+, pnpm, a Supabase project, a Stellar
Testnet account (free — see below).

```bash
# Clone the repository
git clone https://github.com/tella-cash/tella-cash.git
cd tella-cash

# Install dependencies
pnpm install

# Copy the example environment file and fill in your values
cp .env.example .env

# Apply database migrations (see migrations/README.md)
psql "$SUPABASE_DB_URL" -f migrations/0001_biometric_confirm.sql
# ...apply every migrations/000N_*.sql file in order

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

```bash
# Type-check the codebase
npx tsc --noEmit

# Lint
pnpm lint

# Run the test suite
pnpm test

# Production build
pnpm build
```

To actually send/receive on Stellar Testnet, you also need the standalone
payment-detection worker running (see
[`workers/stellar-stream-worker.ts`](workers/stellar-stream-worker.ts)):

```bash
npx tsx workers/stellar-stream-worker.ts
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in every value that isn't marked
optional — several used to have silent fallbacks that produced a
working-looking app with broken security, so most have none now. The
Stellar section:

| Variable | Required | Description |
| --- | --- | --- |
| `STELLAR_NETWORK` | Yes (defaults to `TESTNET`) | `TESTNET` or `PUBLIC`. Anything else fails loudly. |
| `STELLAR_USDC_ISSUER` | Yes | Circle's USDC issuer account for the active network — see the comment in `.env.example` for the exact testnet/mainnet values, sourced from Circle's docs, not guessed. |
| `STELLAR_WALLET_MASTER_KEY_V1` | Yes | 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts every user's wallet secret key at rest. Losing it makes every wallet it encrypted unspendable. |
| `STELLAR_STREAM_WORKER_SECRET` | Yes | Shared bearer token between the app and the streaming worker. |
| `STELLAR_HORIZON_URL`, `STELLAR_EXPLORER_TX_URL`, `STELLAR_FRIENDBOT_URL` | No | Override the per-network defaults. |

The rest — Supabase, Twilio, Meta WhatsApp, Telegram, cron auth — are
documented inline in [`.env.example`](.env.example).

---

## Documentation

| Document | What it covers |
| --- | --- |
| [SECURITY.md](SECURITY.md) | Key custody model, PIN/WebAuthn, freeze & panic code, responsible disclosure. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev workflow, code standards, commit convention, PR checklist. |
| [migrations/README.md](migrations/README.md) | Every schema migration, in order, with the bug or feature it exists for — including the full Arc  Stellar migration notes. |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes, newest first. |

There is no separate architecture doc yet — the codebase's own comments
carry that weight file-by-file (see `lib/wallet/`, `lib/sends/`, and
`lib/users/wallet-gate.ts` in particular for the security model's reasoning).

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md)
before opening a pull request, and follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## Security

Found a vulnerability? Please **do not** open a public issue — see
[SECURITY.md](SECURITY.md) for how to report it privately.

---

## License

[MIT](LICENSE)
