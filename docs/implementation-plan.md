# Meirei — Core Implementation Plan

How to actually build this: **mandate in  plan  confirm  X Layer swaps  portfolio out**.
Scope is the working product core, not video polish.

Execution: **X Layer (chain 196)** · Track: **Build a Company (OKX AI)**

---

## 1. Module build order

Build in this order; each row is "done when" verifiable without the next row existing.

| # | Module | Done when |
|---|---|---|
| 1 | `types.ts` + `allowlist.ts` | Real addresses/decimals for 7 xStocks + USDG on 196 |
| 2 | `mandate/parse.ts` + `templates.ts` | String  `Mandate`; weights sum to 1; unknown symbol rejected |
| 3 | `portfolio/diff.ts` | `Holding[]` + `Mandate`  `Leg[]` |
| 4 | `portfolio/balances.ts` | Real (or mocked) holdings from Agentic Wallet on 196 |
| 5 | `POST /api/plan` | Frontend can get full preview JSON |
| 6 | `execution/swap.ts` | Quotes returned; execute only when `confirm` |
| 7 | `POST /api/execute` | ≥1 real X Layer tx hash returned |
| 8 | `fee/charge.ts` | Fee line in response, backed by a real payment receipt |
| 9 | `agent/create-asp` | Service visible in `onchainos agent service-list` |

**Rule:** 1–3 are pure logic and must be fully unit-tested offline before any wallet is touched.
Never block progress on wallet setup.

---

## 2. Pure logic first (no chain)

### 2.1 `parse.ts` — string  Mandate

Input: `"60% Mag7, 20% USDG, max 8%"`

Expected output:

```json
{
  "targets": [
    { "symbol": "AAPLx", "weight": 0.08 }, { "symbol": "MSFTx", "weight": 0.08 },
    { "symbol": "NVDAx", "weight": 0.08 }, { "symbol": "GOOGLx", "weight": 0.08 },
    { "symbol": "AMZNx", "weight": 0.08 }, { "symbol": "METAx", "weight": 0.08 },
    { "symbol": "TSLAx", "weight": 0.08 }, { "symbol": "USDG",  "weight": 0.44 }
  ],
  "cashSymbol": "USDG", "maxSingle": 0.08, "rebalanceBand": 0.03
}
```

Responsibilities:
- Expand `Mag7`  equal weight across the allowlisted Mag7 xStocks.
- **Enforce `maxSingle` by capping and pushing the residual to cash** (not by rescaling into other names).
- Reject unknown tickers.
- Deterministic, no LLM required (LLM only as an optional free-text pre-parser).

### 2.2 `diff.ts` — target vs current  legs

```
for each target symbol:
    targetUsd = totalUsd * weight
    delta     = targetUsd - currentUsd
    if |delta| / totalUsd > rebalanceBand   emit buy/sell leg (USD notional)
    if |delta| < $1                         skip (dust)
Cash (USDG) fills the residual.
```

Recommended function shape:

```ts
export function computeDiff(mandate: Mandate, holdings: Holding[]): Leg[]
```

---

## 3. Onchain bridge (balances + swap)

Do **not** reimplement a DEX. Call Onchain OS for: read balances on 196, get swap quote, simulate, broadcast.

```ts
export async function executeLegs(legs: Leg[], opts: { confirm: boolean }) {
  if (!opts.confirm) return { status: "preview", quotes: await quoteAll(legs) };
  const txs = [];
  for (const leg of legs) {
    const q    = await quote(leg);        // onchainos swap quote
    const hash = await broadcast(leg, q); // onchainos swap execute  (fail soft per leg)
    txs.push({ symbol: leg.symbol, hash, explorer: explorerUrl(hash) });
  }
  return { status: "executed", txs };
}
```

Verified command forms (see `docs/suggestions.md` §1.5 for the rebuild checklist):

```bash
onchainos portfolio all-balances --address <wallet> --chains xlayer
onchainos swap quote   --from <addr> --to <addr> --readable-amount 8.6 --chain xlayer
onchainos swap execute --from <addr> --to <addr> --readable-amount 8.6 \
        --chain xlayer --wallet <wallet> --slippage 0.5 --gas-level average
```

During early days, mock balances so the frontend can be built in parallel — but the mock must be
**funded** (e.g. `$10,000` all-cash), otherwise `totalUsd = 0` and no legs are ever produced.

---

## 4. API contract (frontend  backend)

### `POST /api/plan`

Request `{ "mandate": "60% Mag7, 20% USDG, max 8%" }`

Response 200:

```json
{
  "status": "preview",
  "mandate": { "targets": [{"symbol":"AAPLx","weight":0.08}], "cashSymbol": "USDG",
               "maxSingle": 0.08, "rebalanceBand": 0.03 },
  "holdings": [{"symbol":"USDG","amount":10000,"valueUsd":10000}],
  "legs":     [{"side":"buy","symbol":"AAPLx","notionalUsd":800,"from":"USDG","to":"AAPLx"}],
  "quotes":   [{"legIndex":0,"route":"OKX","impact":0.003}]
}
```

