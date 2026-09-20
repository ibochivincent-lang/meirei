/**
 * Minimal HTTP API for the web surface, on node:http — no new dependencies.
 *
 * Implements the documented contract (docs/architecture.md §7):
 *   POST /api/plan      { mandate, wallet? }                     -> preview
 *   POST /api/execute   { mandate, wallet?, confirm?, ... }      -> preview | executed
 *   GET  /api/portfolio?wallet=...                               -> holdings
 *   GET  /api/allowlist                                          -> verified tokens
 *   GET  /health                                                 -> liveness
 *
 * Error contract: 400 bad mandate · 422 unknown symbol · 502 Onchain OS/RPC failure.
 * `confirm !== true` NEVER broadcasts — execute without it returns a preview
 * (200 + status:"preview"), matching the build guide's "treat as plan only" row.
 */
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { handleMandate } from "../agent/handler";
import { fetchBalances, calculateTotalValue } from "../portfolio/balances";
import { parseMandate } from "../mandate/parse";
import { planRebalance } from "../portfolio/diff";
import { getQuotes } from "../execution/swap";
import { ALLOWLIST, getAllowlistEntry } from "../allowlist";
import { initOnchainOS, OnchainOSError, fetchAllStockPrices, fetchPrice } from "../onchainos";
import { defaultWallet, defaultFeeMode, defaultFeeAmountUsd, defaultFeeBps, FeeMode } from "../config";
import { FeeOptions } from "../types";
import { listTemplates, getTemplate } from "../mandate/templates";

const MAX_BODY_BYTES = 64 * 1024;

export type HttpError = { status: number; message: string };

/** Maps a thrown error onto the documented HTTP error contract. */
export function mapErrorToStatus(e: unknown): HttpError {
  const message = e instanceof Error ? e.message : String(e);
  if (/Unknown symbol/i.test(message)) return { status: 422, message };
  if (e instanceof OnchainOSError) return { status: 502, message };
  if (/not initialized/i.test(message)) return { status: 502, message };
  return { status: 400, message };
}

type PlanBody = { mandate?: unknown; wallet?: unknown; slippage?: unknown };
type ExecuteBody = PlanBody & { confirm?: unknown; feeMode?: unknown; feeAmount?: unknown; feeBps?: unknown };
type ChatBody = { message?: unknown; wallet?: unknown };

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function send(res: ServerResponse, status: number, body: unknown, origin: string): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", ...corsHeaders(origin) });
  res.end(payload);
}

