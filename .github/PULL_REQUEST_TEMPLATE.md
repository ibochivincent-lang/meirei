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
if this touches a real swap, a real OKX X Layer transaction, or a bot webhook.
-->

- [ ] `npx tsc --noEmit` — no errors
- [ ] `pnpm lint` — no new warnings
- [ ] `pnpm test` / `npm run test:unit` — passes; new behaviour has a test
- [ ] `pnpm build` — passes

**Manual verification** (if applicable)

<!-- e.g. "Executed 100 USDG rebalance on X Layer via Telegram bot, confirmed
via OTP 2FA, received receipt with live explorer link." -->

-

## Checklist

**Correctness**

- [ ] `npx tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass
- [ ] One logical change; unrelated cleanup was split into a separate PR

**Money & data integrity**

- [ ] No mock, stub, or hardcoded value added to a production code path
- [ ] Any new failure path on the swap/wallet code is classified as
      **definite** or **ambiguous** (never guessed)
- [ ] Any new check that can't complete (unreachable RPC, API error) **fails
      closed** — refuses rather than allows

**Security**

- [ ] No secret logged (wallet private keys, OTP secrets, API tokens)
- [ ] No new/changed internal endpoint reachable without its auth check
- [ ] New env var → added to `.env.example` with a comment, and to the
      README's env table if it's commonly needed

**Docs**

- [ ] User-facing behaviour change → `CHANGELOG.md` entry under
      `[Unreleased]`
- [ ] Architecture or protocol change documented in `docs/`

## Breaking changes

<!-- What breaks, who's affected, migration path. If none: write "None." -->

None.

## For reviewers

<!--
Optional: areas you want a careful read, tradeoffs you considered and
rejected, or things left for a deliberate follow-up.
-->
