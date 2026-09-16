<!--
Thanks for opening a PR!

Before you submit:
  • Conventional Commits title (feat / fix / docs / refactor / test / chore / ci).
  • One logical change per PR. Split unrelated cleanup into its own PR.
  • Fill in every section below — leave "N/A" with a reason if one genuinely
    doesn't apply.
-->

## Summary

<!-- One or two sentences on what changed and why. Lead with the why. -->

## Linked issue

Closes #

<!-- If there is genuinely no issue (typo fix, chore), say so and why. -->

## Changes

<!--
A reader-oriented bullet list, not a diff summary. Reference files with
backticks, symbols with file_path:line_number where it helps.
-->

-
-

## Testing notes

<!--
At minimum: the command(s) you ran, and any manual verification — especially
if this touches a real send, a real Stellar transaction, or a webhook/worker.
-->

- [ ] `npx tsc --noEmit` — no errors
- [ ] `pnpm lint` — no new warnings
- [ ] `pnpm test` — passes; new behaviour has a test
- [ ] `pnpm build` — passes

**Manual verification** (if applicable)

<!-- e.g. "Sent 5 USDC testnet-to-testnet via the WhatsApp sandbox, confirmed
via PIN, received the receipt with a working explorer link." -->

-

## Checklist

**Correctness**

- [ ] `npx tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass
- [ ] One logical change; unrelated cleanup was split into a separate PR

**Money & data integrity**

- [ ] No mock, stub, or hardcoded value added to a production code path
- [ ] Any new failure path on the send/wallet code is classified as
      **definite** or **ambiguous** (never guessed) — see
      `lib/sends/execute.ts`'s `isAmbiguousFailure`
- [ ] Any new check that can't complete (DB error, unreachable API) **fails
      closed** — refuses rather than allows

**Security**

- [ ] No secret logged (wallet secrets, PINs, tokens)
- [ ] No new/changed internal endpoint reachable without its auth check
      (cron secret, stream-worker secret, admin allowlist)
- [ ] New env var → added to `.env.example` with a comment, and to the
      README's env table if it's commonly needed

**Docs**

- [ ] User-facing behaviour change → `CHANGELOG.md` entry under
      `[Unreleased]`
- [ ] Schema change → a new numbered file in `migrations/`, documented in
      `migrations/README.md`

## Breaking changes

<!-- What breaks, who's affected, migration path. If none: write "None." -->

None.

## For reviewers

<!--
Optional: areas you want a careful read, tradeoffs you considered and
rejected, or things left for a deliberate follow-up.
-->
