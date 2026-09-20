import { describe, it, expect } from "vitest";
import { planRebalance, computeDiff, MIN_LEG_USD } from "./diff";
import { parseMandate } from "../mandate/parse";
import { Holding, Mandate } from "../types";

function holdingsUSDG(usd: number): Holding[] {
  return usd > 0 ? [{ symbol: "USDG", amount: usd, valueUsd: usd }] : [];
}

const demoMandate = (): Mandate => parseMandate("60% mag7, 20% USDG, max 8%");

describe("planRebalance — all-cash portfolio", () => {
  it("produces one buy leg per equity sleeve", () => {
    const plan = planRebalance(demoMandate(), holdingsUSDG(10_000));
    expect(plan.totalUsd).toBe(10_000);
    expect(plan.cashUsd).toBe(10_000);
    expect(plan.legs).toHaveLength(7);
    expect(plan.legs.every((l) => l.side === "buy" && l.from === "USDG")).toBe(true);
    const invested = plan.legs.reduce((s, l) => s + l.notionalUsd, 0);
    expect(invested).toBeCloseTo(5_600, 0); // 7 x 8% of $10k
    expect(plan.funded).toBe(true);
    expect(plan.warnings).toHaveLength(0);
  });
});

describe("planRebalance — dead band and dust", () => {
  it("emits no legs when the portfolio already matches", () => {
    const plan = planRebalance(demoMandate(), [
      { symbol: "AAPLx", amount: 0, valueUsd: 800 },
      { symbol: "MSFTx", amount: 0, valueUsd: 800 },
      { symbol: "NVDAx", amount: 0, valueUsd: 800 },
      { symbol: "GOOGLx", amount: 0, valueUsd: 800 },
      { symbol: "AMZNx", amount: 0, valueUsd: 800 },
      { symbol: "METAx", amount: 0, valueUsd: 800 },
      { symbol: "TSLAx", amount: 0, valueUsd: 800 },
      { symbol: "USDG", amount: 4400, valueUsd: 4400 },
    ]);
    expect(plan.legs).toHaveLength(0);
  });

  it("skips drift inside the rebalance band", () => {
    const plan = planRebalance(parseMandate("8% AAPLx, band 3%, rest usdg"), holdingsUSDG(10_000));
    // Only AAPLx: its 8% drift is above the 3% band, so exactly one leg.
    expect(plan.legs).toHaveLength(1);
    const aapl = plan.legs.find((l) => l.symbol === "AAPLx");
    expect(aapl).toBeDefined();
    expect(aapl!.notionalUsd).toBeCloseTo(800, 0);

    const small = planRebalance(parseMandate("50% AAPLx, 50% USDC, max 60%, band 3%"), [
      { symbol: "AAPLx", amount: 0, valueUsd: 5050 },
      { symbol: "USDC", amount: 4950, valueUsd: 4950 },
    ]);
    expect(small.legs).toHaveLength(0); // 1% drift < 3% band
  });

  it("skips dust legs", () => {
    const tiny = planRebalance(parseMandate("50% AAPLx, 50% USDC, max 60%, band 0%"), holdingsUSDG(MIN_LEG_USD / 2));
    expect(tiny.legs).toHaveLength(0);
  });
});

describe("planRebalance — sells and direction", () => {
  it("sells overweight positions into cash", () => {
    const plan = planRebalance(parseMandate("8% AAPLx, rest usdg"), [
      { symbol: "AAPLx", amount: 0, valueUsd: 9_000 },
      { symbol: "USDG", amount: 1_000, valueUsd: 1_000 },
    ]);
    const sell = plan.legs.find((l) => l.side === "sell");
    expect(sell).toBeDefined();
    expect(sell!.symbol).toBe("AAPLx");
    expect(sell!.to).toBe("USDG");
    expect(sell!.notionalUsd).toBeCloseTo(8_200, 0);
  });

  it("buys from the cash that is actually held", () => {
    const plan = planRebalance(parseMandate("8% AAPLx, rest usdc"), [
      { symbol: "USDC", amount: 10_000, valueUsd: 10_000 },
    ]);
    const buy = plan.legs.find((l) => l.symbol === "AAPLx");
    expect(buy).toBeDefined();
    expect(buy!.from).toBe("USDC");
  });
});

describe("planRebalance — funding", () => {
  it("warns when buys rely on sell proceeds rather than cash on hand", () => {
    // $10k wallet: 5% cash, one equity already at target, one overweight.
    // AAPLx must be BOUGHT from cash (no AAPLx settles into itself), and the
    // $500 of cash cannot cover the $800 ticket — so sells execute first.
    const plan = planRebalance(parseMandate("8% AAPLx, 8% NVDAx, 84% usdg"), [
      { symbol: "USDG", amount: 500, valueUsd: 500 },
      { symbol: "NVDAx", amount: 0, valueUsd: 9_500 },
    ]);
    const aapl = plan.legs.find((l) => l.symbol === "AAPLx" && l.side === "buy");
    expect(aapl).toBeDefined();
    expect(aapl!.notionalUsd).toBeCloseTo(800, 0); // not scaled down — funding comes from sells
    expect(plan.funded).toBe(true);
    expect(plan.warnings.some((w) => w.includes("sells are ordered first"))).toBe(true);
  });

  it("reports an unfunded wallet with no executable legs", () => {
    const plan = planRebalance(parseMandate("8% AAPLx, 8% NVDAx, 84% usdg"), []);
    expect(plan.funded).toBe(false);
    expect(plan.legs).toHaveLength(0);
    expect(plan.warnings.some((w) => w.includes("holds nothing"))).toBe(true);
  });

  it("exits unlisted assets into cash", () => {
    const plan = planRebalance(parseMandate("8% AAPLx, rest usdg"), [
      { symbol: "MSFTx", amount: 0, valueUsd: 5_000 },
      { symbol: "USDG", amount: 5_000, valueUsd: 5_000 },
    ]);
    const exit = plan.legs.find((l) => l.symbol === "MSFTx");
    expect(exit).toBeDefined();
    expect(exit!.side).toBe("sell");
    expect(exit!.to).toBe("USDG");
    expect(exit!.notionalUsd).toBeCloseTo(5_000, 0);
  });

  it("flags an empty wallet", () => {
    const plan = planRebalance(demoMandate(), []);
    expect(plan.legs).toHaveLength(0);
    expect(plan.totalUsd).toBe(0);
    expect(plan.warnings.some((w) => w.toLowerCase().includes("nothing"))).toBe(true);
  });
});

describe("computeDiff", () => {
  it("stays consistent with planRebalance", () => {
    const m = demoMandate();
    const h = holdingsUSDG(10_000);
    expect(computeDiff(m, h)).toEqual(planRebalance(m, h).legs);
  });
});