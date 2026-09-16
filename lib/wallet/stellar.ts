import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  friendbotUrl,
  horizonUrl,
  isMainnet,
  networkPassphrase,
  usdcAsset,
} from "@/lib/wallet/network";
import { encryptSecretKey, decryptSecretKey } from "@/lib/wallet/secret-envelope";

/**
 * Self-custodial Stellar wallet operations. Replaces lib/wallet/circle.ts.
 *
 * The biggest structural change from the Circle era: there is no external
 * custody id. A Stellar account IS its address, so every function here takes
 * an address (and, for signing, an encrypted secret) rather than a walletId.
 */

let _server: Horizon.Server | null = null;

function getServer(): Horizon.Server {
  if (_server) return _server;
  _server = new Horizon.Server(horizonUrl());
  return _server;
}

/**
 * One trimmed-and-labeled balance line. Unlike the Arc/Circle era, there is
 * no dedup step here — a Stellar account holds at most one balance per
 * trustline, so there is no native/predeploy double-accounting to guard
 * against.
 */
export interface TokenBalance {
  symbol: string;
  amount: string;
}

function formatAmount(raw: string): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return String(n);
}

/** The subset of Horizon's balance-line shape this app actually reads. */
export interface RawBalanceLine {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

/**
 * A user's balance lines: native XLM, plus USDC ONLY when it matches the
 * configured (code, issuer) pair.
 *
 * Filtering by the pair rather than by asset code alone is deliberate and
 * load-bearing: Stellar lets anyone issue an asset called "USDC" under their
 * own issuer account, so matching on code alone would let a scam token be
 * shown — and, via resolveSpendableUsdc, spent — as if it were real money.
 * Any other asset the account holds a trustline for is silently omitted
 * rather than mislabeled.
 *
 * Split from the account fetch, same reason the Arc-era collapseBySymbol
 * was: the rule that decides what a balance means should be testable
 * against fixed input rather than a live Horizon account. See
 * lib/wallet/balances.test.ts.
 */
export function classifyBalances(
  balances: readonly RawBalanceLine[],
  usdc: { code: string; issuer: string },
): TokenBalance[] {
  const out: TokenBalance[] = [];
  for (const b of balances) {
    if (b.asset_type === "native") {
      out.push({ symbol: "XLM", amount: formatAmount(b.balance) });
      continue;
    }
    if (b.asset_code === usdc.code && b.asset_issuer === usdc.issuer) {
      out.push({ symbol: "USDC", amount: formatAmount(b.balance) });
    }
    // Any other trustline (including a lookalike "USDC" from a different
    // issuer) is not surfaced — see the function comment.
  }
  return out;
}

export async function getWalletBalances(address: string): Promise<TokenBalance[]> {
  const account = await getServer().loadAccount(address);
  return classifyBalances(account.balances, usdcAsset());
}

export interface SpendableUsdc {
  available: number;
}

/** The USDC a transfer would actually spend from, or null if there is none. */
export async function resolveSpendableUsdc(
  address: string,
): Promise<SpendableUsdc | null> {
  const usdc = (await getWalletBalances(address)).find((b) => b.symbol === "USDC");
  if (!usdc) return null;
  return { available: Number.parseFloat(usdc.amount) };
}

/**
 * Fetches wallet balances and formats them as "{amount} {symbol}" lines,
 * dropping zero-balance entries. Shared by the "what's my balance?" agent
 * reply and the money-received notification, so both surfaces show the
 * same numbers in the same shape. Same signature as the Circle-era version.
 */
export async function getFormattedBalanceLines(address: string): Promise<string[]> {
  const balances = await getWalletBalances(address);
  return balances
    .filter((b) => parseFloat(b.amount) > 0)
    .map((b) => `${b.amount} ${b.symbol}`);
}

export interface ProvisionedWallet {
  address: string;
  secretCiphertext: string;
}

/**
 * Provisioning a Stellar wallet is three steps (generateWallet,
 * fundTestnetAccountIfNeeded, establishUsdcTrustline below), orchestrated by
 * lib/wallet/provision.ts rather than combined into one call here — so a
 * crash between them can persist what's already done and resume from there.
 * Two of the three steps have no Arc/Circle analog at all:
 *
 *   - a Stellar account must be funded with a minimum XLM reserve before it
 *     exists on the ledger; Circle/EVM wallets exist the moment they're
 *     created, with no equivalent step.
 *   - holding a non-native asset requires an explicit trustline; receiving
 *     an ERC-20-style token on Arc needed no such setup.
 *
 * Mainnet account creation needs a sponsored-reserves flow (a funding
 * account covers the new account's minimum balance so a brand-new user is
 * never asked to arrive already holding XLM) and is deliberately out of
 * scope for this pass — see the migration plan.
 */
/**
 * Generates a new keypair and its encrypted-secret envelope. Does not touch
 * the network — split out so provision.ts can persist the address and
 * ciphertext (still `pending`) BEFORE funding and the trustline run, which is
 * what makes a crash mid-provisioning safely resumable: a retry that finds
 * these already written re-uses this same account instead of generating and
 * funding an orphaned second one.
 */
export function generateWallet(): ProvisionedWallet {
  const keypair = Keypair.random();
  return {
    address: keypair.publicKey(),
    secretCiphertext: encryptSecretKey(keypair.secret()),
  };
}

/**
 * Funds a testnet account with XLM via Friendbot, unless it's already
 * funded — Friendbot funding an already-funded account is not something to
 * rely on being harmless, so an existing account is checked for first. This
 * is what makes calling it a second time (a resumed provisioning attempt)
 * safe.
 */
export async function fundTestnetAccountIfNeeded(address: string): Promise<void> {
  if (isMainnet()) {
    throw new Error(
      "Mainnet Stellar account funding (sponsored reserves) is not implemented yet",
    );
  }

  try {
    await getServer().loadAccount(address);
    return;
  } catch {
    // Not found on the ledger yet — fall through to fund it.
  }

  const res = await fetch(
    `${friendbotUrl()}?addr=${encodeURIComponent(address)}`,
  );
  if (!res.ok) {
    throw new Error(`Friendbot funding failed: HTTP ${res.status}`);
  }
}

/**
 * Establishes the USDC trustline for a funded account. Submitting the same
 * changeTrust operation again (a resumed provisioning attempt) is a no-op on
 * Stellar rather than an error, so this needs no separate "already trusts
 * it?" check the way funding does.
 */
export async function establishUsdcTrustline(
  address: string,
  secretCiphertext: string,
): Promise<void> {
  const server = getServer();
  const account = await server.loadAccount(address);
  const { code, issuer } = usdcAsset();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(code, issuer) }))
    .setTimeout(30)
    .build();

  const secret = decryptSecretKey(secretCiphertext);
  tx.sign(Keypair.fromSecret(secret));
  await server.submitTransaction(tx);
}

