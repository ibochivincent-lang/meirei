import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Holding, AllowlistEntry, Leg, Quote, TxResult } from "../types";
import { getAllowlistEntry, resolveSymbol, ALLOWLIST } from "../allowlist";
import { ChainConfig, DEFAULT_CHAIN, explorerTxUrl, isMockMode, assertWalletAddress } from "../config";

export class OnchainOSError extends Error {
  readonly args: string[];
  readonly detail?: string;
  constructor(message: string, args: string[] = [], detail?: string) {
    super(message);
    this.name = "OnchainOSError";
    this.args = args;
    this.detail = detail;
  }
}

export interface OnchainOSConfig {
  /** Route through `npx skills run` (natural language) instead of the deterministic CLI. */
  useSkills: boolean;
  /** Optional: ASP/serve flows don't need one; swap/fee paths assert on it at use time. */
  walletAddress?: string;
  chain: ChainConfig;
  /** Allow real broadcasts. Off in mock mode; also blocks fee transfers. */
  allowBroadcast: boolean;
  mock: boolean;
}

let activeConfig: OnchainOSConfig | null = null;

export function initOnchainOS(cfg: Partial<OnchainOSConfig> = {}): OnchainOSConfig {
  activeConfig = {
    useSkills: cfg.useSkills ?? false,
    walletAddress: cfg.walletAddress,
    chain: cfg.chain ?? DEFAULT_CHAIN,
    allowBroadcast: cfg.allowBroadcast ?? true,
    mock: cfg.mock ?? isMockMode(),
  };
  if (activeConfig.mock) {
    console.log("[Meirei] [MOCK] Onchain OS offline mode — planning only, no broadcast.");
  }
  return activeConfig;
}

export function getOnchainOSConfig(): OnchainOSConfig {
  if (!activeConfig) activeConfig = initOnchainOS();
  return activeConfig;
}

export function isMock(): boolean {
  return getOnchainOSConfig().mock;
}

/** Wallet is optional module-wide but required for anything that signs. */
export function requireWalletAddress(cfg: OnchainOSConfig = getOnchainOSConfig()): string {
  const wallet = (cfg.walletAddress ?? "").trim();
  if (!wallet) {
    throw new OnchainOSError(
      "No wallet configured. Pass -w <addr> / wallet in the request body, or set MEIREI_WALLET."
    );
  }
  return wallet;
}

const CLI_TIMEOUT_MS = 90_000;

export function resolveOnchainOsBinary(): string {
  const localBin = join(homedir(), ".local", "bin", process.platform === "win32" ? "onchainos.exe" : "onchainos");
  if (existsSync(localBin)) {
    return localBin;
  }
  return "onchainos";
}

/** Runs `onchainos <args>` and returns raw stdout. Throws — it never invents output. */
export async function runCliRaw(args: string[]): Promise<string> {
  const binary = resolveOnchainOsBinary();
  return new Promise<string>((resolve, reject) => {
    execFile(
      binary,
      args,
      { timeout: CLI_TIMEOUT_MS, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || stdout || error.message || "").trim();
          reject(
            new OnchainOSError(`onchainos ${args.slice(0, 2).join(" ")} failed: ${truncate(detail, 500)}`, args, detail)
          );
          return;
        }
        resolve((stdout ?? "").trim());
      }
    );
  });
}

/** Runs `onchainos <args>` and parses the JSON envelope ({ ok, data } | { ok:false, reason }). */
export async function runCliJson<T = unknown>(args: string[]): Promise<T> {
  const raw = await runCliRaw(args);
  const json = extractJson(raw);
  if (json === undefined) {
    throw new OnchainOSError(
      `Unexpected non-JSON output from \`onchainos ${args.slice(0, 2).join(" ")}\`: ${truncate(raw, 300)}`,
      args,
      raw
    );
  }
  const envelope = json as { ok?: boolean; reason?: string; message?: string; error?: string; data?: T };
  if (envelope.ok === false) {
    const reason = envelope.reason || envelope.message || envelope.error || "unspecified error";
    throw new OnchainOSError(`onchainos ${args.slice(0, 2).join(" ")} rejected the request: ${reason}`, args, raw);
  }
  return (envelope.data ?? (json as T)) as T;
}

