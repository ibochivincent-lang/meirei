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
