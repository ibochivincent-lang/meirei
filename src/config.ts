export type ChainConfig = {
  id: number;
  alias: string;
  name: string;
  nativeSymbol: string;
  explorerTxBase: string;
};

export const XLAYER_MAINNET: ChainConfig = {
  id: 196,
  alias: "xlayer",
  name: "X Layer",
  nativeSymbol: "OKB",
  explorerTxBase: "https://www.okx.com/web3/explorer/xlayer/tx",
};

export const XLAYER_TESTNET: ChainConfig = {
  id: 1952,
  alias: "xlayer_test",
  name: "X Layer Testnet",
  nativeSymbol: "OKB",
  explorerTxBase: "https://www.okx.com/web3/explorer/xlayer-test/tx",
};

export const DEFAULT_CHAIN = XLAYER_MAINNET;

/** `MEIREI_CHAIN` accepts `xlayer` | `196` | `xlayer_test` | `1952`. */
export function resolveChain(value: string | undefined = process.env.MEIREI_CHAIN): ChainConfig {
  const raw = (value ?? "").trim().toLowerCase();
  switch (raw) {
    case "":
    case "196":
    case "xlayer":
    case "okb":
      return XLAYER_MAINNET;
    case "1952":
    case "xlayer_test":
    case "testnet":
      return XLAYER_TESTNET;
    default:
      throw new Error(`Unknown MEIREI_CHAIN "${value}". Use xlayer (196) or xlayer_test (1952).`);
  }
}

export function explorerTxUrl(hash: string, chain: ChainConfig = resolveChain()): string {
  return `${chain.explorerTxBase}/${hash}`;
}

/**
 * Offline mode. Planning works; execution deliberately does NOT, because a mock
 * must never invent a transaction hash.
 */
export function isMockMode(): boolean {
  return process.env.MEIREI_MOCK_ONCHAINOS === "1";
}

export function defaultWallet(): string | undefined {
  const w = process.env.MEIREI_WALLET?.trim();
  return w ? w : undefined;
}

export type FeeMode = "fixed" | "percentage" | "a2a-escrow";

export function defaultFeeMode(): FeeMode {
  const raw = (process.env.MEIREI_FEE_MODE ?? "a2a-escrow").trim().toLowerCase();
  return raw === "fixed" || raw === "percentage" || raw === "a2a-escrow" ? raw : "a2a-escrow";
}

export function defaultFeeAmountUsd(): number | undefined {
  const raw = process.env.MEIREI_FEE_AMOUNT?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function defaultFeeBps(): number | undefined {
  const raw = process.env.MEIREI_FEE_BPS?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** Where Meirei's service fee is collected. Absent => fee is reported as `pending`, never faked. */
export function feeAddress(): string | undefined {
  const a = process.env.MEIREI_FEE_ADDRESS?.trim();
  return a && /^0x[a-fA-F0-9]{40}$/.test(a) ? a : undefined;
}

export function assertWalletAddress(address: string, label = "wallet address"): string {
  const a = (address ?? "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) {
    throw new Error(`Invalid ${label}: "${address}". Expected a 0x-prefixed 40-byte hex address.`);
  }
  return a;
}
