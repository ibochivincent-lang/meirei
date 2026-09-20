# Meirei — Demo Script (2–4 minutes)

Judges assess **working product + meaningful OKX AI integration**. Real txs, clear voice, tight pacing.
Record unlisted YouTube / Drive, then link from the README.

## Pre-flight (before recording)

```bash
onchainos wallet status                       # expect loggedIn: true
onchainos wallet balance --chain xlayer       # expect a funded USDG/USDC balance
npm test                                      # parser + diff green
```

Dry-run the whole flow **at least five times**. Have the terminal font large and the explorer tab
pre-opened. Do not record on the first pass.

## Shot list

| Time | Action | On screen |
|---|---|---|
| 0:00–0:20 | Problem one-liner: "xStocks trade 24/7 on X Layer, but nobody runs a *mandate* for you." | Meirei title + track badge *Build a Company · OKX AI* |
| 0:20–0:40 | Type the mandate | `60% Mag7, 20% USDG, max 8%` |
| 0:40–1:10 | Parsed plan | Target weights table (7 xStocks @ 8%, USDG 44%) |
| 1:10–1:40 | Current vs target | Drift + proposed trades with quotes |
| 1:40–2:40 | Execute | Quotes  confirm prompt  tx hashes |
| 2:40–3:20 | Result | Final portfolio + explorer links (click one) |
| 3:20–3:50 | Fee / ASP | Payment receipt + A2A listing on OKX.AI |
| 3:50–4:00 | Close | Repo URL + "Build a Company" |

## Commands to show

```bash
# 1. Parse — weights on screen
npm run parse -- "60% Mag7, 20% USDG, max 8%"

# 2. Plan — targets, holdings, drift, quotes (PREVIEW, no broadcast)
npm run plan -- "60% Mag7, 20% USDG, max 8%" -w $MEIREI_WALLET

# 3. Execute — real swaps + explorer links
npm run execute -- "60% Mag7, 20% USDG, max 8%" -w $MEIREI_WALLET --confirm --fee-mode a2a-escrow

# 4. Service surface (shown at 3:20)
npm run asp:list
```

## Narration beats

- **0:00** "This is Meirei. One sentence in — a live xStocks portfolio out, on X Layer."
- **0:30** "It read the mandate and expanded Mag7 into seven allowlisted xStocks, capped every name at
  8% exactly as asked, and pushed the remainder to USDG."
- **1:15** "Here's what I already hold versus those targets — and the trades needed to close the gap."
- **1:45** "Nothing is signed yet. Quotes come from the OKX DEX aggregator on X Layer; I confirm here."
- **2:45** "Every leg is a real X Layer transaction — here it is on the explorer."
- **3:30** "Meirei is listed on OKX.AI as an A2A service, and the fee settled onchain."
- **3:55** "Meirei — mandate in, portfolio out. Build a Company, OKX AI."

## Safety rules to state out loud (judges check these)

- Chain is **X Layer (196) only** — never Solana or Ethereum.
- **Allowlist only**: seven xStocks + stablecoin cash. No memecoins, no unknown addresses.
- **No broadcast without explicit confirm.**
- Fail soft: one reverted leg does not abort the rest.

## Evidence to keep

- [ ] ≥1 real X Layer tx hash + explorer link (mainnet preferred).
- [ ] ASP listing screenshot from `onchainos agent service-list`.
- [ ] Payment receipt (or escrow id) proving the fee path.
- [ ] Repo URL visible on the closing frame.

---

*OKX Dev Day 2026 build. Not investment advice. Crypto assets involve risk. Follow official OKX terms.*
