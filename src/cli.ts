import { Command } from "commander";
import { parseMandate, listTemplates } from "./mandate/parse";
import { fetchBalances, calculateTotalValue, formatHoldingsTable } from "./portfolio/balances";
import { planRebalance, formatPlan } from "./portfolio/diff";
import { getQuotes, formatQuotes, DEFAULT_SLIPPAGE_PERCENT } from "./execution/swap";
import { handleMandate, formatDelivery } from "./agent/handler";
import { initOnchainOS, fetchPrice, OnchainOSError } from "./onchainos";
import { startHttpServer } from "./server/http";
import {
  aspPreCheck,
  aspRegister,
  aspActivate,
  aspMyAgents,
  aspServiceList,
  buildServiceEntry,
  defaultAspRegistration,
} from "./asp";
import {
  resolveChain,
  defaultWallet,
  defaultFeeMode,
  defaultFeeAmountUsd,
  defaultFeeBps,
  isMockMode,
  FeeMode,
} from "./config";
import { ALLOWLIST, resolveSymbol } from "./allowlist";
import { FeeOptions } from "./types";
import { generateAdvisoryPlan, AdvisoryHorizon, RiskProfile } from "./agent/advisor";

const program = new Command();

program
  .name("meirei")
  .description("命令 — AI-Native Investment Mandate Agent · X Layer (196) · OKX Dev Day 2026")
  .version("0.2.0");

function fail(e: unknown): never {
  console.error("Error:", e instanceof Error ? e.message : String(e));
  process.exit(1);
}