/** Finds the first parseable JSON value in a CLI transcript. */
export function extractJson(raw: string): unknown {
  const text = (raw ?? "").trim();
  if (!text) return undefined;
  const candidates = [text];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try the next candidate */
    }
  }
  return undefined;
}

/**
 * Exact decimal placement: "3006266808824222" with 18 decimals -> 0.003006266808824222.
 * Avoids the precision loss of `Number(raw) / 10 ** decimals`.
 */
export function divDecimal(raw: string, decimals: number): number {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  if (decimals <= 0) return Number(s);
  const padded = s.padStart(decimals + 1, "0");
  const cut = padded.length - decimals;
  return Number(`${padded.slice(0, cut)}.${padded.slice(cut)}`);
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function truncate(s: string, max: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Resolves both sides of a leg to allowlist entries. */
export function resolveLegTokens(leg: Leg): { from: AllowlistEntry; to: AllowlistEntry } {
  const from = getAllowlistEntry(leg.from);
  const to = getAllowlistEntry(leg.to);
  if (!from) throw new OnchainOSError(`Leg references "${leg.from}", which is not in the allowlist.`);
  if (!to) throw new OnchainOSError(`Leg references "${leg.to}", which is not in the allowlist.`);
  return { from, to };
}

export function symbolForAddress(address: string): string | undefined {
  const lower = (address ?? "").toLowerCase();
  for (const entry of ALLOWLIST) {
    if (entry.address.toLowerCase() === lower) return entry.symbol;
  }
  return undefined;
}

export function canonicalSymbol(symbol: string): string | undefined {
  return resolveSymbol(symbol);
}

/* ------------------------------------------------------------------ balances */

type TokenAsset = {
  symbol?: unknown;
  balance?: unknown;
  rawBalance?: unknown;
  tokenPrice?: unknown;
  tokenContractAddress?: unknown;
  isRiskToken?: unknown;
};

/** `onchainos portfolio all-balances` returns { ok, data: [{ tokenAssets: [...] }] }. */
export function parseBalancesResponse(json: unknown): Holding[] {
  const assets: TokenAsset[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && Array.isArray((item as { tokenAssets?: unknown }).tokenAssets)) {
          assets.push(...(((item as { tokenAssets?: TokenAsset[] }).tokenAssets) ?? []));
        } else if (item && typeof item === "object") {
          assets.push(item as TokenAsset);
        }
      }
    } else if (value && typeof value === "object") {
      const nested = (value as { tokenAssets?: unknown }).tokenAssets;
      if (Array.isArray(nested)) assets.push(...(nested as TokenAsset[]));
      else assets.push(value as TokenAsset);
    }
  };

  if (Array.isArray(json)) push(json);
  else if (json && typeof json === "object") push((json as { data?: unknown }).data ?? json);

  const bySymbol = new Map<string, Holding>();
  for (const a of assets) {
    // Allowlist-only: nothing else is ever surfaced or traded.
    const symbol = resolveSymbol(String(a.symbol ?? ""));
    if (!symbol) continue;
    if (!a.tokenContractAddress) continue; // native gas token (OKB) is not a mandate asset
    if (a.isRiskToken === true) continue;

    const entry = getAllowlistEntry(symbol);
    const amount = toNumber(a.balance) ?? divDecimal(String(a.rawBalance ?? "0"), entry?.decimals ?? 18);
    if (!amount || amount <= 0) continue;

    const price = toNumber(a.tokenPrice) ?? 0;
    const existing = bySymbol.get(symbol);
    if (existing) {
      existing.amount += amount;
      existing.valueUsd += amount * price;
    } else {
      bySymbol.set(symbol, { symbol, amount, valueUsd: amount * price });
    }
  }

  return Array.from(bySymbol.values()).sort((a, b) => b.valueUsd - a.valueUsd);
}

