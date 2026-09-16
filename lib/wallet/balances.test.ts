/**
 * Balance classification tests. Runner-free — run with `pnpm test`. Exits
 * non-zero on any failure.
 *
 * Stellar has no equivalent of Arc's native/ERC-20 USDC double-accounting —
 * a trustline is one balance line, period — so the case that matters most
 * here is the opposite kind of bug: an asset that merely SHARES a code with
 * USDC, issued by someone else, must never be shown or spent as if it were
 * real money.
 */

import { classifyBalances, type RawBalanceLine } from "./stellar";

const USDC = { code: "USDC", issuer: "GISSUERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };

const NATIVE: RawBalanceLine = { asset_type: "native", balance: "42.5000000" };
const REAL_USDC: RawBalanceLine = {
  asset_type: "credit_alphanum4",
  asset_code: "USDC",
  asset_issuer: USDC.issuer,
  balance: "10.0000000",
};
const SCAM_USDC: RawBalanceLine = {
  asset_type: "credit_alphanum4",
  asset_code: "USDC",
  asset_issuer: "GSCAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  balance: "999999.0000000",
};
const OTHER_ASSET: RawBalanceLine = {
  asset_type: "credit_alphanum4",
  asset_code: "EURC",
  asset_issuer: "GEURCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  balance: "3.0000000",
};

type Check = [string, () => boolean];

const CHECKS: Check[] = [
  [
    "native balance surfaces as XLM",
    () => {
      const out = classifyBalances([NATIVE], USDC);
      return out.length === 1 && out[0].symbol === "XLM" && out[0].amount === "42.5";
    },
  ],
  [
    "USDC matching the configured issuer surfaces",
    () => {
      const out = classifyBalances([REAL_USDC], USDC);
      return out.length === 1 && out[0].symbol === "USDC" && out[0].amount === "10";
    },
  ],
  [
    "a same-code asset from a DIFFERENT issuer is never surfaced — the scam-asset case",
    () => classifyBalances([SCAM_USDC], USDC).length === 0,
  ],
  [
    "a real USDC line and a lookalike from another issuer: only the real one shows",
    () => {
      const out = classifyBalances([REAL_USDC, SCAM_USDC], USDC);
      return out.length === 1 && out[0].amount === "10";
    },
  ],
  [
    "an unrelated asset (different code entirely) is not surfaced",
    () => classifyBalances([OTHER_ASSET], USDC).length === 0,
  ],
  [
    "native + real USDC together produce two lines",
    () => classifyBalances([NATIVE, REAL_USDC], USDC).length === 2,
  ],
  ["no balances", () => classifyBalances([], USDC).length === 0],
  [
    "a zero balance formats as \"0\", not an empty or negative string",
    () => classifyBalances([{ ...REAL_USDC, balance: "0.0000000" }], USDC)[0].amount === "0",
  ],
  [
    "trailing zeros do not survive",
    () => classifyBalances([{ ...REAL_USDC, balance: "5.5000000" }], USDC)[0].amount === "5.5",
  ],
  [
    "a whole number stays whole",
    () => classifyBalances([{ ...REAL_USDC, balance: "12.0000000" }], USDC)[0].amount === "12",
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

console.log(`balances: ${passed}/${CHECKS.length} passed`);
if (failures.length) {
  console.error("\nFailures:\n" + failures.join("\n"));
  process.exit(1);
}
