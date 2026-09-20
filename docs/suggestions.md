# Meirei — Code Review, Suggestions & Gap Analysis

> **Status note (v0.2.0):** Sections 1.1–1.6 and 2.1–2.5 (P0 blockers and the parser/diff logic bugs)
> have been **fixed and unit-tested** as of this revision — see the "Fix status" marks below and the
> README Status section. Section 5 (ASP registration) and the HTTP/frontend surface remain open.
> The findings below are kept verbatim as the audit record.

Reviewed: the whole `src/` tree, `package.json`, `tsconfig.json`, plus the three planning PDFs
(Build Guide, Prompts & OKX AI Integration Guide, Core Frontend/Backend Implementation Plan)
and the **real `onchainos` CLI installed on this machine**.

Every finding below was **executed and reproduced**, not inferred. Raw evidence is quoted inline.

---

## 0. Verdict

The product framing, module boundaries and type model are good — the architecture matches the
Build Guide almost 1:1. The problem is that the **integration layer was written against an
assumed CLI that does not exist**, and the **headline demo command does not run**.

Three things block a demo today:

1. `meirei parse "60% mag7, 20% USDG, max 8%"`  **throws**.
2. Every allowlist address is the literal string `"0x..."`  **no swap can ever be built**.
3. The code calls `onchainos trade quote` / `onchainos trade execute`  **unrecognized subcommand**.

---

## 1. P0 — Blockers (fix before anything else)

### 1.1 Headline mandate fails validation

```
$ npx tsx src/cli.ts parse "60% mag7, 20% USDG, max 8%"
Error: AAPLx weight 10.71% exceeds max single 8.00%
```

**Why:** `parse.ts` gives Mag7 a 60% sleeve (0.0857 each) and cash 20%  total 80%.
`validateWeights()` then rescales by `1/0.8 = 1.25`, inflating each stock to **0.1071**…
but `maxSingle` was already parsed as `0.08`, and the cap check happens *after* rescaling.

So the exact string printed in the Build Guide, the demo script and the prompt library is the one
string that fails.

**Fix — cap-aware allocation instead of blind rescaling:**

```ts
function normalize(mandate: Mandate): void {
  const equities = mandate.targets.filter(t => t.symbol !== mandate.cashSymbol);
  const cashTarget = mandate.targets.find(t => t.symbol === mandate.cashSymbol);
  const sleeve = equities.reduce((s, t) => s + t.weight, 0);

  // spread the sleeve equally, but never breach the user's single-name cap
  const perName = Math.min(sleeve / equities.length, mandate.maxSingle);
  for (const t of equities) t.weight = perName;

  const invested = perName * equities.length;
  if (cashTarget) cashTarget.weight = 1 - invested;   // cash absorbs the remainder
}
```

Then drop the `throw` branch entirely — weights are *defined* to sum to 1 after normalization.
Expected result for the demo string: `AAPLx…TSLAx 8.00% each (56%), USDG 44%`, which is exactly the
"max 8% single name" semantics the guide describes.

