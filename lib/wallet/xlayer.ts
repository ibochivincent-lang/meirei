/**
 * X Layer EVM Network & Wallet Utilities
 * Author: IboTV
 * Platform: OKX Chain / X Layer (Chain 196)
 */

export const XLAYER_CHAIN_ID_DECIMAL = 196;
export const XLAYER_CHAIN_ID_HEX = "0xc4";
export const XLAYER_RPC_URL = "https://rpc.xlayer.tech";
export const XLAYER_EXPLORER_URL = "https://www.oklink.com/xlayer";

export const XLAYER_NETWORK_PARAMS = {
  chainId: XLAYER_CHAIN_ID_HEX,
  chainName: "X Layer Mainnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: [XLAYER_RPC_URL],
  blockExplorerUrls: [XLAYER_EXPLORER_URL],
};

/**
 * Validates that an address is a valid EVM address format (0x-prefixed 40 hex chars).
 */
export function isValidEvmAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

/**
 * Asserts that an address is a valid EVM address or throws an error.
 */
export function assertEvmAddress(address: string | null | undefined, label = "address"): string {
  if (!address || !isValidEvmAddress(address)) {
    throw new Error(`Invalid ${label}: Expected standard 0x-prefixed EVM address on X Layer.`);
  }
  return address.trim().toLowerCase();
}

/**
 * Truncates an EVM address for display (e.g. 0x7f17...e922).
 */
export function formatShortAddress(address: string): string {
  if (!address || address.length < 10) return address || "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export interface XLayerTokenHolding {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  amount: number;
  valueUsd: number;
  priceUsd: number;
  isCash: boolean;
}

export interface XLayerWalletSnapshot {
  walletAddress: string;
  okbBalance: number;
  usdgBalance: number;
  usdcBalance: number;
  holdings: XLayerTokenHolding[];
  totalValueUsd: number;
  timestamp: string;
}

/** Standard allowlist definitions on X Layer Mainnet */
const XLAYER_MONITORED_TOKENS = [
  { symbol: "USDG", address: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", decimals: 6, name: "Global Dollar", isCash: true },
  { symbol: "USDC", address: "0xb6ceceab302e2e4948951ee7843fc24e92933061", decimals: 6, name: "USD Coin", isCash: true },
  { symbol: "NVDAx", address: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d", decimals: 18, name: "NVIDIA xStock", isCash: false },
  { symbol: "AAPLx", address: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a", decimals: 18, name: "Apple xStock", isCash: false },
  { symbol: "TSLAx", address: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0", decimals: 18, name: "Tesla xStock", isCash: false },
  { symbol: "MSFTx", address: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35", decimals: 18, name: "Microsoft xStock", isCash: false },
  { symbol: "GOOGLx", address: "0xe92f673ca36c5e2efd2de7628f815f84807e803f", decimals: 18, name: "Alphabet xStock", isCash: false },
  { symbol: "AMZNx", address: "0x3557ba345b01efa20a1bddc61f573bfd87195081", decimals: 18, name: "Amazon.com xStock", isCash: false },
  { symbol: "METAx", address: "0x96702be57cd9777f835117a809c7124fe4ec989a", decimals: 18, name: "Meta xStock", isCash: false },
];

/** Standard fallback spot reference prices for USD valuation */
const REFERENCE_PRICES: Record<string, number> = {
  USDG: 1.0,
  USDC: 1.0,
  NVDAx: 178.4,
  AAPLx: 332.64,
  TSLAx: 412.6,
  MSFTx: 512.2,
  GOOGLx: 205.1,
  AMZNx: 228.7,
  METAx: 742.3,
};

/**
 * Parses raw hex BigNumber values to standard floating decimals.
 */
export function parseHexAmount(hex: string | null | undefined, decimals: number): number {
  if (!hex || hex === "0x" || hex === "0x0") return 0;
  try {
    const bn = BigInt(hex);
    if (bn === BigInt(0)) return 0;
    if (decimals === 18) {
      const str = bn.toString().padStart(19, "0");
      const intPart = str.slice(0, str.length - 18) || "0";
      const decPart = str.slice(str.length - 18, str.length - 14);
      return parseFloat(`${intPart}.${decPart}`);
    } else if (decimals === 6) {
      const str = bn.toString().padStart(7, "0");
      const intPart = str.slice(0, str.length - 6) || "0";
      const decPart = str.slice(str.length - 6, str.length - 4);
      return parseFloat(`${intPart}.${decPart}`);
    }
    return Number(bn) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

/**
 * Fetches real on-chain balances directly from OKX X Layer JSON-RPC (Chain ID 196).
 * Queries native OKB and all allowlisted ERC-20 assets in a single batch request.
 */
export async function fetchLiveXLayerBalances(
  walletAddress: string,
  spotPrices?: Record<string, number>
): Promise<XLayerWalletSnapshot> {
  const cleanAddr = walletAddress.trim().toLowerCase();
  const prices = { ...REFERENCE_PRICES, ...(spotPrices || {}) };

  const defaultSnapshot: XLayerWalletSnapshot = {
    walletAddress: cleanAddr,
    okbBalance: 0,
    usdgBalance: 0,
    usdcBalance: 0,
    holdings: [],
    totalValueUsd: 0,
    timestamp: new Date().toISOString(),
  };

  if (!isValidEvmAddress(cleanAddr)) {
    return defaultSnapshot;
  }

  try {
    const padded = cleanAddr.replace("0x", "").padStart(64, "0");
    const balanceOfData = `0x70a08231${padded}`;

    const batchRequest = [
      {
        jsonrpc: "2.0",
        id: 0,
        method: "eth_getBalance",
        params: [cleanAddr, "latest"],
      },
      ...XLAYER_MONITORED_TOKENS.map((token, index) => ({
        jsonrpc: "2.0",
        id: index + 1,
        method: "eth_call",
        params: [
          {
            to: token.address,
            data: balanceOfData,
          },
          "latest",
        ],
      })),
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(XLAYER_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return defaultSnapshot;
    }

    const results = (await response.json()) as Array<{
      id: number;
      result?: string;
      error?: { message: string };
    }>;

    if (!Array.isArray(results)) {
      return defaultSnapshot;
    }

    let okb = 0;
    let usdg = 0;
    let usdc = 0;
    const activeHoldings: XLayerTokenHolding[] = [];

    for (const item of results) {
      if (!item || !item.result) continue;

      if (item.id === 0) {
        okb = parseHexAmount(item.result, 18);
        continue;
      }

      const tokenIndex = item.id - 1;
      const token = XLAYER_MONITORED_TOKENS[tokenIndex];
      if (!token) continue;

      const amount = parseHexAmount(item.result, token.decimals);
      const priceUsd = prices[token.symbol] || 0;
      const valueUsd = amount * priceUsd;

      if (token.symbol === "USDG") {
        usdg = amount;
      } else if (token.symbol === "USDC") {
        usdc = amount;
      }

      if (amount > 0) {
        activeHoldings.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          decimals: token.decimals,
          amount,
          valueUsd,
          priceUsd,
          isCash: token.isCash,
        });
      }
    }

    const totalEquitiesValue = activeHoldings
      .filter((h) => !h.isCash)
      .reduce((sum, h) => sum + h.valueUsd, 0);
    const totalValueUsd = usdg + usdc + totalEquitiesValue;

    return {
      walletAddress: cleanAddr,
      okbBalance: okb,
      usdgBalance: usdg,
      usdcBalance: usdc,
      holdings: activeHoldings,
      totalValueUsd,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[X Layer RPC] Notice fetching live balances:", err);
    return defaultSnapshot;
  }
}

