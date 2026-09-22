import { Holding } from "../types";
import { fetchBalances as fetchBalancesOS } from "../onchainos";

export const DEMO_SANDBOX_ADDRESS = "0x1960de01896a2f4c3d8e5b6a7c9d0e1f2a3b4c5d";

export const DEMO_SANDBOX_HOLDINGS: Holding[] = [
  { symbol: "USDG", amount: 1000.0, valueUsd: 1000.0 },
  { symbol: "NVDAx", amount: 3.5, valueUsd: 602.0 },
  { symbol: "AAPLx", amount: 5.0, valueUsd: 1165.0 },
  { symbol: "TSLAx", amount: 2.0, valueUsd: 496.0 },
];

export async function fetchBalances(walletAddress: string): Promise<Holding[]> {
  if (walletAddress && walletAddress.toLowerCase() === DEMO_SANDBOX_ADDRESS.toLowerCase()) {
    return DEMO_SANDBOX_HOLDINGS;
  }
  return fetchBalancesOS(walletAddress);
}

export function calculateTotalValue(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.valueUsd, 0);
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatHoldingsTable(holdings: Holding[], total = calculateTotalValue(holdings)): string {
  if (!holdings.length) return "  (empty portfolio)";
  return holdings
    .map((h) => {
      const pct = total > 0 ? ((h.valueUsd / total) * 100).toFixed(2) : "0.00";
      return `  ${h.symbol.padEnd(8)} ${formatUsd(h.valueUsd).padStart(11)}  ${pct.padStart(6)}%`;
    })
    .join("\n");
}