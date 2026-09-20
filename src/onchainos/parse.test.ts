import { describe, it, expect } from "vitest";
import {
  divDecimal,
  formatAmount,
  parseBalancesResponse,
  parseQuoteResponse,
  resolveLegTokens,
  extractTxHash,
  extractJson,
  OnchainOSError,
} from "./index";
import { getAllowlistEntry } from "../allowlist";

/** Real `portfolio all-balances` payload shape (values redacted from live queries). */
const BALANCES_PAYLOAD = {
  ok: true,
  data: [
    {
      tokenAssets: [
        {
          address: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
          balance: "433472841.25327",
          chainIndex: "196",
          isRiskToken: false,
          rawBalance: "433472841253270",
          symbol: "USDG",
          tokenContractAddress: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
          tokenPrice: "1",
        },
        {
          address: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
          balance: "931979.02866559350890071",
          chainIndex: "196",
          isRiskToken: false,
          rawBalance: "931979028665593508900710",
          symbol: "OKB",
          tokenContractAddress: "",
          tokenPrice: "109.71",
        },
        {
          address: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
          balance: "2.5",
          chainIndex: "196",
          isRiskToken: true,
          rawBalance: "2500000000000000000",
          symbol: "SCAMx",
          tokenContractAddress: "0x0000000000000000000000000000000000000001",
          tokenPrice: "100",
        },
      ],
    },
  ],
};

describe("divDecimal", () => {
  it("places decimals exactly, without float division error", () => {
    expect(divDecimal("3006266808824222", 18)).toBe(0.003006266808824222);
    expect(divDecimal("433472841253270", 6)).toBe(433472841.25327);
    expect(divDecimal("1000000", 6)).toBe(1);
    expect(divDecimal("0", 18)).toBe(0);
  });
});

describe("formatAmount", () => {
  it("produces plain decimals for --readable-amount", () => {
    expect(formatAmount(8.6)).toBe("8.6");
    expect(formatAmount(8.6e-7)).toBe("0.000001");
    expect(formatAmount(0)).toBe("0");
  });
});

describe("parseBalancesResponse", () => {
  it("keeps allowlisted tokens and drops natives, risk tokens, and zero balances", () => {
    const out = parseBalancesResponse(BALANCES_PAYLOAD);
    expect(out.map((h) => h.symbol)).toEqual(["USDG"]);
    expect(out[0].amount).toBeCloseTo(433472841.25327, 4);
    expect(out[0].valueUsd).toBeCloseTo(433472841.25327, 4);
  });

  it("returns an empty list for an empty wallet", () => {
    expect(parseBalancesResponse({ ok: true, data: [] })).toEqual([]);
  });

  it("merges duplicate symbols", () => {
    const out = parseBalancesResponse({
      data: [{ tokenAssets: [asset("USDG", "1"), asset("USDG", "2")] }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(3);
    expect(out[0].valueUsd).toBe(3);
  });
});

function asset(symbol: string, balance: string) {
  return {
    address: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
    balance,
    chainIndex: "196",
    isRiskToken: false,
    rawBalance: balance.replace(".", ""),
    symbol,
    tokenContractAddress: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
    tokenPrice: "1",
  };
}

/** Real `swap quote` payload shape (values redacted from a live USDGAAPLx quote). */
const QUOTE_PAYLOAD = {
  ok: true,
  data: [
    {
      action: "ok",
      chainIndex: "196",
      dexRouterList: [
        { dexProtocol: { dexName: "Uniswap V3", percent: "100" }, fromTokenIndex: "0", toTokenIndex: "1" },
        { dexProtocol: { dexName: "xStocks wrap V2", percent: "100" }, fromTokenIndex: "1", toTokenIndex: "2" },
      ],
      estimateGasFee: "334258",
      fromTokenAmount: "1000000",
      mode: "dex",
      priceImpactPercent: "0.31",
      quoteId: "3140695645594880001",
      router: "0x4ae4...7ba4--0x943b...cc9d--0x9d27...890a",
      swapMode: "exactIn",
      toToken: { decimal: "18", tokenSymbol: "AAPLx", tokenUnitPrice: "332.635065" },
      toTokenAmount: "3006266808824222",
      tradeFee: "0.00061107863295393",
    },
  ],
};

describe("parseQuoteResponse", () => {
  it("reads impact, output, route, and index from a real quote", () => {
    const from = getAllowlistEntry("USDG")!;
    const to = getAllowlistEntry("AAPLx")!;
    const q = parseQuoteResponse(QUOTE_PAYLOAD, 2, from, to);
    expect(q.legIndex).toBe(2);
    expect(q.priceImpact).toBeCloseTo(0.0031, 6);
    expect(q.estimatedOutput).toBeCloseTo(0.003006266808824222, 12);
    expect(q.route).toContain("Uniswap V3");
    expect(q.route).toContain("xStocks wrap V2");
    expect(q.quoteId).toBe("3140695645594880001");
  });

  it("throws on empty quote data instead of inventing a quote", () => {
    const from = getAllowlistEntry("USDG")!;
    const to = getAllowlistEntry("AAPLx")!;
    expect(() => parseQuoteResponse({ ok: true, data: [] }, 0, from, to)).toThrow(OnchainOSError);
  });
});

describe("resolveLegTokens", () => {
  it("resolves both sides and rejects off-allowlist legs", () => {
    const { from, to } = resolveLegTokens({ side: "buy", symbol: "AAPLx", notionalUsd: 10, from: "USDG", to: "AAPLx" });
    expect(from.symbol).toBe("USDG");
    expect(to.symbol).toBe("AAPLx");
    expect(() =>
      resolveLegTokens({ side: "buy", symbol: "FAKE", notionalUsd: 10, from: "USDG", to: "FAKE" })
    ).toThrow(OnchainOSError);
  });
});

describe("extractTxHash", () => {
  const hash = `0x${"ab".repeat(32)}`;

  it("finds hashes in JSON payloads and transcripts", () => {
    expect(extractTxHash({ ok: true, data: { txHash: hash } })).toBe(hash);
    expect(extractTxHash(`broadcast ok: ${hash}`)).toBe(hash);
  });

  it("throws when there is no hash", () => {
    expect(() => extractTxHash({ ok: true, data: {} })).toThrow(OnchainOSError);
  });
});

describe("extractJson", () => {
  it("finds JSON inside a transcript", () => {
    const v = extractJson(`some log line\n{"ok":true,"data":[]}\ntrailing log`) as { ok: boolean };
    expect(v.ok).toBe(true);
  });
});