function initFor(wallet?: string, useSkills = false) {
  return initOnchainOS({ useSkills, walletAddress: wallet, chain: resolveChain() });
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

program
  .command("parse <mandate>")
  .description("Parse a mandate into target weights")
  .action((mandate: string) => {
    try {
      printJson(parseMandate(mandate));
    } catch (e) {
      fail(e);
    }
  });

program
  .command("templates")
  .description("List built-in mandate templates")
  .action(() => {
    console.log("Templates:");
    for (const name of listTemplates()) console.log("  " + name);
  });

program
  .command("allowlist")
  .description("Show the tradable allowlist on this chain")
  .action(() => {
    const chain = resolveChain();
    console.log(`Allowlist — ${chain.name} (${chain.id})`);
    for (const e of ALLOWLIST) {
      console.log(`  ${e.symbol.padEnd(8)} ${e.decimals.toString().padStart(2)} decimals  ${e.address}  ${e.name}`);
    }
  });

program
  .command("price <symbol>")
  .description("Fetch live spot price for an allowlisted equity on X Layer")
  .action(async (symbol: string) => {
    try {
      initFor();
      const canonical = resolveSymbol(symbol) || symbol.toUpperCase();
      const spot = await fetchPrice(canonical);
      const item = ALLOWLIST.find((a) => a.symbol === canonical);
      console.log(`Spot Price — ${canonical} (${item?.name || canonical}): $${spot.toFixed(2)} USDG`);
    } catch (e) {
      fail(e);
    }
  });

program
  .command("compare <symbolA> <symbolB>")
  .description("Compare spot prices and calculate relative valuation ratio")
  .action(async (symbolA: string, symbolB: string) => {
    try {
      initFor();
      const symA = resolveSymbol(symbolA) || symbolA.toUpperCase();
      const symB = resolveSymbol(symbolB) || symbolB.toUpperCase();
      const priceA = await fetchPrice(symA);
      const priceB = await fetchPrice(symB);
      const ratio = priceA / (priceB || 1);
      console.log(`Valuation Comparison on X Layer (Chain 196):`);
      console.log(`  ${symA}: $${priceA.toFixed(2)} USDG`);
      console.log(`  ${symB}: $${priceB.toFixed(2)} USDG`);
      console.log(`  Relative Ratio: 1 ${symA} = ${ratio.toFixed(3)} ${symB}`);
    } catch (e) {
      fail(e);
    }
  });

program
  .command("calculate <symbol> <usdAmount>")
  .description("Calculate unit allocation for a given USDG capital amount")
  .action(async (symbol: string, usdAmount: string) => {
    try {
      initFor();
      const canonical = resolveSymbol(symbol) || symbol.toUpperCase();
      const spot = await fetchPrice(canonical);
      const capital = parseFloat(usdAmount);
      const units = capital / (spot || 1);
      console.log(`Unit Calculator (X Layer):`);
      console.log(`  Asset: ${canonical}`);
      console.log(`  Spot Price: $${spot.toFixed(2)} USDG`);
      console.log(`  Capital: $${capital.toFixed(2)} USDG`);
      console.log(`  Calculated Allocation: ${units.toFixed(4)} ${canonical}`);
    } catch (e) {
      fail(e);
    }
  });

program
  .command("advisory <horizon>")
  .description("Generate institutional AI advisory mandate (short_term | long_term)")
  .option("--risk <level>", "conservative | balanced | aggressive", "balanced")
  .option("--capital <usd>", "investment capital in USDG", "2500")
  .action(async (horizon: string, options: { risk: string; capital: string }) => {
    try {
      const h = (horizon === "long_term" || horizon === "long" ? "long_term" : "short_term") as AdvisoryHorizon;
      const r = options.risk as RiskProfile;
      const cap = parseFloat(options.capital) || 2500;
      const plan = generateAdvisoryPlan({ horizon: h, riskProfile: r, capitalUsd: cap });
      console.log(`Advisory Plan: ${plan.strategyName}`);
      console.log(`Horizon: ${plan.horizonLabel} | Risk: ${plan.riskLabel}`);
      console.log(`Thesis: ${plan.thesis}`);
      console.log(`Allocations:`);
      plan.allocations.forEach((a) => {
        const targetUsd = (cap * a.weightPercent) / 100;
        console.log(`  - ${a.symbol} (${a.role}): ${a.weightPercent}% ($${targetUsd.toFixed(2)})`);
      });
      console.log(`Guardrails:`);
      console.log(`  Rebalance Interval: ${plan.rebalanceInterval}`);
      console.log(`  Downside Protection: ${plan.downsideProtection}`);
      console.log(`Executable Mandate: "${plan.mandateRule}"`);
    } catch (e) {
      fail(e);
    }
  });

program
  .command("plan <mandate>")
  .description("Preview the rebalance plan (no broadcast)")
  .option("-w, --wallet <addr>", "wallet on X Layer")
  .option("--slippage <percent>", "slippage tolerance in percent", String(DEFAULT_SLIPPAGE_PERCENT))
  .option("--json", "machine-readable output")
  .option("--no-quotes", "skip quote requests")
  .action(async (mandate: string, options: { wallet?: string; slippage: string; json?: boolean; quotes: boolean }) => {
    const wallet = options.wallet ?? defaultWallet();
    if (!wallet) {
      console.error("Wallet required. Pass -w <addr> or set MEIREI_WALLET.");
      process.exit(1);
    }
    try {
      const cfg = initFor(wallet);
      const parsed = parseMandate(mandate);
      const holdings = await fetchBalances(wallet);
      const plan = planRebalance(parsed, holdings);
      const quotes = options.quotes ? await getQuotes(plan.legs) : undefined;

      if (options.json) {
        printJson({
          status: "preview",
          chain: cfg.chain.id,
          mandate: parsed,
          holdings,
          legs: plan.legs,
          quotes,
          totalUsd: plan.totalUsd,
          cashUsd: plan.cashUsd,
          funded: plan.funded,
          warnings: plan.warnings,
        });
        return;
      }

      console.log(formatPlan(parsed, holdings, { ...plan, quotes }));
      if (quotes) {
        console.log(`Quotes — ${cfg.chain.name} (${cfg.chain.id})`);
        console.log(formatQuotes(quotes));
      }
      console.log("\nPREVIEW — nothing broadcast. Run 'execute --confirm' to trade.");
      if (isMockMode()) console.log("[MOCK] Offline mode: balances are a fixture and quotes are synthetic.");
    } catch (e) {
      fail(e);
    }
  });

program
  .command("execute <mandate>")
  .description("Execute the mandate (broadcasts on X Layer)")
  .requiredOption("-w, --wallet <addr>", "wallet on X Layer")
  .option("--confirm", "required: acknowledge that swaps will be broadcast")
  .option("--fee-mode <mode>", "fixed | percentage | a2a-escrow")
  .option("--fee-amount <usd>", "fixed fee in USD")
  .option("--fee-bps <bps>", "percentage fee in basis points")
  .option("--slippage <percent>", "slippage tolerance in percent", String(DEFAULT_SLIPPAGE_PERCENT))
  .option("--json", "machine-readable output")
  .action(
    async (
      mandate: string,
      options: {
        wallet: string;
        confirm?: boolean;
        feeMode?: string;
        feeAmount?: string;
        feeBps?: string;
        slippage: string;
        json?: boolean;
      }
    ) => {
      if (!options.confirm) {
        console.error("--confirm required: Meirei never broadcasts without an explicit confirmation.");
        process.exit(1);
      }
      try {
        initFor(options.wallet);
        const fee: FeeOptions = {
          mode: (options.feeMode as FeeMode) ?? defaultFeeMode(),
          amountUsd: options.feeAmount ? Number(options.feeAmount) : defaultFeeAmountUsd(),
          percentageBps: options.feeBps ? Number(options.feeBps) : defaultFeeBps(),
        };

        const result = await handleMandate({
          mandate,
          walletAddress: options.wallet,
          confirm: true,
          feeOptions: fee,
          slippagePercent: Number(options.slippage),
        });

        if (options.json) {
          printJson(result);
          if (!result.success) process.exit(1);
          return;
        }
        if (!result.success) {
          console.error(result.error);
          if (result.delivery) console.error(formatDelivery(result.delivery));
          process.exit(1);
        }
        console.log(formatDelivery(result.delivery!));
      } catch (e) {
        fail(e);
      }
    }
  );

program
  .command("balance <wallet>")
  .description("Show the on-chain portfolio")
  .option("--json", "machine-readable output")
  .action(async (wallet: string, options: { json?: boolean }) => {
    try {
      const cfg = initFor(wallet);
      const holdings = await fetchBalances(wallet);
      const total = calculateTotalValue(holdings);
      if (options.json) {
        printJson({ chain: cfg.chain.id, holdings, totalUsd: total });
        return;
      }
      console.log(`Portfolio — ${cfg.chain.name} (${cfg.chain.id}) — $${total.toFixed(2)}`);
      console.log(formatHoldingsTable(holdings, total));
    } catch (e) {
      fail(e);
    }
  });

program
  .command("skills <mandate>")
  .description("Execute through the natural-language Onchain OS skills")
  .requiredOption("-w, --wallet <addr>", "wallet on X Layer")
  .option("--confirm", "required: acknowledge that swaps will be broadcast")
  .action(async (mandate: string, options: { wallet: string; confirm?: boolean }) => {
    if (!options.confirm) {
      console.error("--confirm required: Meirei never broadcasts without an explicit confirmation.");
      process.exit(1);
    }
    try {
      initFor(options.wallet, true);
      const result = await handleMandate({
        mandate,
        walletAddress: options.wallet,
        confirm: true,
        feeOptions: { mode: "a2a-escrow" },
      });
      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }
      console.log(formatDelivery(result.delivery!));
    } catch (e) {
      fail(e);
    }
  });