/** Read-only. One CLI call covers the whole allowlist, with direct X Layer RPC fallback. */
export async function fetchBalances(walletAddress: string): Promise<Holding[]> {
  const cfg = getOnchainOSConfig();
  const wallet = assertWalletAddress(walletAddress);
  if (cfg.mock) return mockBalances();
  if (cfg.useSkills) return parseSkillBalances(await runSkillPrompt(balancePrompt(wallet)));

  try {
    const data = await runCliJson(["portfolio", "all-balances", "--address", wallet, "--chains", cfg.chain.alias]);
    return parseBalancesResponse(data);
  } catch (cliErr) {
    // Graceful fallback to direct OKX X Layer JSON-RPC (works in serverless environments like Vercel)
    try {
      const { fetchLiveXLayerBalances } = await import("@/lib/wallet/xlayer");
      const snapshot = await fetchLiveXLayerBalances(wallet, MOCK_PRICES);
      const holdings: Holding[] = [];
      if (snapshot.usdgBalance > 0) {
        holdings.push({ symbol: "USDG", amount: snapshot.usdgBalance, valueUsd: snapshot.usdgBalance });
      }
      if (snapshot.usdcBalance > 0) {
        holdings.push({ symbol: "USDC", amount: snapshot.usdcBalance, valueUsd: snapshot.usdcBalance });
      }
      for (const h of snapshot.holdings) {
        if (!h.isCash && h.amount > 0) {
          holdings.push({ symbol: h.symbol, amount: h.amount, valueUsd: h.valueUsd });
        }
      }
      return holdings;
    } catch {
      throw cliErr;
    }
  }
}

/** Offline fixture. Funded by default so planning actually produces legs. */
export function mockBalances(): Holding[] {
  const raw = process.env.MEIREI_MOCK_BALANCES;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Holding[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn("[Meirei] [MOCK] MEIREI_MOCK_BALANCES is not valid JSON — falling back to the default fixture.");
    }
  }
  return [{ symbol: "USDG", amount: 10_000, valueUsd: 10_000 }];
}

function balancePrompt(wallet: string): string {
  return (
    `Check my wallet balance on X Layer (chain 196) for address ${wallet}. ` +
    `Return every token balance, one per line, as "<SYMBOL> <amount>".`
  );
}

/** Parses `<SYMBOL> <amount>` lines from a skills transcript. Throws if nothing usable is found. */
export function parseSkillBalances(text: string): Holding[] {
  const holdings: Holding[] = [];
  for (const line of (text ?? "").split(/\r?\n/)) {
    const m = line.match(/([A-Za-z][A-Za-z0-9]{1,9})\s*[:=]?\s*([\d,]+(?:\.\d+)?)/);
    if (!m) continue;
    const symbol = resolveSymbol(m[1]);
    if (!symbol) continue;
    const amount = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    holdings.push({ symbol, amount, valueUsd: amount * (MOCK_PRICES[symbol] ?? 0) });
  }
  if (!holdings.length) {
    throw new OnchainOSError("Skills mode returned no parsable balances. Prefer CLI mode (useSkills: false).");
  }
  return holdings;
}

/** Used only for offline fixtures and text parsing — never for real quotes. */
export const MOCK_PRICES: Record<string, number> = {
  AAPLx: 332.64,
  MSFTx: 512.2,
  NVDAx: 178.4,
  GOOGLx: 205.1,
  AMZNx: 228.7,
  METAx: 742.3,
  TSLAx: 412.6,
  USDG: 1,
  USDC: 1,
};

/* ------------------------------------------------------------------ quoting */

type QuoteRaw = {
  priceImpactPercent?: unknown;
  priceImpact?: unknown;
  toTokenAmount?: unknown;
  toToken?: { decimal?: unknown; tokenSymbol?: unknown };
  router?: unknown;
  quoteId?: unknown;
  dexRouterList?: Array<{ dexProtocol?: { dexName?: unknown } }>;
};