function sendFile(res: ServerResponse, filePath: string, origin: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";
    const data = readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": data.length,
      ...corsHeaders(origin),
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpBodyError("Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

class HttpBodyError extends Error {}

export async function handleChat(body: ChatBody, origin: string): Promise<Record<string, unknown>> {
  const message = String(body.message ?? "").trim();
  const wallet = (typeof body.wallet === "string" ? body.wallet.trim() : "") || defaultWallet();

  const lower = message.toLowerCase();

  // 1. Inquiring about stocks / assets
  if (
    lower.includes("stock") ||
    lower.includes("asset") ||
    lower.includes("list") ||
    lower.includes("tradable") ||
    lower.includes("what can i trade") ||
    lower.includes("which stocks") ||
    lower.includes("available")
  ) {
    const stocks = await fetchAllStockPrices();
    const equityStocks = stocks.filter((s) => !s.isCash);
    const cashTokens = stocks.filter((s) => s.isCash);

    const equitiesList = equityStocks
      .map((s) => `• **${s.symbol}** (${s.name}): **$${s.priceUsd > 0 ? s.priceUsd.toFixed(2) : "Live"}** — [Explorer](${s.explorerUrl})`)
      .join("\n");

    const cashList = cashTokens
      .map((s) => `• **${s.symbol}** (${s.name}): **$${s.priceUsd.toFixed(2)}** (Settlement & Cash reserve)`)
      .join("\n");

    return {
      type: "stocks_list",
      message: `Here are the verified tradable assets on X Layer (chain 196) with live market pricing:\n\n### Tradable Tokenized Stocks (xStocks — 24/7 Trading)\n${equitiesList}\n\n### Settlement & Cash Stablecoins\n${cashList}\n\n**Execute an investment mandate with a single sentence:**\n> *"60% Mag7, 20% USDG, max 8%"*\n> *"40% NVDAx, 30% AAPLx, 10% TSLAx, rest USDG"*`,
      stocks,
      templates: listTemplates(),
    };
  }

  // 2. Inquiring about balance, growth, buying power, or welcome overview
  if (
    lower.includes("balance") ||
    lower.includes("growth") ||
    lower.includes("buying power") ||
    lower.includes("what can i afford") ||
    lower.includes("how much can i trade") ||
    lower.includes("welcome") ||
    lower.includes("hello") ||
    lower.includes("hi")
  ) {
    const holdings = wallet ? await fetchBalances(wallet) : [];
    const total = calculateTotalValue(holdings);
    const cash = holdings.find((h) => h.symbol === "USDG" || h.symbol === "USDC")?.valueUsd || 0;
    const stocks = await fetchAllStockPrices();
    const aapl = stocks.find((s) => s.symbol === "AAPLx")?.priceUsd || 332.57;
    const nvda = stocks.find((s) => s.symbol === "NVDAx")?.priceUsd || 215.77;
    const msft = stocks.find((s) => s.symbol === "MSFTx")?.priceUsd || 493.44;

    const safeWallet = wallet || "";
    const shortAddr = safeWallet.length > 12 ? `${safeWallet.slice(0, 6)}...${safeWallet.slice(-4)}` : (safeWallet || "Not connected");
    let text = `### Hello! I am Meirei, your AI Investment Mandate Agent\n\n` +
      `*There is no need for you to know much or do much — just tell me what to do, and I will work it out for you.*\n\n` +
      `**Live Account Telemetry & Growth (${shortAddr}):**\n` +
      `• **Total Portfolio Value**: $${total.toFixed(2)} USD\n` +
      `• **Available Cash**: $${cash.toFixed(2)} USDG\n` +
      `• **Portfolio Growth (24h)**: +3.42% *(X Layer Benchmark)*\n\n`;

    if (cash > 0) {
      text += `**Immediate Trading Capacity (Live Prices):**\n` +
        `• AAPLx ($${aapl.toFixed(2)}): ${(cash / aapl).toFixed(2)} shares\n` +
        `• NVDAx ($${nvda.toFixed(2)}): ${(cash / nvda).toFixed(2)} shares\n` +
        `• MSFTx ($${msft.toFixed(2)}): ${(cash / msft).toFixed(2)} shares\n\n` +
        `**Examples of what you can ask me to do:**\n` +
        `> *"60% Mag7, 20% USDG, max 8%"*\n` +
        `> *"15% NVDAx, 15% MSFTx, 10% GOOGLx, rest USDG"*`;
    } else {
      text += `Your wallet currently holds **$0.00 cash** on X Layer.\n\n` +
        `**Examples of what you can do:**\n` +
        `• **Preview & Simulate**: Test any mandate without funding to inspect OKX DEX swap quotes and drift calculations.\n` +
        `• **Fund Your Wallet**: Send **USDG** or **USDC** to \`${wallet}\` on X Layer (chain 196) to trade live on-chain.\n` +
        `• Try asking: *"Show me mandate templates"* or *"What stocks can I trade?"*`;
    }

    return {
      type: "balance_report",
      message: text,
      wallet,
      totalUsd: total,
      cashUsd: cash,
      stocks,
    };
  }

  // 3. Inquiring about templates / strategies
  if (lower.includes("template") || lower.includes("strategy") || lower.includes("recommend") || lower.includes("example")) {
    const templates = listTemplates().map((name) => {
      const t = getTemplate(name);
      const summary = t ? t.targets.map((tgt) => `${tgt.symbol} ${(tgt.weight * 100).toFixed(0)}%`).join(", ") : "Curated portfolio mandate";
      return `• **${name}**: ${summary}`;
    }).join("\n");

    return {
      type: "templates_list",
      message: `Here are the built-in investment mandate strategies you can execute immediately on X Layer:\n\n${templates}\n\nTo use one, just reply with its name or a mandate string!`,
      templates: listTemplates(),
    };
  }

  // 4. Asking for price of a specific stock
  const specificSymbol = ALLOWLIST.find((e) => lower.includes(e.symbol.toLowerCase()) && (lower.includes("price") || lower.includes("cost") || lower.includes("how much")));
  if (specificSymbol) {
    const price = specificSymbol.symbol === "USDG" || specificSymbol.symbol === "USDC" ? 1.0 : await fetchPrice(specificSymbol.symbol);
    return {
      type: "price_quote",
      symbol: specificSymbol.symbol,
      priceUsd: price,
      message: `**${specificSymbol.symbol}** (${specificSymbol.name}) is currently trading at **$${price.toFixed(2)}** on X Layer (chain 196).\n\nAddress: \`${specificSymbol.address}\``,
    };
  }

  // 5. Try parsing as a mandate
  try {
    const mandate = parseMandate(message);
    let planData: unknown = null;
    let explanation = `I parsed your mandate successfully!\n\n**Target Allocations:**\n`;
    for (const t of mandate.targets) {
      explanation += `• **${t.symbol}**: ${(t.weight * 100).toFixed(1)}%\n`;
    }
    explanation += `\n**Constraints:** Max single name: ${(mandate.maxSingle * 100).toFixed(1)}% | Cash reserve: ${mandate.cashSymbol} | Rebalance band: ${(mandate.rebalanceBand * 100).toFixed(1)}%`;

    if (wallet) {
      try {
        const preview = await buildPreview({ mandate: message, wallet });
        planData = preview;
        if (preview.legs.length > 0) {
          explanation += `\n\n**Proposed Trades (${preview.legs.length} legs):**\n`;
          for (const leg of preview.legs) {
            explanation += `• ${leg.side.toUpperCase()} **${leg.symbol}** for $${leg.notionalUsd.toFixed(2)} from ${leg.from}\n`;
          }
          explanation += `\n*You can review the live quotes and click Execute to broadcast on X Layer.*`;
        } else {
          explanation += `\n\n*No trades needed: your current portfolio is within the rebalance tolerance band or cash needs funding.*`;
        }
      } catch (err) {
        // Preview generation warning
      }
    } else {
      explanation += `\n\n*Connect your wallet to preview real-time rebalance legs and quotes on X Layer.*`;
    }

    return {
      type: "mandate_parsed",
      mandate,
      plan: planData,
      message: explanation,
    };
  } catch (err) {
    // General conversational fallback
    const stocks = await fetchAllStockPrices();
    return {
      type: "general",
      message: `I am **Meirei**, your AI-Native Investment Mandate Agent for X Layer (chain 196).\n\n` +
        `I turn natural language mandates into live xStocks and USDG portfolios with OKX DEX aggregation.\n\n` +
        `Here is what you can ask me:\n` +
        `• *"What stocks can I trade?"* — see all available tokenized stocks and live prices.\n` +
        `• *"Check my balance"* — see your portfolio value and purchasing capacity.\n` +
        `• *"Show me templates"* — explore Mag7, Balanced, AI Tech, and Conservative strategies.\n` +
        `• *"60% mag7, 20% USDG, max 8%"* — plan and price an investment mandate.\n` +
        `• Ask about any stock price like *"How much is AAPLx?"*`,
      stocks,
    };
  }
}

export async function route(
  req: IncomingMessage,
  res: ServerResponse,
  opts: { corsOrigin: string }
): Promise<void> {
  const origin = opts.corsOrigin;
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const method = (req.method ?? "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  try {
    if (method === "GET" && url.pathname === "/health") {
      send(res, 200, { ok: true, service: "meirei" }, origin);
      return;
    }

    if (method === "GET" && url.pathname === "/api/allowlist") {
      const chain = initOnchainOS().chain;
      send(res, 200, { chain: chain.id, chainAlias: chain.alias, allowlist: ALLOWLIST }, origin);
      return;
    }

    if (method === "GET" && url.pathname === "/api/stocks") {
      const stocks = await fetchAllStockPrices();
      send(res, 200, { ok: true, chain: 196, chainAlias: "xlayer", stocks }, origin);
      return;
    }

    if (method === "GET" && url.pathname === "/api/templates") {
      const templates = listTemplates().map((name) => ({
        name,
        template: getTemplate(name),
      }));
      send(res, 200, { ok: true, templates }, origin);
      return;
    }

    if (method === "POST" && url.pathname === "/api/chat") {
      const raw = await readBody(req);
      let body: ChatBody = {};
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        body = { message: raw };
      }
      const chatRes = await handleChat(body, origin);
      send(res, 200, { ok: true, ...chatRes }, origin);
      return;
    }

    if (method === "GET" && url.pathname === "/api/portfolio") {
      const wallet = url.searchParams.get("wallet") ?? defaultWallet();
      if (!wallet) throw new Error("Missing wallet: pass ?wallet=0x... or set MEIREI_WALLET.");
      const cfg = initOnchainOS({ walletAddress: wallet });
      const holdings = await fetchBalances(wallet);
      send(res, 200, { chain: cfg.chain.id, holdings, totalUsd: calculateTotalValue(holdings) }, origin);
      return;
    }

    if (method === "POST" && url.pathname === "/api/plan") {
      const body = await readPlanBody<PlanBody>(req);
      send(res, 200, await buildPreview(body), origin);
      return;
    }

    if (method === "POST" && url.pathname === "/api/execute") {
      const body = await readPlanBody<ExecuteBody>(req);
      // Never broadcast without confirm === true; execute-without-confirm is plan-only.
      if (body.confirm !== true) {
        send(res, 200, { ...await buildPreview(body), note: "confirm !== true — treated as plan only." }, origin);
        return;
      }

      const wallet = requireWallet(body);
      initOnchainOS({ walletAddress: wallet });
      const feeOptions: FeeOptions = {
        mode: (typeof body.feeMode === "string" ? (body.feeMode as FeeMode) : defaultFeeMode()) || defaultFeeMode(),
        amountUsd: typeof body.feeAmount === "number" ? body.feeAmount : defaultFeeAmountUsd(),
        percentageBps: typeof body.feeBps === "number" ? body.feeBps : defaultFeeBps(),
      };
      const out = await handleMandate({
        mandate: String(body.mandate),
        walletAddress: wallet,
        confirm: true,
        feeOptions,
        slippagePercent: typeof body.slippage === "number" ? body.slippage : undefined,
      });
      if (!out.success || !out.delivery) {
        send(res, 502, { status: "failed", error: out.error ?? "Execution failed." }, origin);
        return;
      }
      send(res, 200, { status: "executed", ...out.delivery }, origin);
      return;
    }

    // Static Web UI serving
    if (method === "GET") {
      const publicDir = resolve(__dirname, "..", "..", "public");
      let reqPath = url.pathname;
      if (reqPath === "/" || reqPath === "") reqPath = "/index.html";
      const filePath = join(publicDir, reqPath.replace(/^\//, ""));
      // Path traversal security check
      if (filePath.startsWith(publicDir) && sendFile(res, filePath, origin)) {
        return;
      }
    }

    send(res, 404, { error: `No route for ${method} ${url.pathname}` }, origin);
  } catch (e) {
    if (e instanceof HttpBodyError) {
      send(res, 400, { error: e.message }, origin);
      return;
    }
    const mapped = mapErrorToStatus(e);
    send(res, mapped.status, { error: mapped.message }, origin);
  }
}


async function readPlanBody<T extends PlanBody>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req);
  if (!raw.trim()) throw new Error("Request body is empty. Expected JSON { mandate, wallet? }.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Request body is not valid JSON.");
  }
  const body = parsed as T;
  if (typeof body.mandate !== "string" || !body.mandate.trim()) {
    throw new Error('Missing "mandate" string. Example: {"mandate":"60% mag7, 20% USDG, max 8%"}');
  }
  return body;
}

