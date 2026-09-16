import { StrKey } from "@stellar/stellar-sdk";

export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, "");

  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;

  if (/^00\d{8,15}$/.test(cleaned)) return `+${cleaned.slice(2)}`;

  return null;
}

/**
 * Is this a Stellar account address ("G..." StrKey ed25519 public key)?
 *
 * Uses the SDK's own StrKey validator rather than a hand-rolled regex —
 * StrKey addresses carry a version byte and a CRC16 checksum in their
 * base32 encoding, so a 56-char-starts-with-G regex would accept strings
 * that are the right SHAPE but not valid addresses.
 *
 * This app sends to user accounts, never to Soroban contracts, so only
 * ed25519 public keys ("G...") are recognized — a "C..." contract address
 * is deliberately not treated as a valid send destination.
 */
export function isStellarAddress(input: string): boolean {
  return StrKey.isValidEd25519PublicKey(input.trim());
}