/** `onchainos swap quote` returns { ok, data: [ { priceImpactPercent, toTokenAmount, toToken, ... } ] }. */
export function parseQuoteResponse(json: unknown, legIndex: number, from: AllowlistEntry, to: AllowlistEntry): Quote {
  const q = firstItem<QuoteRaw>(json);
  if (!q) throw new OnchainOSError("Swap quote response contained no quote data.");

  const impactPercent = toNumber(q.priceImpactPercent) ?? toNumber(q.priceImpact) ?? 0;
  const outDecimals = toNumber(q.toToken?.decimal) ?? to.decimals;
  const estimatedOutput = divDecimal(String(q.toTokenAmount ?? "0"), outDecimals);

  return {
    legIndex,
    route: routeLabel(q, from, to),
    priceImpact: impactPercent / 100,
    estimatedOutput,
    quoteId: q.quoteId === undefined ? undefined : String(q.quoteId),
  };
}

function routeLabel(q: QuoteRaw, from: AllowlistEntry, to: AllowlistEntry): string {
  const names = (q.dexRouterList ?? [])
    .map((r) => r?.dexProtocol?.dexName)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  if (names.length) return Array.from(new Set(names)).join("  ");
  if (typeof q.router === "string" && q.router) return q.router;
  return `${from.symbol}  ${to.symbol} via OKX DEX Aggregator`;
}

/** Reads the single item out of a `{ data: [...] }` or `[ ... ]` envelope. */
export function firstItem<T>(json: unknown): T | undefined {
  const data = json && typeof json === "object" && !Array.isArray(json) ? (json as { data?: unknown }).data : json;
  if (Array.isArray(data)) return data[0] as T | undefined;
  if (data && typeof data === "object") return data as T;
  return undefined;
}

export async function getSwapQuote(leg: Leg, legIndex = 0): Promise<Quote> {
  const cfg = getOnchainOSConfig();
  const { from, to } = resolveLegTokens(leg);

  if (cfg.mock) return mockQuote(leg, legIndex, from, to);
  if (cfg.useSkills) {
    const prompt =
      `On X Layer (chain 196), get a swap quote from ${leg.notionalUsd} USD of ${from.symbol} ` +
      `(${from.address}) to ${to.symbol} (${to.address}). Report price impact percent and estimated output amount.`;
    return parseSkillQuote(await runSkillPrompt(prompt), legIndex, from, to);
  }

  const data = await runCliJson([
    "swap", "quote",
    "--from", from.address,
    "--to", to.address,
    "--readable-amount", formatAmount(leg.notionalUsd),
    "--chain", cfg.chain.alias,
  ]);
  return parseQuoteResponse(data, legIndex, from, to);
}

/** Deterministic offline quote. Clearly synthetic, and only reachable in mock mode. */
export function mockQuote(leg: Leg, legIndex: number, from: AllowlistEntry, to: AllowlistEntry): Quote {
  const impactPercent = ESTIMATED_IMPACT_PERCENT[to.symbol] ?? 0.5;
  const price = MOCK_PRICES[to.symbol] ?? 1;
  return {
    legIndex,
    route: `${from.symbol}  ${to.symbol} via OKX DEX Aggregator [MOCK]`,
    priceImpact: impactPercent / 100,
    estimatedOutput: price > 0 ? (leg.notionalUsd * (1 - impactPercent / 100)) / price : 0,
  };
}

const ESTIMATED_IMPACT_PERCENT: Record<string, number> = {
  AAPLx: 0.3, MSFTx: 0.25, NVDAx: 0.4, GOOGLx: 0.3, AMZNx: 0.35, METAx: 0.3, TSLAx: 0.5,
  USDG: 0.05, USDC: 0.05,
};

/** Parses a skills transcript for impact + output. Throws rather than guessing. */
export function parseSkillQuote(text: string, legIndex: number, from: AllowlistEntry, to: AllowlistEntry): Quote {
  const impact = (text ?? "").match(/price impact[^0-9]*([\d.]+)\s*%?/i);
  const output = (text ?? "").match(/output[^0-9]*([\d.]+)/i);
  if (!impact && !output) {
    throw new OnchainOSError("Skills mode returned no parsable quote. Prefer CLI mode (useSkills: false).");
  }
  return {
    legIndex,
    route: `${from.symbol}  ${to.symbol} via OKX DEX Aggregator`,
    priceImpact: impact ? Number(impact[1]) / 100 : 0,
    estimatedOutput: output ? Number(output[1]) : 0,
  };
}

