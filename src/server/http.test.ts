import { describe, it, expect, beforeAll } from "vitest";
import { handleChat } from "./http";
import { initOnchainOS } from "../onchainos";

describe("HTTP Chat and Stocks Handler", () => {
  beforeAll(() => {
    initOnchainOS({ mock: true });
  });

  it("handles stocks inquiry and returns available xStocks list", async () => {
    const res = await handleChat({ message: "What stocks can I trade?" }, "*");
    expect(res.type).toBe("stocks_list");
    expect(typeof res.message).toBe("string");
    expect(res.message).toContain("AAPLx");
    expect(res.message).toContain("NVDAx");
    expect(res.message).toContain("USDG");
    expect(Array.isArray(res.stocks)).toBe(true);
  });

  it("handles template recommendations", async () => {
    const res = await handleChat({ message: "Show me templates or strategies" }, "*");
    expect(res.type).toBe("templates_list");
    expect(res.message).toContain("mag7");
    expect(res.message).toContain("ai");
  });

  it("handles specific stock price inquiries", async () => {
    const res = await handleChat({ message: "How much is AAPLx right now?" }, "*");
    expect(res.type).toBe("price_quote");
    expect(res.symbol).toBe("AAPLx");
    expect(typeof res.priceUsd).toBe("number");
  });

  it("parses valid investment mandate in chat", async () => {
    const res = await handleChat({ message: "60% mag7, 20% USDG, max 8%" }, "*");
    expect(res.type).toBe("mandate_parsed");
    expect(res.mandate).toBeDefined();
  });
});
