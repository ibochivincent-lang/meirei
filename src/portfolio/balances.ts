import { Holding } from "../types";
import { fetchBalances as fetchBalancesOS } from "../onchainos";

export async function fetchBalances(walletAddress: string): Promise<Holding[]> {
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