### `POST /api/execute`

Request `{ "mandate": "...", "confirm": true }`

Response 200:

```json
{
  "status": "executed",
  "txs": [{ "symbol":"AAPLx", "hash":"0x...",
            "explorer":"https://www.okx.com/web3/explorer/xlayer/tx/0x..." }],
  "portfolio": { "holdings": [], "totalUsd": 10000 },
  "fee": { "amount": "0.5", "asset": "USDT", "status": "settled" }
}
```

### `GET /api/portfolio`

Response `{ "chain": 196, "holdings": [], "totalUsd": 10000 }`

### Error contract

| HTTP | When | Frontend action |
|---|---|---|
| 400 | Bad mandate, or `confirm` false on execute | Show message under the form |
| 422 | Symbol not on allowlist | Highlight the invalid tokens |
| 502 | Onchain OS / RPC failure | Offer retry on plan; do **not** offer execute |
| 200 + `status: "preview"` | Execute without confirm | Treat as plan only |

**Never broadcast without `confirm: true`.**

---

## 5. Frontend (single page, minimal)

Stack: **Next.js (App Router)** · **Tailwind** · `useState`/`useTransition` (no Redux) · same-origin
`/api/*` so there is no CORS and only one deploy.

```
app/page.tsx                 # single page
app/components/
  MandateForm.tsx   TargetsTable.tsx   HoldingsTable.tsx
  LegsTable.tsx     TxList.tsx         FeeBadge.tsx
lib/api.ts                   # plan() / execute() / portfolio()
```

Flow:

1. Type mandate  **Plan**  `POST /api/plan`  render targets + holdings + legs + quotes.
2. Review  **Execute**  confirm dialog ("Broadcast on X Layer?").
3. On OK  `POST /api/execute { mandate, confirm: true }`  txs, portfolio, fee.
4. Disable **Execute** until a successful Plan exists; show errors inline, never silently fail.

Layout blocks: `Mandate` (textarea + buttons) · `Plan` (targets, current holdings, proposed trades
with quotes, status PREVIEW) · `Result` (tx hashes as explorer links, final portfolio, fee receipt).

---

## 6. Day-by-day (guide Days 0–9, 15–25 Sep 2026)

| Day | Date | Backend | Frontend / Connect |
|---|---|---|---|
| 0 | 15 Sep | Repo, Onchain OS install, wallet login, fund 196 | — |
| 1 | 16 Sep | `types`, `allowlist` (real addresses), `parse` + tests | Scaffold Next page + `MandateForm` |
| 2 | 17 Sep | `diff` pure logic + tests; templates; validation | `TargetsTable`, empty state |
| 3 | 18 Sep | `balances` (mock  real `portfolio all-balances`) | `HoldingsTable`; **`POST /api/plan` wired end-to-end** |
| 4 | 19 Sep | `quote` + `swap` + confirm gate; fail soft per leg | `LegsTable`, Execute button + dialog  `POST /api/execute` |
| 5 | 20 Sep | Fee hook (real payment receipt) + `/api/portfolio`; **register ASP (A2A)** | `FeeBadge`, refresh holdings |
| 6 | 21 Sep | Harden errors, allowlist-only enforcement | Loading/error states; README + architecture doc |
| 7 | 22–23 Sep | Edge cases: empty wallet, bad mandate, partial fill, slippage cap | Dry-run the full demo ≥5 times |
| 8 | 24 Sep | Clean commit history for the build window | Film 2–4 min demo; final README |
| 9 | 25 Sep | Submit before **23:59 UTC** | Keep email/Telegram open for validation |

**Parallel track rule:** Days 1–2 the frontend uses static mock JSON from a fixture while the parser
and diff are tested offline. Day 3 replaces the mock with live `/api/plan`.
**Never block the UI on wallet setup on Day 1.**

### Definition of core done

- [ ] User enters a mandate  `plan` returns weights + legs.
- [ ] `execute` with confirm produces **≥1 real X Layer tx hash** shown as an explorer link.
- [ ] Unknown symbols rejected; **no broadcast without confirm**.
- [ ] Backend and frontend share the same `Mandate`/`Plan` types (no contract drift).
- [ ] README explains how to run the app and how to fund the wallet on chain 196.
- [ ] Fee line backed by a real payment receipt; ASP listed on OKX.AI.

---

## 7. Environment

| Var | Purpose |
|---|---|
| `MEIREI_WALLET` | Default wallet address |
| `MEIREI_MOCK_ONCHAINOS=1` | Offline mode — funded fixture, no RPC |
| `MEIREI_CHAIN` | `xlayer` (196) / `xlayer_test` (1952) |
| `MEIREI_FEE_MODE` / `MEIREI_FEE_AMOUNT` | Fee defaults so the demo needs no extra flags |

No secrets in the frontend. The Agentic Wallet is TEE-held; the app never sees a private key.

