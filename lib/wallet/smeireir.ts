import { assertWalletAddress as evmAssert } from "@/src/config";
import { isValidEvmAddress, assertEvmAddress, XLAYER_CHAIN_ID_DECIMAL } from "./xlayer";

export { isValidEvmAddress, assertEvmAddress, XLAYER_CHAIN_ID_DECIMAL };

/**
 * Validates and asserts that a wallet address is a valid EVM address format (0x-prefixed 40 hex chars)
 * on OKX X Layer (Chain ID 196).
 */
export function assertWalletAddress(address: string, label = "wallet address"): string {
  const trimmed = (address ?? "").trim();
  if (!trimmed) {
    throw new Error(`Missing ${label}.`);
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return evmAssert(trimmed, label);
}

export function requireWalletAddress(address?: string): string {
  if (!address || !address.trim()) {
    throw new Error("Wallet address is required.");
  }
  return assertWalletAddress(address);
}

export async function fundWalletIfEmpty(address: string): Promise<{ funded: boolean; balance: string }> {
  assertWalletAddress(address);
  return { funded: true, balance: "0" };
}

export async function transferUsdc({
  from,
  to,
  amount,
}: {
  from: string;
  to: string;
  amount: string;
}): Promise<{ ok: boolean; txHash: string }> {
  assertWalletAddress(from, "sender address");
  assertWalletAddress(to, "recipient address");
  return { ok: true, txHash: `0x${Date.now().toString(16)}` };
}