export interface BuildSignedPaymentArgs {
  fromAddress: string;
  /** Envelope-encrypted secret for fromAddress, decrypted only inside this call. */
  secretCiphertext: string;
  toAddress: string;
  amount: string;
}

/**
 * Builds and signs a USDC payment, returning its XDR without submitting it.
 *
 * Split from submission on purpose. Stellar has no server-assigned
 * idempotency key the way Circle did — safety instead comes from the
 * transaction's own sequence number (a signed envelope can only ever apply
 * once) plus Horizon returning the ORIGINAL result if the exact same signed
 * XDR is resubmitted. So the caller persists this XDR to the transaction row
 * BEFORE calling submitSignedPayment: a crash between the two can safely
 * retry with the identical envelope instead of rebuilding one against a
 * sequence number that may have already advanced, which would mint a
 * genuinely new second payment.
 */
export async function buildSignedPayment({
  fromAddress,
  secretCiphertext,
  toAddress,
  amount,
}: BuildSignedPaymentArgs): Promise<string> {
  const server = getServer();
  const account = await server.loadAccount(fromAddress);
  const { code, issuer } = usdcAsset();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      Operation.payment({
        destination: toAddress,
        asset: new Asset(code, issuer),
        amount,
      }),
    )
    .setTimeout(180)
    .build();

  // The decrypted secret exists only for this call, as a local variable that
  // goes out of scope the moment sign() returns.
  const secret = decryptSecretKey(secretCiphertext);
  tx.sign(Keypair.fromSecret(secret));

  console.log("[stellar] payment built and signed", {
    from: shortenForLog(fromAddress),
    to: shortenForLog(toAddress),
    amount,
  });

  return tx.toXDR();
}

export interface SubmitSignedPaymentResult {
  operationId: string;
  txHash: string;
}

/**
 * Submits a previously built-and-signed payment envelope.
 *
 * Synchronous, unlike Circle's createTransaction: success or failure is
 * known from this call's return/throw, with no async webhook step. The
 * operation id (not the transaction hash) is what stellar-stream.ts dedupes
 * incoming payments on, so it's surfaced here too for symmetry, even though
 * an outbound send's own completion doesn't need dedup — nothing re-delivers
 * it the way Circle's webhook could.
 */
export async function submitSignedPayment(
  xdr: string,
): Promise<SubmitSignedPaymentResult> {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase());
  const result = await server.submitTransaction(tx);

  console.log("[stellar] payment submitted", {
    hash: result.hash,
  });

  return {
    // submitTransaction's response carries the transaction hash, not a
    // per-operation id — this transaction has exactly one operation, so the
    // hash doubles as its identifier for our own bookkeeping.
    operationId: result.hash,
    txHash: result.hash,
  };
}

/**
 * Wallet addresses are identifiers for a person's money. Logs get shipped to
 * third-party aggregators and read by people who don't need to know whose
 * wallet is whose, so they go in truncated.
 */
function shortenForLog(value: string | null | undefined): string {
  if (!value) return "(none)";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
