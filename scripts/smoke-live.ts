// Live-chain smoke check (READ-ONLY): real wallet -> parsed holdings + real quote.
// Verifies the Onchain OS bridge end-to-end without broadcasting anything.
//
// Usage:  npm run smoke:live
//         node -- tsx scripts/smoke-live.ts [wallet]
import { initOnchainOS, fetchBalances, getSwapQuote, resolveLegTokens } from "../src/onchainos/index.js";
import { parseMandate } from "../src/mandate/parse.js";
import { planRebalance } from "../src/portfolio/diff.js";
import { resolveChain } from "../src/config.js";
import { DEFAULT_CHAIN } from "../src/config.js";

// A large USDG holder — used only to prove real balances parse on this chain.
const DEMO_WALLET = "0x0f5a137dce05fb40d1ff1880db49e088a8bf8224";

async function main() {
  const wallet = process.argv[2] ?? DEMO_WALLET;
  const chain = resolveChain();
  initOnchainOS({ walletAddress: wallet, chain });
  console.log(`Meirei live smoke — ${chain.name} (${chain.id})`);

  const holdings = await fetchBalances(wallet);
  console.log("HOLDINGS " + JSON.stringify(holdings));

  // A $1 buy from the wallet's largest cash holding: quote only, never executes.
  const plan = planRebalance(parseMandate("60% mag7, 20% USDG, max 8%"), [
    { symbol: "USDG", amount: 10_000, valueUsd: 10_000 },
  ]);
  const leg = { ...plan.legs[0], notionalUsd: 1 };
  resolveLegTokens(leg);
  const quote = await getSwapQuote(leg, 0);
  console.log("QUOTE " + JSON.stringify(quote));
  console.log("\nRead-only check complete. Nothing was broadcast.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});