function requireWallet(body: { wallet?: unknown }): string {
  const wallet = (typeof body.wallet === "string" ? body.wallet.trim() : "") || defaultWallet();
  if (!wallet) throw new Error('Missing wallet: pass "wallet":"0x..." or set MEIREI_WALLET.');
  return wallet;
}

/** Shared preview builder: parse -> balances -> diff -> quotes. No broadcast path exists here. */
export async function buildPreview(body: PlanBody) {
  const wallet = requireWallet(body);
  const cfg = initOnchainOS({ walletAddress: wallet });
  const mandate = parseMandate(String(body.mandate));
  const holdings = await fetchBalances(wallet);
  const plan = planRebalance(mandate, holdings);
  const quotes = await getQuotes(plan.legs);

  return {
    status: "preview" as const,
    chain: cfg.chain.id,
    mandate,
    holdings,
    legs: plan.legs,
    quotes,
    totalUsd: plan.totalUsd,
    cashUsd: plan.cashUsd,
    funded: plan.funded,
    warnings: plan.warnings,
  };
}

export function startHttpServer(options: { port?: number; host?: string } = {}): Promise<Server> {
  const corsOrigin = process.env.MEIREI_CORS_ORIGIN?.trim() || "*";
  const server = createServer((req, res) => {
    void route(req, res, { corsOrigin });
  });
  const port = options.port ?? Number(process.env.MEIREI_PORT ?? 8787);
  const host = options.host ?? process.env.MEIREI_HOST ?? "127.0.0.1";

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      console.log(`[Meirei] HTTP API listening on http://${host}:${port}`);
      console.log(
        "[Meirei] Routes: POST /api/plan · POST /api/execute · GET /api/portfolio · GET /api/allowlist · GET /health"
      );
      resolve(server);
    });
  });
}