> Design decision to make explicit: when `maxSingle` binds, the excess goes to **cash** (safest, and
> keeps the mandate satisfiable) rather than being redistributed into other names (which would
> silently breach the user's cap).

### 1.2 Allowlist addresses are placeholders

`src/allowlist.ts` ships `address: "0x..."` for all 8 entries. Every `swap quote` / `swap execute`
call therefore passes an invalid contract address. Resolved real addresses on **X Layer (196)**:

| Symbol | Address | Decimals | Note |
|---|---|---|---|
| AAPLx | `0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a` | 18 | verified |
| MSFTx | `0x5621737f42dae558b81269fcb9e9e70c19aa6b35` | 18 | verified |
| NVDAx | `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` | 18 | verified |
| GOOGLx | `0xe92f673ca36c5e2efd2de7628f815f84807e803f` | 18 | **see 1.3** |
| AMZNx | `0x3557ba345b01efa20a1bddc61f573bfd87195081` | 18 | verified |
| METAx | `0x96702be57cd9777f835117a809c7124fe4ec989a` | 18 | verified |
| TSLAx | `0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0` | 18 | verified |
| USDG | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | **6** | **see 1.4** |
| USDC | `0xb6ceceab302e2e4948951ee7843fc24e92933061` | **6** | bridged: `0x74b7f16337b8972027f6196a17a631ac6de26d22` |

Resolved with:

```bash
onchainos token search --query <symbol> --chain xlayer --limit 5
```

### 1.3 `GOOGx` does not exist on X Layer

```
$ onchainos token search --query GOOGx --chain xlayer
(no results)
$ onchainos token search --query Google --chain xlayer
GOOGLx  18  0xe92f673ca36c5e2efd2de7628f815f84807e803f
wGOOGLx 18  0xf8c5308f80e459bb53d9ebe689854d9cbb2caa6f
```

The allowlist, the Mag7 array in `parse.ts` and all four templates reference `GOOGx`.
Any mandate naming it hits `Unknown symbols: GOOGx`. Rename to **`GOOGLx`** everywhere.
Note the wrapped variants (`wAAPLx`, `wGOOGLx`, `SY-USDG`) also exist — keep them **out** of the
allowlist, or the "no wrapped/derivative tokens" rule becomes ambiguous.

### 1.4 `USDG` has 6 decimals, not 18

`allowlist.ts` gives every entry `decimals: 18`, and `fetchBalances` divides by `10^decimals` —
so a real USDG balance of `100.000000` (6 dp) would be read as **0.0000000001 USDG**, a 10¹² error.
Cash would look empty forever and every rebalance would be a buy.
Fix the table above; better, fetch decimals at runtime via `onchainos token info`.

### 1.5 The CLI subcommand names are wrong

```
$ onchainos trade quote ...
error: unrecognized subcommand 'trade'
```

Real surface: **`swap`**, not `trade`, plus `portfolio`, `market`, `payment`, `agent`.
Current code in `onchainos/index.ts`:

```ts
runCLI(["trade", "quote", "--from-token", from.address, ...])                          // 
runCLI(["trade", "execute", "--from-token", ...])                                      // 
runCLI(["wallet", "balance", "--wallet", w, "--token", a.address, "--chain", "196"])   // 
```

Corrected calls (note the flag renames — `--from-token``--from`, `--amount``--readable-amount`,
`--slippage` is **percent**, and the chain alias is `xlayer`):

```bash
# balances — ONE call, not one per token
onchainos portfolio all-balances --address <wallet> --chains xlayer
# or, restricted to the allowlist:
onchainos portfolio token-balances --address <wallet> --tokens "196:<addr>,196:<addr>,..."

# quote
onchainos swap quote --from <cashAddr> --to <stockAddr> --readable-amount 8.6 --chain xlayer

# execute
onchainos swap execute --from <cashAddr> --to <stockAddr> --readable-amount 8.6 \
        --chain xlayer --wallet <wallet> --slippage 0.5 --gas-level average
```

`--slippage` takes **percent** (`0.5` = 0.5%), while the code passes `slip * 100` where
`slip = 0.005`  `0.5`, which happens to be right — but the unit contract is undocumented. Make it
explicit in `SwapOptions` (`slippagePercent`) so nobody "fixes" it into `0.005`.

### 1.6 Silence-by-fallback hides every failure

`runCLI()` has a `catch` that returns **fabricated** output on *any* error:

```ts
} catch (e) {
  if (cmd === "trade") return "price impact: 0.3%\nroute: OKX DEX Aggregator\noutput: 99.7";
  return "";
}
```

Combined with `getQuotes()` swallowing errors, a dead CLI/RPC is indistinguishable from a working
one — quotes show a fake `0.3%` impact and `output: 99.7`. This is the most dangerous thing in the
repo for a judged demo (a judge asking "is that real?" is a live risk), and it is also why the
`trade` bug above went unnoticed.

**Fix:** delete the fallback, throw. Reserve fabricated data strictly for an explicit
`MEIREI_MOCK_ONCHAINOS=1` path, and print a loud `[MOCK]` banner when it is on.

---

## 2. P1 — Correctness & logic bugs

### 2.1 `equal weight` path is unusable

```
$ npx tsx src/cli.ts parse "equal weight AAPLx NVDAx TSLAx, rest USDG"
Error: Weights must sum to 100%, got 120.00%
```

`extractSymbols` returns 3 names, each weighted `1/3` (already 100%), and then the cash block
unconditionally pushes another `0.2`  120%. Fix: build cash as **`1 - sum(equities)`** when the
sleeve is named explicitly, and only fall back to the 20% default when it is not.

### 2.2 Free-text mandates silently return an all-cash portfolio

```
$ npx tsx src/cli.ts parse "30% nvdax, 20% aaplx, rest cash"
{ "targets": [ { "symbol": "USDG", "weight": 1 } ], ... }
```

The text is lowercased at the top of `parseMandate`, but `parseCustomTargets` matches
`/([A-Z]{2,5}x?)\s*(\d+)%/gi` — uppercase classes against lowercase input, so it matches nothing.
The mandate then contains cash only and is rescaled to 100%. **No error is raised**; the user gets a
confidently wrong, fully-liquidated plan. Use `[A-Za-z]{2,5}x?` and `toUpperCase()` (or match against
the allowlist symbols directly). This failure mode deserves a regression test.

### 2.3 Cash is not funding-checked, and the cash symbol is hardcoded

`cashSymbol` is hardcoded `"USDG"` in `parseMandate` even when the mandate says USDC, and
`computeDiff` sends all purchases *from* `mandate.cashSymbol` without checking the wallet holds it.
Add a pre-flight: if `cashValue < plannedBuys`, scale the plan down or fail with
`Insufficient cash: need $X, have $Y` — otherwise the first leg reverts on-chain in front of judges.

### 2.4 Quote leg indices are always 0

`getSwapQuote()` calls `parseQuote(res, 0, ...)` with a hardcoded `0`, and `getQuotes()` iterates
without passing `i`. Every quote in the table reads "Leg 0". Pass the real index through.

### 2.5 Balance parsing loses precision and ignores outside activity

- `parseFloat(balStr) / 10**decimals` on an 18-decimal wei string exceeds `Number`'s 2^53 integer
  range  rounding errors. Use `BigInt` for the integer division.
- `fetchBalances` loops the allowlist and issues **8 subprocesses** per portfolio read; one
  `portfolio all-balances --chains xlayer` call replaces all of them (and picks up tokens bought
  outside Meirei — currently invisible to the diff).
- `MEIREI_MOCK_ONCHAINOS=1` makes `wallet balance` return `"0"` for every token, so the mock
  portfolio is **always empty** and `totalUsd = 0`  `notional = 0`  zero legs. The mock mode that
  exists to unblock parallel UI work cannot produce a plan. Give it a funded fixture
  (e.g. `$10,000` all-cash) plus a second already-balanced fixture.

### 2.6 Failed legs still "succeed", and the fee is still charged

`executeSwaps` pushes `status: "failed"` and returns `status: "executed"` regardless; `handleMandate`
then charges the fee. Decide the policy — the Build Guide says "fail soft, continue where safe", so
all-failed should read as failure with no fee, and partial success should be reported leg by leg.
Also `formatDelivery` prints `tx.hash` for a failed leg (an empty string); print `tx.error` instead.

---

## 3. Structural / housekeeping

| Finding | Action |
|---|---|
| `src/mandate/templates.ts` **duplicates** the `TEMPLATES` block inside `parse.ts` — two sources of truth | keep `templates.ts`, delete the copy in `parse.ts` |
| `getTemplate` imported in `cli.ts` but never used | remove the import |
| `import { spawn }` at the top of `onchainos/index.ts` is unused (the code re-imports dynamically) | remove |
| `dist/` + `node_modules/` sit inside the project with no `.gitignore`, and there is no git repo at all | `git init` + `.gitignore` before the submission window |
| `npm test` runs vitest and matches **0 test files** (exits non-zero) | add the parser/diff tests the guide schedules for Day 2 |
| `types.ts:Quote` uses `priceImpact`/`estimatedOutput`; the PDF API contract calls them `impact` | pick one, document it in `docs/architecture.md` |
| Explorer URL hardcoded to `okx.com/web3/explorer/xlayer` | derive from config so testnet (1952) works |

---

## 4. Missing pieces required by the build guide

The guide's repo layout and Day 1–9 plan ask for parts that are absent:

| Expected (guide) | Status in repo |
|---|---|
| `README.md` | **was missing**  added |
| `docs/architecture.md` | **was missing (`docs/` was empty)**  added |
| `docs/implementation-plan.md` |  added |
| `demos/demo-script.md` | **was missing (`demos/` was empty)**  added |
| HTTP API `POST /api/plan`, `/api/execute`, `GET /api/portfolio` | **absent** — CLI only |
| Frontend (Next.js single page) | **absent** |
| Unit tests (parser, diff) | **absent** — vitest finds 0 files |
| `.env` / config for chain, allowlist, fee | **absent** (only `MEIREI_MOCK_ONCHAINOS`) |
| `.gitignore` + git repo | **absent** |
| ASP registration surface | **absent** (see 5.2) |

Judge must-work criteria (Build Guide §7.1) against today's code:

| Criterion | Status |
|---|---|
| Parse mandate  weights | ️ breaks on the demo string (1.1) |
| Read X Layer balances |  addresses/decimals wrong (1.2, 1.4); mock always empty (2.5) |
| ≥1 real xStock/USDG swap on X Layer |  wrong subcommand + placeholder addresses (1.5) |
| Agent/service callable or listed on OKX AI |  no ASP code |
| Fee or payment proof |  receipts are fabricated (5.1) |
| Public repo + 2–4 min video |  no repo, no video |

---

## 5. P1 — Fee & ASP are stubs

### 5.1 The fee "receipt" is randomly generated

```ts
return { amount: amount.toFixed(4), asset, status: "settled",
         txHash: `0x${Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join("")}` };
```

A random 32-byte hex string is presented as a settled tx hash. On a track whose judges explicitly
ask for *"fee or payment proof"*, this is the highest-value thing to replace — and the CLI already
has the primitive:

```bash
onchainos payment a2a-pay create    # Seller: paymentId + challenge
onchainos payment a2a-pay pay       # Buyer: sign EIP-3009, submit credential
onchainos payment a2a-pay status --wait
onchainos payment decode-receipt    #  {status, transaction, amount, payer, chainId}
```

Map `feeOptions.mode: "a2a-escrow"` onto `create  pay  status  decode-receipt` and persist the
real `transaction` hash / escrow id. Keep the fixed/percentage **math** local (it is correct), but
the receipt must come from the chain. `payment charge` + `decode-receipt` is the lighter-weight
alternative if a full A2A round trip is too slow to demo.

### 5.2 ASP registration is described but not implemented

`onchainos agent` exposes the whole surface — `pre-check`, `create`, `update`, `service-list`,
`activate`, `deactivate`, `service-match`, `asp list-tasks`, `asp status`. Wrap it as
`npm run asp:register` / `npm run asp:list` so the demo can show the listing without leaving the repo:

```
name:         Mandate Portfolio Execution
description:  Input a natural-language investment mandate (e.g. 60% Mag7 xStocks, 20% USDG,
              max 8% single name). Output: parsed weights, rebalance plan, executed X Layer swaps
              (tx hashes), and final portfolio. Execution chain: X Layer only.
pricing:      fixed per run (e.g. 5 USDT) or negotiate per task
serviceType:  A2A
```

---

## 6. Prioritized roadmap

Ordered by "unblocks the most, soonest". Days follow the guide's 15–25 Sep window.

### Now — make the demo string work offline (≈ half a day)

1. Real allowlist: addresses + `GOOGLx` rename + correct decimals. **P0**
2. Fix 1.1 cap-aware normalization, 2.1 equal-weight cash, 2.2 free-text regex. **P0**
3. Add vitest coverage for all three parser paths + `computeDiff` dead-band/dust cases. **P0**
4. Delete the fabricated fallback in `runCLI`; make mock mode explicit and funded. **P0**

At this point `parse`, `plan`, `balance` and `templates` all work offline, deterministically.

### Next — real chain reads (≈ half a day)

5. Rewrite `onchainos/index.ts` onto the verified commands (`portfolio all-balances`,
   `swap quote`, `swap execute`, chain alias `xlayer`), one subprocess per portfolio read.
6. Add the cash pre-flight (2.3) so a leg cannot be planned against empty cash.
7. Print a `before  after` portfolio table and the real explorer link per tx.

Now the CLI satisfies *parse*, *read balances* and *one real swap*.

### Then — proof that judges can see (≈ half a day)

8. Replace fake fee receipts with `payment a2a-pay` / `payment charge` + `decode-receipt`.
9. Wrap `agent create|update|service-list` as `asp:register` / `asp:list`.
10. Record one real mainnet tx hash into the README and the demo script.

### If time allows — the web surface (guide Days 1–4)

11. `POST /api/plan` / `POST /api/execute` / `GET /api/portfolio` reusing `handleMandate`
    (the `Delivery` envelope is already the right shape), with the 400/422/502 contract.
12. Next.js single page: mandate box  Plan  Execute (confirm dialog)  tx list + fee badge.
13. A2MCP endpoint as a second surface (`agent a2mcp-probe` exists to test it).

### Explicitly out of scope (per the guide)

Demo-video production is scheduled separately; Telegram/Discord bots, multi-user auth/database,
mobile apps, 100+ tickers, custom AMM/vault contracts are all out of core scope.

---

## 7. Suggested next commit (smallest safe slice)

> **Done in v0.2.0**, plus more than the list below: the funding-aware diff (sell-before-buy
> ordering, exit legs for unlisted assets), the honest fee path (`wallet send` /
> `payment a2a-pay create`, `pending` + reason instead of a fake hash), `--json` output on
> `plan`/`execute`/`balance`, the `templates`/`allowlist` commands, `npm run smoke:live`,
> `.env.example`, and 40 unit tests.

```
fix(allowlist): real X Layer addresses, GOOGLx symbol, per-token decimals
fix(parse):       cap-aware normalization; residual to cash; fix custom/equal-weight regex
fix(onchainos):   swap/portfolio subcommands, xlayer alias, remove fabricated fallback
test(parse):      demo mandate, equal-weight, free-text, maxSingle breach, unknown symbol
test(diff):       dead-band skip, dust guard, buy/sell direction, cash residual
```

That set is enough to make `npm test` meaningful and `npm run plan` honest — with no on-chain risk
because everything above is deterministic, offline, pure logic.
