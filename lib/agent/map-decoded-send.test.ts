/**
 * mapDecodedSend tests. Runner-free — run with `pnpm test`. Exits non-zero
 * on any failure.
 */

import { mapDecodedSend } from "./map-decoded-send";
import type { DecodedIntent } from "@/lib/sendam-ai/client";

const base: DecodedIntent = { intent: "SEND", amount: null, asset: null, recipient: null, confidence: 0.9 };

const VALID_ADDRESS = "GDJBUPILZLX6VWTSG7SCUT4EDUW4OYQ54W2PRWSL2HJKRAKDIQ3LIXAS";
// One character flipped near the end — StrKey's checksum makes this invalid
// without it "looking" obviously wrong, unlike a random string.
const BAD_CHECKSUM_ADDRESS = "GDJBUPILZLX6VWTSG7SCUT4EDUW4OYQ54W2PRWSL2HJKRAKDIQ3LIXAA";

const CASES: Array<[DecodedIntent, unknown]> = [
  [
    { ...base, amount: "5", recipient: VALID_ADDRESS },
    { amount: "5", token: "USDC", recipient: { kind: "address", address: VALID_ADDRESS } },
  ],
  [
    // isStellarAddress validates StrKey's CRC16 checksum (existing behavior
    // in lib/utils/phone.ts, unrelated to this mapping) — a string that is
    // the right SHAPE but fails that checksum falls through to the label
    // branch rather than being recognized as an address.
    { ...base, amount: "5", recipient: BAD_CHECKSUM_ADDRESS },
    { amount: "5", token: "USDC", recipient: { kind: "label", label: BAD_CHECKSUM_ADDRESS } },
  ],
  [
    { ...base, amount: "5", recipient: "+2348012345678" },
    { amount: "5", token: "USDC", recipient: { kind: "phone", whatsappNumber: "whatsapp:+2348012345678" } },
  ],
  [
    { ...base, amount: "5", recipient: "Chidi" },
    { amount: "5", token: "USDC", recipient: { kind: "label", label: "Chidi" } },
  ],
  [
    // Phone-shaped but not a valid number: reported as a bad number rather
    // than falling into the beneficiary-label branch, which used to send the
    // user off to check their saved contacts for a mistyped number.
    { ...base, amount: "5", recipient: "+234801" },
    { amount: "5", token: "USDC", recipient: { kind: "invalid_phone", typed: "+234801" } },
  ],
  [
    { ...base, amount: "5", recipient: "0803 123" },
    { amount: "5", token: "USDC", recipient: { kind: "invalid_phone", typed: "0803 123" } },
  ],
  [
    // Still a label: it has letters, so it was never a number attempt.
    { ...base, amount: "5", recipient: "Chidi 2" },
    { amount: "5", token: "USDC", recipient: { kind: "label", label: "Chidi 2" } },
  ],
  [{ ...base, amount: null, recipient: "Chidi" }, null],
  [{ ...base, amount: "0", recipient: "Chidi" }, null],
  [{ ...base, amount: "-5", recipient: "Chidi" }, null],
  [{ ...base, amount: "abc", recipient: "Chidi" }, null],
  [{ ...base, amount: "5", recipient: null }, null],
  [{ ...base, amount: "5", recipient: "   " }, null],
  [{ ...base, intent: "BALANCE", amount: "5", recipient: "Chidi" }, null],
  [{ ...base, intent: "UNKNOWN" }, null],
];

let passed = 0;
const failures: string[] = [];

for (const [input, expected] of CASES) {
  const got = mapDecodedSend(input);
  if (JSON.stringify(got) === JSON.stringify(expected)) {
    passed++;
  } else {
    failures.push(
      `  ✗ mapDecodedSend(${JSON.stringify(input)}) -> ${JSON.stringify(got)} (expected ${JSON.stringify(expected)})`,
    );
  }
}

console.log(`map-decoded-send: ${passed}/${CASES.length} passed`);
if (failures.length) {
  console.error("\nFailures:\n" + failures.join("\n"));
  process.exit(1);
}
