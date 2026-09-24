import { AllowlistEntry, CashSymbol } from "./types";

/**
 * Verified X Layer (chain 196) contract addresses.
 * Regenerate with: `npm run verify:allowlist`
 *
 * Note: USDG and USDC are 6-decimal, the xStocks are 18-decimal. Getting this
 * wrong scales every balance by 10^12.
 */
export const ALLOWLIST: AllowlistEntry[] = [
  { symbol: "AAPLx", address: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a", decimals: 18, name: "Apple xStock" },
  { symbol: "MSFTx", address: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35", decimals: 18, name: "Microsoft xStock" },
  { symbol: "NVDAx", address: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d", decimals: 18, name: "NVIDIA xStock" },
  { symbol: "GOOGLx", address: "0xe92f673ca36c5e2efd2de7628f815f84807e803f", decimals: 18, name: "Alphabet xStock" },
  { symbol: "AMZNx", address: "0x3557ba345b01efa20a1bddc61f573bfd87195081", decimals: 18, name: "Amazon.com xStock" },
  { symbol: "METAx", address: "0x96702be57cd9777f835117a809c7124fe4ec989a", decimals: 18, name: "Meta xStock" },
  { symbol: "TSLAx", address: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0", decimals: 18, name: "Tesla xStock" },
  { symbol: "COINx", address: "0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25", decimals: 18, name: "Coinbase xStock" },
  { symbol: "SPYx", address: "0x42f7461c360980ff62c3e1db6aa5229c15d48721", decimals: 18, name: "S&P 500 ETF xStock" },
  { symbol: "QQQx", address: "0x71c50b69107cc6ea56795f54070a7f1a8c9e5033", decimals: 18, name: "Invesco QQQ xStock" },
  { symbol: "AMDx", address: "0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2", decimals: 18, name: "Advanced Micro Devices xStock" },
  { symbol: "CRWDx", address: "0x3a4b69c5819772bf258b3506c74ad64a787965df", decimals: 18, name: "CrowdStrike xStock" },
  { symbol: "USDG", address: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", decimals: 6, name: "Global Dollar" },
  { symbol: "USDC", address: "0xb6ceceab302e2e4948951ee7843fc24e92933061", decimals: 6, name: "USD Coin" },
];

/** Mag7 sleeve members. `GOOGx` does not exist on X Layer — the token is `GOOGLx`. */
export const MAG7_SYMBOLS = ["AAPLx", "MSFTx", "NVDAx", "GOOGLx", "AMZNx", "METAx", "TSLAx"] as const;

/** Broad Market and Tech ETF members available on X Layer. */
export const ETF_SYMBOLS = ["SPYx", "QQQx"] as const;

export const CASH_SYMBOLS: CashSymbol[] = ["USDG", "USDC"];

/** Common user spellings that map onto a real allowlisted symbol. */
const SYMBOL_ALIASES: Record<string, string> = {
  GOOGX: "GOOGLx",
  GOOG: "GOOGLx",
  GOOGL: "GOOGLx",
  ALPHABET: "GOOGLx",
  APPLE: "AAPLx",
  AAPL: "AAPLx",
  MSFT: "MSFTx",
  MICROSOFT: "MSFTx",
  NVDA: "NVDAx",
  NVIDIA: "NVDAx",
  AMZN: "AMZNx",
  AMAZON: "AMZNx",
  META: "METAx",
  TSLA: "TSLAx",
  TESLA: "TSLAx",
  COIN: "COINx",
  COINBASE: "COINx",
  COINX: "COINx",
  SPY: "SPYx",
  SP500: "SPYx",
  "S&P500": "SPYx",
  "S&P": "SPYx",
  QQQ: "QQQx",
  NASDAQ: "QQQx",
  AMD: "AMDx",
  ADVANCEDMICRODEVICES: "AMDx",
  CRWD: "CRWDx",
  CROWDSTRIKE: "CRWDx",
};

export const CHAIN_INDEX = 196;

/** Canonical allowlist spelling for a user-supplied symbol, or undefined. */
export function resolveSymbol(symbol: string): string | undefined {
  const key = (symbol ?? "").trim();
  if (!key) return undefined;
  const upper = key.toUpperCase();
  const alias = SYMBOL_ALIASES[upper];
  if (alias) return alias;
  const hit = ALLOWLIST.find((e) => e.symbol.toUpperCase() === upper);
  return hit?.symbol;
}

export function getAllowlistEntry(symbol: string): AllowlistEntry | undefined {
  const canonical = resolveSymbol(symbol);
  if (!canonical) return undefined;
  return ALLOWLIST.find((e) => e.symbol === canonical);
}

export function getAllowlistSymbols(): string[] {
  return ALLOWLIST.map((e) => e.symbol);
}

export function isCashSymbol(symbol: string): symbol is CashSymbol {
  const canonical = resolveSymbol(symbol);
  return canonical !== undefined && (CASH_SYMBOLS as string[]).includes(canonical);
}

export function getCashEntry(symbol: string): AllowlistEntry | undefined {
  const e = getAllowlistEntry(symbol);
  return e && (CASH_SYMBOLS as string[]).includes(e.symbol) ? e : undefined;
}

export function validateSymbols(symbols: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const s of symbols) {
    const canonical = resolveSymbol(s);
    if (canonical) valid.push(canonical);
    else invalid.push(s);
  }
  return { valid, invalid };
}

/** Closest allowlisted symbol for a typo, for "did you mean" error messages. */
export function suggestSymbol(unknown: string): string | undefined {
  const key = unknown.toUpperCase();
  const scored = ALLOWLIST.map((e) => ({ symbol: e.symbol, distance: editDistance(key, e.symbol.toUpperCase()) }))
    .sort((a, b) => a.distance - b.distance);
  const best = scored[0];
  if (!best) return undefined;
  return best.distance <= Math.max(2, Math.floor(key.length / 2)) ? best.symbol : undefined;
}

function editDistance(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}