program
  .command("serve")
  .description("HTTP API for the web surface (POST /api/plan, /api/execute, GET /api/portfolio)")
  .option("--port <n>", "listen port", String(process.env.MEIREI_PORT ?? 8787))
  .option("--host <h>", "listen host", String(process.env.MEIREI_HOST ?? "127.0.0.1"))
  .action(async (options: { port: string; host: string }) => {
    try {
      initFor(defaultWallet());
      const port = Number(options.port);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new OnchainOSError(`Invalid port "${options.port}".`);
      }
      await startHttpServer({ port, host: options.host });
    } catch (e) {
      fail(e);
    }
  });

const asp = program.command("asp").description("OKX.AI ASP (Agent Service Provider) registration");

asp
  .command("precheck")
  .description("Consent + uniqueness verdict (read-only without --consent-key)")
  .option("--consent-key <key>", "submit an earlier consent key (agrees to the terms)")
  .action(async (options: { consentKey?: string }) => {
    try {
      initFor();
      printJson(await aspPreCheck(options.consentKey));
    } catch (e) {
      fail(e);
    }
  });

asp
  .command("payload")
  .description("Show the A2A service payload Meirei would register")
  .option("--fee <usd>", "single-purchase fee in USDT", "5")
  .action((options: { fee: string }) => {
    try {
      const reg = defaultAspRegistration("<avatar-url-after-agent-upload>");
      printJson({ ...reg, service: [buildServiceEntry({ fee: options.fee })] });
    } catch (e) {
      fail(e);
    }
  });

asp
  .command("create")
  .description("Register the Meirei ASP (requires an uploaded avatar URL)")
  .requiredOption("--picture <url>", "avatar URL returned by `onchainos agent upload`")
  .option("--name <name>", "agent name", "Mandate Portfolio Execution")
  .option("--fee <usd>", "single-purchase fee in USDT (A2A)", "5")
  .action(async (options: { picture: string; name: string; fee: string }) => {
    try {
      initFor();
      const reg = defaultAspRegistration(options.picture);
      reg.name = options.name;
      reg.service = buildServiceEntry({ fee: options.fee, name: options.name + " Service" });
      printJson(await aspRegister(reg));
    } catch (e) {
      fail(e);
    }
  });

asp
  .command("activate")
  .description("Submit the agent for review/activation")
  .requiredOption("--agent-id <id>")
  .option("--language <bcp47>", "review language", "en-US")
  .action(async (options: { agentId: string; language: string }) => {
    try {
      initFor();
      printJson(await aspActivate(options.agentId, options.language));
    } catch (e) {
      fail(e);
    }
  });

asp
  .command("list")
  .description("List your own ASP agents")
  .action(async () => {
    try {
      initFor();
      printJson(await aspMyAgents("asp"));
    } catch (e) {
      fail(e);
    }
  });

asp
  .command("services")
  .description("List one agent's services")
  .requiredOption("--agent-id <id>")
  .action(async (options: { agentId: string }) => {
    try {
      initFor();
      printJson(await aspServiceList(options.agentId));
    } catch (e) {
      fail(e);
    }
  });

program.parse();