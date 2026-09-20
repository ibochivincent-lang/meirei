# Meirei — Architecture

Execution venue: **X Layer (chain 196)** · Track: **Build a Company (OKX AI)**.
Meirei is a thin orchestration layer on top of **OKX Onchain OS**. No DEX, no custodial wallet, no order book.

## 1. Component map

| Layer | Component | Responsibility | Input |
|---|---|---|---|
| Chat UI / CLI | `src/cli.ts` | Accept mandate string, render tables | mandate text |
| Logic | `src/mandate/parse.ts` | NL  target weights JSON | mandate string |
| Logic | `src/portfolio/diff.ts` | Current vs target  trade list | Mandate + Holding[] |
| Logic | `src/portfolio/balances.ts` | Portfolio totals + table formatting | wallet address |
| OKX | `src/onchainos/index.ts` | Balances, quote, broadcast (CLI bridge) | `onchainos` subprocess |
| OKX | Agentic Wallet | Balances, TEE signing, broadcast | — |
| OKX | Swap (DEX agg) | Quote + swap on X Layer | token addresses |
| OKX | Market | Prices / token metadata | token address |
| OKX | Payments / A2A | Fee + ASP listing | delivery receipt |
| Assets | xStocks + USDG | Allowlisted tokens only | `allowlist.ts` |

## 2. End-to-end flow

```
User mandate
   parseMandate()            mandate/parse.ts       Mandate { targets[], cashSymbol, maxSingle, rebalanceBand }
   fetchBalances()           portfolio/balances.ts  Holding[] via onchainos portfolio all-balances
   calculateTotalValue()                             USD total
   computeDiff()             portfolio/diff.ts      Leg[] (buy/sell, USD notional)
   getQuotes()               execution/swap.ts      Quote[] via onchainos swap quote
   [CONFIRM GATE]            options.confirm
   executeSwaps()            execution/swap.ts      TxResult[] via onchainos swap execute
   fetchBalances() again                             before/after portfolio
   chargeFee()               fee/charge.ts          FeeReceipt (x402 / A2A escrow)
   Delivery                  types.ts               JSON envelope
```

`src/agent/handler.ts` orchestrates all of the above and returns the `Delivery` envelope consumed by
the CLI today and by an HTTP route handler later.

## 3. Domain types (`src/types.ts`)

```ts
Target   = { symbol: string; weight: number }                 // weight 0..1
Mandate  = { targets: Target[]; cashSymbol: "USDG"|"USDC"|"USDT0"; maxSingle: number; rebalanceBand: number }
Holding  = { symbol: string; amount: number; valueUsd: number }
Leg      = { side: "buy"|"sell"; symbol: string; notionalUsd: number; from: string; to: string }
Quote    = { legIndex: number; route: string; priceImpact: number; estimatedOutput: number }
Plan     = { mandate: Mandate; holdings: Holding[]; legs: Leg[]; quotes?: Quote[] }
TxResult = { symbol: string; hash: string; explorerUrl: string; status: "success"|"failed"; error?: string }
FeeReceipt = { amount: string; asset: "USDT"|"USDG"|"USDC"; status: "settled"|"pending"|"failed"; txHash?; escrowId? }
Delivery = { service; chain; mandate; plan; txs; portfolio; fee; timestamp }
```

Validation uses **zod**. `parseMandate` enforces weights sum to 1 and rejects unknown symbols.

## 4. Mandate parsing rules

| Input pattern | Behaviour |
|---|---|
| contains `mag7` / `mag 7` | equal-weight across the Mag7 xStocks, default 60% |
| contains `equal weight` | equal-weight across mentioned allowlisted symbols |
| otherwise | custom `SYMBOL pct%` pairs |
| cash | `USDG`/`USDC`/`USDT0`/`cash`/`stable`, default 20% |
| `max N%` | `maxSingle` |
| `band|drift|threshold N%` | `rebalanceBand` |
| other | weights rescaled to 1.0 if they total < 1, else rejected |

Templates: `mag7`, `balanced`, `ai`, `conservative` (see `templates.ts`).

## 5. Diff algorithm (`portfolio/diff.ts`)

```
for each target t:
    currentWeight = current[t.symbol] ?? 0
    drift         = t.weight - currentWeight
    if |drift| < mandate.rebalanceBand: skip          # dead-band, avoids churn
    notional      = |drift| * totalUsd
    if notional < 1 USD: skip                         # dust guard
    drift > 0  BUY  cashSymbol  symbol
    drift < 0  SELL symbol  cashSymbol
```

Cash absorbs the residual, so buys and sells stay balanced in USD terms.

## 6. Onchain OS bridge (`src/onchainos/index.ts`)

Two modes, selected by `initOnchainOS({ useSkills })`:

| Mode | Mechanism |
|---|---|
| CLI | `spawn("onchainos", [...])` subprocess, parsed output |
| Skills | `npx skills run "<natural-language prompt>"`, output parsed by regex |

Verified real interfaces on this machine (see `docs/suggestions.md` for the current mismatch):

```bash
onchainos portfolio all-balances --address <wallet> --chains xlayer
onchainos swap quote   --from <addr> --to <addr> --readable-amount 8.6 --chain xlayer
onchainos swap execute --from <addr> --to <addr> --readable-amount 8.6 \
                       --chain xlayer --wallet <wallet> --slippage 0.5
onchainos payment a2a-pay create|pay|status
onchainos agent create|update|service-list        # ASP registration
```

## 7. HTTP API contract (live — `npm run serve`)

Implemented in `src/server/http.ts` on `node:http` (no new dependencies); the same
`handleMandate`/`buildPreview` functions an in-process Next.js route handler would call.

```
POST /api/plan      { "mandate": "60% Mag7, 20% USDG, max 8%" }
                   { "status":"preview", "mandate":{...}, "holdings":[...], "legs":[...], "quotes":[...] }

POST /api/execute   { "mandate": "...", "confirm": true }
                   { "status":"executed", "txs":[...], "portfolio":{...}, "fee":{...} }

GET  /api/portfolio
                   { "chain":196, "holdings":[...], "totalUsd":100 }
```

Rules: `confirm !== true`  preview only, never broadcast (HTTP 400). Unknown symbol  422.
Onchain OS / RPC failure  502 and the frontend must not offer Execute.

## 8. Network facts

| Property | Mainnet | Testnet |
|---|---|---|
| Chain ID | 196 | 1952 |
| RPC | `https://rpc.xlayer.tech` | `https://testrpc.xlayer.tech/terigon` |
| Gas token | OKB | OKB |
| Explorer | `okx.com/web3/explorer/xlayer` | `okx.com/web3/explorer/xlayer-test` |
| `onchainos --chain` alias | `xlayer` | `xlayer_test` |

Judges prefer **mainnet** transaction hashes. Agentic Wallet flows on X Layer are often gas-free
(Gas Station can pay gas with stablecoins).

## 9. Responsibility split

| Side | Owns | Does not own |
|---|---|---|
| Frontend | UI, form, tables, confirm button, explorer links | Keys, swaps, weight math |
| Backend | Parse, allowlist, balances, diff, quote, execute, fee | Pretty layout |
| Onchain OS | Wallet TEE, DEX routes, broadcast | Mandate strategy |
| X Layer | Settlement of tokens | Product logic |
