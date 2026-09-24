/**
 * Mathematical Invariants and Property-Based Tests
 * Author: IboTV
 * 
 * Verifies core financial engine properties:
 * 1. Mandate target weights always sum to 1.0 (100%).
 * 2. No equity target exceeds the maxSingle cap.
 * 3. Total sells cover total buys within tolerance (conservation of portfolio funds).
 * 4. Rebalancing an already-balanced portfolio yields zero legs.
 * 5. Decimal scaling: 6 decimals (USDG/USDC) vs 18 decimals (xStocks) avoids 10^12 distortion.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseMandate, applyCap } from "../mandate/parse";
import { planRebalance } from "./diff";
import { divDecimal } from "../onchainos";
import { parseHexAmount } from "../../lib/wallet/xlayer";
import { Mandate, Holding, Target } from "../types";
import { ALLOWLIST, MAG7_SYMBOLS } from "../allowlist";

describe("Mathematical Invariants and Property-Based Engine Verification", () => {
  it("Invariant 1: parseMandate weights always sum to 1.0 (100%)", () => {
    // Test known standard inputs and randomized weight inputs
    const testCases = [
      "60% mag7, 40% USDG",
      "50% mag7, 50% USDC",
      "25% AAPLx, 25% MSFTx, 25% NVDAx, 25% USDG",
      "10% AAPLx, 20% MSFTx, 30% NVDAx, rest USDG",
      "equal weight AAPLx NVDAx TSLAx, rest USDG",
      "80% mag7, 20% USDG, max 10%",
      "33% AAPLx, 33% MSFTx, 34% USDG",
    ];

    for (const text of testCases) {
      const mandate = parseMandate(text);
      const sum = mandate.targets.reduce((acc, t) => acc + t.weight, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(1e-6);
    }

    // Property-based verification with fast-check
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 90 }),
        fc.integer({ min: 1, max: 90 }),
        (w1, w2) => {
          const clampedW1 = Math.min(w1, 45);
          const clampedW2 = Math.min(w2, 45);
          const input = `${clampedW1}% AAPLx, ${clampedW2}% NVDAx, rest USDG`;
          const mandate = parseMandate(input);
          const sum = mandate.targets.reduce((acc, t) => acc + t.weight, 0);
          expect(Math.abs(sum - 1.0)).toBeLessThan(1e-6);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Invariant 2: No equity target exceeds the maxSingle cap", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 50 }),
        (capPercent) => {
          const cap = capPercent / 100;
          const mandate = parseMandate(`60% mag7, 40% USDG, max ${capPercent}%`);
          expect(mandate.maxSingle).toBeCloseTo(cap, 5);

          for (const target of mandate.targets) {
            if (target.symbol !== mandate.cashSymbol) {
              expect(target.weight).toBeLessThanOrEqual(mandate.maxSingle + 1e-6);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it("Invariant 3: Rebalancing an already-balanced portfolio yields exactly zero legs", () => {
    const mandate = parseMandate("40% AAPLx, 40% NVDAx, 20% USDG");
    const totalUsd = 10000;

    // Construct holdings that match target weights exactly
    const holdings: Holding[] = [
      { symbol: "AAPLx", amount: 10, valueUsd: 4000 },
      { symbol: "NVDAx", amount: 20, valueUsd: 4000 },
      { symbol: "USDG", amount: 2000, valueUsd: 2000 },
    ];

    const plan = planRebalance(mandate, holdings);
    expect(plan.legs).toHaveLength(0);
    expect(plan.buyUsd).toBe(0);
    expect(plan.sellUsd).toBe(0);
  });

  it("Invariant 4: Total sells and available cash cover total buys (conservation of capital)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50000 }),
        fc.integer({ min: 10, max: 90 }),
        (portfolioTotal, aaplWeight) => {
          const mandate = parseMandate("50% AAPLx, 50% USDG");
          const currentAapl = (portfolioTotal * aaplWeight) / 100;
          const currentCash = portfolioTotal - currentAapl;

          const holdings: Holding[] = [
            { symbol: "AAPLx", amount: currentAapl / 200, valueUsd: currentAapl },
            { symbol: "USDG", amount: currentCash, valueUsd: currentCash },
          ];

          const plan = planRebalance(mandate, holdings);

          // If buy legs exist, buyUsd cannot exceed (cashUsd + sellUsd + tolerance)
          if (plan.buyUsd > 0) {
            expect(plan.buyUsd).toBeLessThanOrEqual(plan.cashUsd + plan.sellUsd + 1.0);
          }

          // Total notional rebalanced is bounded
          expect(plan.buyUsd).toBeGreaterThanOrEqual(0);
          expect(plan.sellUsd).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Invariant 5: Decimal scaling precision prevents 10^12 off-by-scale distortion", () => {
    // USDG has 6 decimals: 1 USDG = 1,000,000 base units
    const oneUsdgRaw = "1000000";
    expect(divDecimal(oneUsdgRaw, 6)).toBe(1.0);

    // NVDAx has 18 decimals: 1 NVDAx = 1,000,000,000,000,000,000 base units
    const oneNvdaxRaw = "1000000000000000000";
    expect(divDecimal(oneNvdaxRaw, 18)).toBe(1.0);

    // If 1 USDG was mistakenly parsed with 18 decimals, it would be 10^-12 (erroneous micro-fraction)
    expect(divDecimal(oneUsdgRaw, 18)).toBe(0.000000000001);
    expect(divDecimal(oneUsdgRaw, 18)).not.toBe(1.0);

    // If 1 NVDAx was mistakenly parsed with 6 decimals, it would be 10^12 (erroneous trillions)
    expect(divDecimal(oneNvdaxRaw, 6)).toBe(1000000000000);
    expect(divDecimal(oneNvdaxRaw, 6)).not.toBe(1.0);

    // Test parseHexAmount with 6 and 18 decimals
    const hexOneUsdg = "0x" + BigInt(1000000).toString(16);
    expect(parseHexAmount(hexOneUsdg, 6)).toBe(1.0);

    const hexOneEquities = "0x" + BigInt("1000000000000000000").toString(16);
    expect(parseHexAmount(hexOneEquities, 18)).toBe(1.0);
  });
});
