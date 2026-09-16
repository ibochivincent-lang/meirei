/**
 * Which Stellar network this deployment runs on, read once from
 * STELLAR_NETWORK.
 *
 * Everything that differs between testnet and mainnet asks this module
 * instead of reading the env var itself — same discipline the Arc-era
 * version of this file enforced, kept for the same reason: a typo such as
 * "STELLAR_MAINNET" silently resolving to testnet would create wallets on
 * the wrong network for every new user, and those can't be moved afterwards.
 *
 * An unrecognised value throws rather than falling back.
 */

import { Networks } from "@stellar/stellar-sdk";

export type StellarNetwork = "TESTNET" | "PUBLIC";

const KNOWN: readonly StellarNetwork[] = ["TESTNET", "PUBLIC"];

export function stellarNetwork(): StellarNetwork {
  const raw = process.env.STELLAR_NETWORK?.trim();
  if (!raw) return "TESTNET";
  if ((KNOWN as readonly string[]).includes(raw)) return raw as StellarNetwork;
  throw new Error(
    `STELLAR_NETWORK must be one of ${KNOWN.join(", ")} (got "${raw}")`,
  );
}

export function isMainnet(): boolean {
  return stellarNetwork() === "PUBLIC";
}

/** The signed-transaction network passphrase Stellar's SDK requires. */
export function networkPassphrase(): string {
  return isMainnet() ? Networks.PUBLIC : Networks.TESTNET;
}

/**
 * The Horizon server URL for the active network. HORIZON_URL overrides the
 * per-network default, for pointing at a private Horizon instance.
 */
export function horizonUrl(): string {
  const override = process.env.STELLAR_HORIZON_URL?.trim();
  if (override) return override;
  return isMainnet()
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
}

/**
 * The Circle-issued USDC asset this deployment recognizes, as a
 * (code, issuer) pair. Filtering balances and payments by this PAIR — never
 * by asset code alone — matters because Stellar lets anyone issue an asset
 * called "USDC": matching on code alone would let a scam token be shown or
 * spent as if it were real money.
 *
 * The issuer differs per network and must be set explicitly rather than
 * guessed — see .env.example for the researched values.
 */
export function usdcAsset(): { code: string; issuer: string } {
  const code = process.env.STELLAR_USDC_CODE?.trim() || "USDC";
  const issuer = process.env.STELLAR_USDC_ISSUER?.trim();
  if (!issuer) {
    throw new Error("Missing STELLAR_USDC_ISSUER environment variable");
  }
  return { code, issuer };
}

/**
 * Explorer link for a transaction. STELLAR_EXPLORER_TX_URL (no trailing
 * slash needed) overrides the per-network default.
 */
export function explorerTxUrl(txHash: string): string {
  const fallback = isMainnet()
    ? "https://stellar.expert/explorer/public/tx"
    : "https://stellar.expert/explorer/testnet/tx";
  const base = process.env.STELLAR_EXPLORER_TX_URL || fallback;
  return `${base.replace(/\/$/, "")}/${txHash}`;
}

/** Friendbot only exists on testnet, and only ever mints XLM, never USDC. */
export function friendbotUrl(): string {
  return process.env.STELLAR_FRIENDBOT_URL || "https://friendbot.stellar.org";
}