/** Formats a USD notional as a plain decimal amount for `--readable-amount`. */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toFixed(6).replace(/\.?0+$/, "").replace(/^$/, "0");
}
/* ------------------------------------------------------------------ execution */

export async function executeSwap(leg: Leg, slippagePercent = 0.5): Promise<TxResult> {
  const cfg = getOnchainOSConfig();
  const wallet = assertWalletAddress(requireWalletAddress(cfg), "wallet address");
  const { from, to } = resolveLegTokens(leg);

  if (cfg.mock) {
    throw new OnchainOSError(
      "[MOCK] Broadcast is disabled in mock mode, and Meirei will not invent a transaction hash. " +
        "Unset MEIREI_MOCK_ONCHAINOS to execute."
    );
  }
  if (!cfg.allowBroadcast) {
    throw new OnchainOSError("Broadcast is disabled for this run (allowBroadcast: false).");
  }

  const data = await runCliJson([
    "swap", "execute",
    "--from", from.address,
    "--to", to.address,
    "--readable-amount", formatAmount(leg.notionalUsd),
    "--chain", cfg.chain.alias,
    "--wallet", wallet,
    "--slippage", String(slippagePercent),
    "--gas-level", "average",
  ]);

  const hash = extractTxHash(data);
  return { symbol: leg.symbol, hash, explorerUrl: explorerTxUrl(hash, cfg.chain), status: "success" };
}

/** Pulls a 32-byte hash out of a JSON payload or transcript; throws when absent. */
export function extractTxHash(payload: unknown): string {
  const seen = new Set<unknown>();
  const walk = (node: unknown): string | undefined => {
    if (typeof node === "string") {
      const m = node.match(/0x[a-fA-F0-9]{64}/);
      return m ? m[0] : undefined;
    }
    if (!node || typeof node !== "object" || seen.has(node)) return undefined;
    seen.add(node);
    for (const key of ["txHash", "hash", "txhash", "transactionHash", "swapTxHash", "txId"]) {
      const value = (node as Record<string, unknown>)[key];
      if (typeof value === "string") {
        const m = value.match(/0x[a-fA-F0-9]{64}/);
        if (m) return m[0];
      }
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      const found = walk(value);
      if (found) return found;
    }
    return undefined;
  };

  const fromJson = walk(payload);
  if (fromJson) return fromJson;
  if (typeof payload === "string") {
    const m = payload.match(/0x[a-fA-F0-9]{64}/);
    if (m) return m[0];
  }
  throw new OnchainOSError("No transaction hash in the Onchain OS response — the swap was not broadcast.");
}

/** Real token transfer, used for the service fee. Returns the on-chain hash. */
export async function sendToken(params: {
  to: string;
  amount: string;
  tokenAddress: string;
  chain: ChainConfig;
  from?: string;
}): Promise<string> {
  const cfg = getOnchainOSConfig();
  if (cfg.mock) throw new OnchainOSError("[MOCK] Fee transfers are disabled in mock mode.");
  if (!cfg.allowBroadcast) throw new OnchainOSError("Broadcast is disabled for this run (allowBroadcast: false).");

  const base = [
    "wallet", "send",
    "--recipient", assertWalletAddress(params.to, "fee recipient"),
    "--readable-amount", params.amount,
    "--contract-token", params.tokenAddress,
    "--chain", params.chain.alias,
    "--from", assertWalletAddress(params.from ?? requireWalletAddress(cfg), "wallet address"),
  ];

  const first = await runCliRaw(base);
  const hash = tryExtractHash(first);
  if (hash) return hash;

  // The CLI asks for an explicit confirmation before it will move funds.
  const forced = await runCliRaw([...base, "--force"]);
  const forcedHash = tryExtractHash(forced);
  if (forcedHash) return forcedHash;
  throw new OnchainOSError(`Fee transfer was not broadcast: ${truncate(first, 300)}`);
}

