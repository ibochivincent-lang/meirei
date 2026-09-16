import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Envelope encryption for Stellar wallet secret keys.
 *
 * This is a DIFFERENT trust model from lib/auth/pin.ts, not a variant of it.
 * hashPin/verifyPin only ever need to VERIFY a PIN — the hash is one-way and
 * is never turned back into the PIN. Self-custodial, server-signed sends
 * need the opposite: the server must recover the RAW secret key to sign a
 * transaction, so this cannot be a one-way hash.
 *
 * That is a real asymmetry, worth stating plainly rather than glossing over:
 * a compromised master key plus database access is every user's funds, at
 * once — not a per-user brute-force problem the way a leaked PIN hash is.
 * An env-var master key is an acceptable trust boundary for testnet-only
 * work; treat it as a hard blocker to revisit (real KMS) before any mainnet
 * cutover.
 *
 * The stored format is self-describing, the same way hashPin's `$`-joined
 * string is: `v1$<kekKeyId>$<iv>$<authTag>$<ciphertext>`, so a future key
 * rotation can add STELLAR_WALLET_MASTER_KEY_V2 and keep decrypting old rows
 * under V1 while new rows encrypt under whatever is current — without a
 * separate "which scheme is this" column or a flag day.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const SCHEME = "v1";
const CURRENT_KEK_ID = "v1";

function loadKek(kekKeyId: string): Buffer {
  const envName = `STELLAR_WALLET_MASTER_KEY_${kekKeyId.toUpperCase()}`;
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`Missing ${envName} environment variable`);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envName} must decode to exactly 32 bytes (got ${key.length})`);
  }
  return key;
}

/**
 * Encrypts a Stellar secret key (an "S..." StrKey seed) for storage.
 *
 * The decrypted value must never be logged and must exist only as a
 * short-lived local variable in the one function that signs a transaction —
 * see lib/wallet/stellar.ts.
 */
export function encryptSecretKey(secret: string): string {
  const kek = loadKek(CURRENT_KEK_ID);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, kek, iv);

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SCHEME,
    CURRENT_KEK_ID,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join("$");
}

/**
 * Decrypts a stored envelope back to the raw Stellar secret key.
 *
 * Fails closed: a malformed envelope or a bad auth tag throws rather than
 * returning null. Treating a corrupted ciphertext as "no key" could look
 * like "not provisioned" to a caller and trigger a re-provision that
 * abandons the account's real funds — a thrown error is the only safe
 * reading of "this row exists but I can't recover the secret from it".
 */
export function decryptSecretKey(envelope: string): string {
  const parts = envelope.split("$");
  if (parts.length !== 5 || parts[0] !== SCHEME) {
    throw new Error("Malformed secret envelope");
  }
  const [, kekKeyId, ivB64, authTagB64, ciphertextB64] = parts;

  const kek = loadKek(kekKeyId);
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, kek, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
