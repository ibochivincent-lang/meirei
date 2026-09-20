import { describe, it, expect } from "vitest";
import {
  parseMandate,
  applyCap,
  DEFAULT_MAX_SINGLE,
  DEFAULT_MAG7_SLEEVE,
  DEFAULT_REBALANCE_BAND,
} from "./parse";
import { listTemplates, getTemplate } from "./templates";
import { MAG7_SYMBOLS, isCashSymbol } from "../allowlist";

function close(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

function weightOf(mandate: ReturnType<typeof parseMandate>, symbol: string): number {
  return mandate.targets.find((t) => t.symbol === symbol)?.weight ?? NaN;
}

describe("parseMandate — demo mandates", () => {
  it("parses the headline demo string", () => {
    const m = parseMandate("60% mag7, 20% USDG, max 8%");
    expect(m.cashSymbol).toBe("USDG");
    expect(m.maxSingle).toBeCloseTo(0.08, 9);
    // single-name cap binds: 7 x 8% + 44% cash
    for (const s of MAG7_SYMBOLS) {
      expect(weightOf(m, s)).toBeCloseTo(0.08, 9);
    }
    expect(weightOf(m, "USDG")).toBeCloseTo(0.44, 9);
    expect(m.targets.map((t) => t.weight).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it("handles equal weight with cash remainder", () => {
    const m = parseMandate("equal weight AAPLx NVDAx TSLAx, rest USDG");
    expect(weightOf(m, "AAPLx")).toBeCloseTo(weightOf(m, "NVDAx"), 9);
    expect(weightOf(m, "NVDAx")).toBeCloseTo(weightOf(m, "TSLAx"), 9);
    expect(weightOf(m, "USDG")).toBeGreaterThan(0);
    expect(m.targets.map((t) => t.weight).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it("handles free-text explicit weights", () => {
    const m = parseMandate("30% nvdax, 20% aaplx, rest cash");
    expect(weightOf(m, "NVDAx")).toBeCloseTo(0.3, 9);
    expect(weightOf(m, "AAPLx")).toBeCloseTo(0.2, 9);
    expect(weightOf(m, "USDG")).toBeCloseTo(0.5, 9);
  });

  it("supports symbol-first notation", () => {
    const m = parseMandate("AAPLx 12%, rest USDG");
    expect(weightOf(m, "AAPLx")).toBeCloseTo(0.12, 9);
  });
});

describe("parseMandate — safety", () => {
  it("rejects unknown symbols instead of returning all-cash", () => {
    expect(() => parseMandate("30% fakerx, rest usdg")).toThrow(/Unknown symbol "fakerx"/);
  });

  it("suggests the closest token for typos", () => {
    expect(() => parseMandate("30% AAPLz, rest usdg")).toThrow(/did you mean AAPLx/);
  });

  it("treats GOOGX/GOOG as the real GOOGLx", () => {
    const m = parseMandate("10% googx, rest usdg");
    expect(weightOf(m, "GOOGLx")).toBeCloseTo(0.1, 9);
  });

  it("also parses percent-word notation (no literal % needed)", () => {
    const m = parseMandate("30 percent nvdax, 20 pct aaplx, rest cash");
    expect(weightOf(m, "NVDAx")).toBeCloseTo(0.3, 9);
    expect(weightOf(m, "AAPLx")).toBeCloseTo(0.2, 9);
    expect(weightOf(m, "USDG")).toBeCloseTo(0.5, 9);
  });

  it("honours an explicit max by pushing excess to cash, never erroring", () => {
    const m = parseMandate("50% nvdax, 50% usdg, max 10%");
    expect(weightOf(m, "NVDAx")).toBeCloseTo(0.1, 9);
    expect(weightOf(m, "USDG")).toBeCloseTo(0.9, 9);
  });

  it("never lets explicit weights silently breach an explicit cap", () => {
    expect(() => parseMandate("50% nvdax, 50% usdg, max 10%")).not.toThrow();
  });

  it("rejects empty mandates", () => {
    expect(() => parseMandate("   ")).toThrow(/empty/i);
  });

  it("rejects mandates with no known symbols", () => {
    expect(() => parseMandate("rebalance my portfolio weekly")).toThrow(/allowlisted symbol/);
  });
});

describe("parseMandate — controls", () => {
  it("parses the rebalance band", () => {
    expect(parseMandate("60% mag7, band 5%").rebalanceBand).toBeCloseTo(0.05, 9);
    expect(parseMandate("60% mag7").rebalanceBand).toBeCloseTo(DEFAULT_REBALANCE_BAND, 9);
  });

  it("parses the cash symbol", () => {
    expect(parseMandate("equal weight AAPLx NVDAx, rest USDC").cashSymbol).toBe("USDC");
  });

  it("uses defaults when controls are absent", () => {
    const m = parseMandate("mag7");
    expect(m.maxSingle).toBeCloseTo(DEFAULT_MAX_SINGLE, 9);
    // 60% sleeve, 8.57% each — nothing binds, so cash keeps the 40% remainder.
    expect(weightOf(m, "USDG")).toBeCloseTo(1 - DEFAULT_MAG7_SLEEVE, 9);
  });
});

describe("applyCap", () => {
  it("caps names and absorbs the excess into cash", () => {
    const targets = [
      { symbol: "AAPLx", weight: 0.2 },
      { symbol: "USDG", weight: 0.8 },
    ];
    applyCap(targets, "USDG", 0.1);
    const total = targets.reduce((s, t) => s + t.weight, 0);
    expect(close(total, 1)).toBe(true);
    expect(targets.find((t) => t.symbol === "AAPLx")!.weight).toBeCloseTo(0.1, 9);
    expect(targets.find((t) => t.symbol === "USDG")!.weight).toBeCloseTo(0.9, 9);
  });
});

describe("templates", () => {
  it("ships the expected template names", () => {
    expect(listTemplates().sort()).toEqual(["ai", "balanced", "conservative", "mag7"]);
  });

  it("every template is a valid mandate (sums to 1, equities respect the cap)", () => {
    for (const name of listTemplates()) {
      const t = getTemplate(name)!;
      expect(t, name).toBeDefined();
      const total = t.targets.reduce((s, x) => s + x.weight, 0);
      expect(total, `${name} sum`).toBeCloseTo(1, 9);
      for (const target of t.targets) {
        if (isCashSymbol(target.symbol)) continue; // cash sleeves are cap-exempt
        expect(target.weight, `${name} ${target.symbol}`).toBeLessThanOrEqual(t.maxSingle + 1e-9);
      }
    }
  });
});