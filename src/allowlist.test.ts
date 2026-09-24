import { describe, it, expect } from "vitest";
import { ALLOWLIST, MAG7_SYMBOLS, ETF_SYMBOLS, CASH_SYMBOLS, resolveSymbol, getAllowlistEntry } from "./allowlist";
import { XLAYER_MONITORED_TOKENS } from "../lib/wallet/xlayer";
import * as fs from "fs";
import * as path from "path";

describe("Canonical Asset Allowlist Integrity", () => {
  it("should contain exactly 14 canonical tokens (12 xStocks/ETFs + 2 cash stables)", () => {
    expect(ALLOWLIST).toHaveLength(14);
    const symbols = ALLOWLIST.map((e) => e.symbol);
    expect(symbols).toContain("AAPLx");
    expect(symbols).toContain("MSFTx");
    expect(symbols).toContain("NVDAx");
    expect(symbols).toContain("GOOGLx");
    expect(symbols).toContain("AMZNx");
    expect(symbols).toContain("METAx");
    expect(symbols).toContain("TSLAx");
    expect(symbols).toContain("COINx");
    expect(symbols).toContain("SPYx");
    expect(symbols).toContain("QQQx");
    expect(symbols).toContain("AMDx");
    expect(symbols).toContain("CRWDx");
    expect(symbols).toContain("USDG");
    expect(symbols).toContain("USDC");
  });

  it("enforces strict decimal configurations: 6 decimals for cash, 18 for xStocks", () => {
    for (const token of ALLOWLIST) {
      if (token.symbol === "USDG" || token.symbol === "USDC") {
        expect(token.decimals).toBe(6);
      } else {
        expect(token.decimals).toBe(18);
      }
    }
  });

  it("validates that all contract addresses are valid 0x EVM hex addresses", () => {
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    for (const token of ALLOWLIST) {
      expect(token.address).toMatch(evmRegex);
    }
  });

  it("ensures monitored tokens in lib/wallet/xlayer match the canonical allowlist", () => {
    expect(XLAYER_MONITORED_TOKENS).toHaveLength(ALLOWLIST.length);
    for (const token of ALLOWLIST) {
      const match = XLAYER_MONITORED_TOKENS.find((t) => t.symbol === token.symbol);
      expect(match).toBeDefined();
      expect(match?.address.toLowerCase()).toBe(token.address.toLowerCase());
      expect(match?.decimals).toBe(token.decimals);
    }
  });

  it("resolves user aliases correctly to canonical symbols", () => {
    expect(resolveSymbol("apple")).toBe("AAPLx");
    expect(resolveSymbol("AAPL")).toBe("AAPLx");
    expect(resolveSymbol("GOOG")).toBe("GOOGLx");
    expect(resolveSymbol("googx")).toBe("GOOGLx");
    expect(resolveSymbol("Alphabet")).toBe("GOOGLx");
    expect(resolveSymbol("COIN")).toBe("COINx");
    expect(resolveSymbol("coinbase")).toBe("COINx");
    expect(resolveSymbol("nvda")).toBe("NVDAx");
    expect(resolveSymbol("SPY")).toBe("SPYx");
    expect(resolveSymbol("sp500")).toBe("SPYx");
    expect(resolveSymbol("QQQ")).toBe("QQQx");
    expect(resolveSymbol("nasdaq")).toBe("QQQx");
    expect(resolveSymbol("AMD")).toBe("AMDx");
    expect(resolveSymbol("CRWD")).toBe("CRWDx");
  });

  it("prevents drift between .env.example and canonical allowlist", () => {
    const envPath = path.resolve(__dirname, "../.env.example");
    const content = fs.readFileSync(envPath, "utf-8");

    for (const token of ALLOWLIST) {
      // Check that token address appears in .env.example
      expect(content.toLowerCase()).toContain(token.address.toLowerCase());
    }
  });
});