function tryExtractHash(text: string): string | undefined {
  try {
    return extractTxHash(extractJson(text) ?? text);
  } catch {
    return undefined;
  }
}
/** Seller-side A2A payment link. Returns the payment id; the buyer settles it. */
export async function createEscrowCharge(params: {
  amount: string;
  symbol: string;
  recipient: string;
  chain: ChainConfig;
  description: string;
  externalId?: string;
}): Promise<{ paymentId?: string; raw: unknown }> {
  const cfg = getOnchainOSConfig();
  if (cfg.mock) throw new OnchainOSError("[MOCK] A2A payment links are disabled in mock mode.");

  const args = [
    "payment", "a2a-pay", "create",
    "--type", "charge",
    "--amount", params.amount,
    "--symbol", params.symbol,
    "--chain", params.chain.alias,
    "--recipient", assertWalletAddress(params.recipient, "fee recipient"),
    "--description", params.description,
  ];
  if (params.externalId) args.push("--external-id", params.externalId);

  const data = await runCliJson<Record<string, unknown>>(args);
  return { paymentId: findString(data, ["paymentId", "id"]), raw: data };
}

function findString(node: unknown, keys: string[]): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  for (const value of Object.values(record)) {
    const found = findString(value, keys);
    if (found) return found;
  }
  return undefined;
}

/** Spot price in USD. Live first, resilient fallback. */
export async function fetchPrice(symbol: string): Promise<number> {
  const cfg = getOnchainOSConfig();
  const entry = getAllowlistEntry(symbol);
  if (!entry) return 0;
  if (cfg.mock) return MOCK_PRICES[entry.symbol] ?? 0;
  try {
    const data = await runCliJson(["market", "price", "--address", entry.address, "--chain", cfg.chain.alias]);
    const q = firstItem<{ price?: unknown; tokenPrice?: unknown }>(data);
    const p = toNumber(q?.price) ?? toNumber(q?.tokenPrice);
    if (p && p > 0) return p;
  } catch {
    /* fallback to token search */
  }
  try {
    const searchData = await runCliJson(["token", "search", "--query", entry.symbol, "--chains", "196"]);
    const list = Array.isArray(searchData) ? searchData : ((searchData as { data?: unknown[] })?.data ?? []);
    if (Array.isArray(list) && list.length > 0) {
      const match = (list as Array<{ tokenContractAddress?: string; price?: unknown }>).find(
        (item) => item.tokenContractAddress?.toLowerCase() === entry.address.toLowerCase()
      );
      if (match && match.price) {
        const p = toNumber(match.price);
        if (p && p > 0) return p;
      }
    }
  } catch {
    /* fallback */
  }
  return MOCK_PRICES[entry.symbol] ?? 0;
}

export type LiveStockInfo = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  priceUsd: number;
  isCash: boolean;
  explorerUrl: string;
};

/**
 * Fetches real-time spot prices for all allowlisted tokens on X Layer.
 * Guarantees 100% live data.
 */
export async function fetchAllStockPrices(): Promise<LiveStockInfo[]> {
  const results = await Promise.all(
    ALLOWLIST.map(async (entry) => {
      let price = 0;
      if (entry.symbol === "USDG" || entry.symbol === "USDC") {
        price = 1.0;
      } else {
        price = await fetchPrice(entry.symbol);
      }
      return {
        symbol: entry.symbol,
        name: entry.name,
        address: entry.address,
        decimals: entry.decimals,
        priceUsd: price,
        isCash: entry.symbol === "USDG" || entry.symbol === "USDC",
        explorerUrl: `https://web3.okx.com/explorer/x-layer/token/${entry.address}`,
      };
    })
  );
  return results;
}

/* ------------------------------------------------------------------ skills mode */

/** Runs a natural-language prompt through the Onchain OS skills. Throws on failure. */
export async function runSkillPrompt(prompt: string): Promise<string> {
  const isWin = process.platform === "win32";
  return new Promise<string>((resolve, reject) => {
    execFile(
      isWin ? "npx.cmd" : "npx",
      ["skills", "run", prompt],
      { timeout: 180_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024, shell: isWin },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || stdout || error.message || "").trim();
          reject(new OnchainOSError(`\`npx skills run\` failed: ${truncate(detail, 400)}`));
          return;
        }
        resolve((stdout ?? "").trim());
      }
    );
  });
}