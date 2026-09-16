/**
 * Network selection tests. Runner-free — run with `pnpm test`. Exits
 * non-zero on any failure.
 *
 * The case that matters most is the typo: a misspelt STELLAR_NETWORK must
 * not quietly mean testnet, because wallets created on the wrong network
 * can't be moved afterwards.
 */

import { stellarNetwork, isMainnet, explorerTxUrl, usdcAsset } from "./network";

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const TX = "abc123";

const CHECKS: [string, () => boolean][] = [
  ["unset means testnet", () => withEnv({ STELLAR_NETWORK: undefined }, () => stellarNetwork() === "TESTNET")],
  ["empty means testnet", () => withEnv({ STELLAR_NETWORK: "" }, () => stellarNetwork() === "TESTNET")],
  ["PUBLIC is mainnet", () => withEnv({ STELLAR_NETWORK: "PUBLIC" }, () => isMainnet())],
  ["TESTNET is not mainnet", () => withEnv({ STELLAR_NETWORK: "TESTNET" }, () => !isMainnet())],
  ["surrounding whitespace is tolerated", () => withEnv({ STELLAR_NETWORK: " PUBLIC\n" }, () => isMainnet())],
  ["a typo throws instead of falling back", () => withEnv({ STELLAR_NETWORK: "STELLAR_MAINNET" }, () => throws(stellarNetwork))],
  ["lowercase is not accepted", () => withEnv({ STELLAR_NETWORK: "public" }, () => throws(stellarNetwork))],

  [
    "testnet explorer by default",
    () =>
      withEnv({ STELLAR_NETWORK: undefined, STELLAR_EXPLORER_TX_URL: undefined }, () =>
        explorerTxUrl(TX) === "https://stellar.expert/explorer/testnet/tx/abc123"),
  ],
  [
    "mainnet explorer on PUBLIC",
    () =>
      withEnv({ STELLAR_NETWORK: "PUBLIC", STELLAR_EXPLORER_TX_URL: undefined }, () =>
        explorerTxUrl(TX) === "https://stellar.expert/explorer/public/tx/abc123"),
  ],
  [
    "the override wins and a trailing slash is dropped",
    () =>
      withEnv({ STELLAR_NETWORK: "PUBLIC", STELLAR_EXPLORER_TX_URL: "https://example.io/tx/" }, () =>
        explorerTxUrl(TX) === "https://example.io/tx/abc123"),
  ],
  [
    "an empty override falls back instead of producing /abc123",
    () =>
      withEnv({ STELLAR_NETWORK: "PUBLIC", STELLAR_EXPLORER_TX_URL: "" }, () =>
        explorerTxUrl(TX) === "https://stellar.expert/explorer/public/tx/abc123"),
  ],

  [
    "usdcAsset throws when the issuer is unset — never guess a value that pins real money",
    () => withEnv({ STELLAR_USDC_ISSUER: undefined }, () => throws(usdcAsset)),
  ],
  [
    "usdcAsset defaults the code to USDC",
    () =>
      withEnv({ STELLAR_USDC_ISSUER: "GISSUER", STELLAR_USDC_CODE: undefined }, () =>
        usdcAsset().code === "USDC"),
  ],
  [
    "usdcAsset reads the configured issuer",
    () =>
      withEnv({ STELLAR_USDC_ISSUER: "GISSUER" }, () => usdcAsset().issuer === "GISSUER"),
  ],
];

let passed = 0;
const failures: string[] = [];

for (const [name, check] of CHECKS) {
  let ok = false;
  try {
    ok = check();
  } catch (err) {
    failures.push(`  ✗ ${name} threw: ${(err as Error).message}`);
    continue;
  }
  if (ok) passed++;
  else failures.push(`  ✗ ${name}`);
}

console.log(`network: ${passed}/${CHECKS.length} passed`);
if (failures.length) {
  console.error("\nFailures:\n" + failures.join("\n"));
  process.exit(1);
}
