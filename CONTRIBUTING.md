# Contributing to tella

Thank you for your interest in contributing. This document covers everything
you need to get started.

---

## Before you begin

- Read the [Code of Conduct](CODE_OF_CONDUCT.md). All contributors are
  expected to follow it.
- Read [SECURITY.md](SECURITY.md) — this codebase moves real money and
  handles encrypted key material. Anything touching `lib/wallet/`,
  `lib/sends/`, `lib/users/wallet-gate.ts`, or `lib/auth/` deserves extra
  care and, for anything non-trivial, an issue opened first to discuss the
  approach before writing code.
- For ordinary bug fixes and small improvements, a pull request is
  sufficient on its own.

---

## Development setup

```bash
git clone https://github.com/tella-cash/tella-cash.git
cd tella-cash
pnpm install
cp .env.example .env
pnpm dev
```

See [README.md](README.md) for the full environment variable reference and
how to apply database migrations.

---

## Workflow

1. Fork the repository and create a branch from `main`.
2. Name branches descriptively: `feat/held-send-cancel-ui`,
   `fix/beneficiary-label-collision`, `docs/security-update`.
3. Make your changes. Keep commits focused — one logical change per commit.
4. Run checks before pushing:

   ```bash
   npx tsc --noEmit   # typecheck
   pnpm lint          # eslint --max-warnings 0
   pnpm test          # the full unit test suite
   pnpm build         # production build
   ```

5. Open a pull request against `main`, filling in the PR template.

---

## Code standards

### TypeScript

- Strict mode is enabled. All code must pass `npx tsc --noEmit` with zero
  errors.
- Prefer explicit types over `any`. Use `unknown` when the type is
  genuinely unknown.
- Shared types live in `lib/supabase/types.ts` — don't redeclare a row
  shape locally.

### Structure

- Route handlers (`app/api/**/route.ts`) stay thin: parse the request,
  delegate to a `lib/` function, shape the response. Business logic
  belongs in `lib/`, not in the route file.
- One reusable function's worth of logic per `lib/` file where reasonable;
  this codebase's existing modules (`lib/sends/execute.ts`,
  `lib/wallet/stellar.ts`) are the pattern to follow.
- **No mock or hardcoded data in production code paths.** If a real value
  is unavailable, fail loudly or surface an explicit error state — never
  silently substitute a placeholder. This is the single most
  expensive mistake this codebase has made in the past (see
  `migrations/README.md`'s notes on the Arc → Stellar migration for what
  it cost when a demo ran on mock data elsewhere in this ecosystem).

### Money-moving code specifically

- Every function on the send path that can fail must classify the failure
  as **definite** or **ambiguous** — never guess "it probably failed" when
  the outcome is genuinely unknown. See `lib/sends/execute.ts`'s
  `isAmbiguousFailure` and its extensive comments for why this distinction
  is treated as the most safety-critical logic in the repository.
- Any new money-moving path must fail **closed**: if a check can't be
  completed (a database error, an unreachable balance API), the send is
  refused, not allowed.

### Styling

- Tailwind CSS v4. No inline `style` props unless there's no other way to
  express it.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add held-send cancellation from the security page
fix: correct beneficiary label collision on case-insensitive match
docs: update SECURITY.md key-rotation guidance
refactor: extract Stellar payment building into lib/wallet/stellar.ts
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

Never add a `Co-Authored-By` trailer for an AI tool — commit messages
describe what changed and why, attributed to the person who reviewed and
is responsible for the change.

---

## Pull request checklist

- [ ] `npx tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all
      pass
- [ ] No `MOCK`, hardcoded rate, or placeholder value added to a
      production code path
- [ ] Any new schema change ships as a numbered file in `migrations/`,
      documented in `migrations/README.md`, following the existing
      "apply before the code that uses it" ordering discipline
- [ ] Any change to `lib/wallet/`, `lib/sends/`, or `lib/auth/` explains
      its failure-mode reasoning in a comment, not just its happy path
- [ ] PR description explains what changed and why, and links the issue
      it closes (`Closes #N`) if one exists

---

## Questions

Open an issue with the `question` label.
