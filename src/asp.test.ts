import { describe, it, expect } from "vitest";
import { buildServiceEntry, assertAspDescription, MEIREI_AGENT_DESCRIPTION } from "./asp";
import { mapErrorToStatus } from "./server/http";
import { OnchainOSError } from "./onchainos";

describe("buildServiceEntry — A2A pricing rules", () => {
  it("defaults to a single-purchase fee of 5 USDT", () => {
    const s = buildServiceEntry();
    expect(s.serviceType).toBe("A2A");
    expect(s.fee).toBe("5");
    expect(s.subscription).toBeUndefined();
  });

  it("accepts a subscription instead of a fee", () => {
    const s = buildServiceEntry({ fee: "", subscription: [{ interval: "month", fee: "10" }] });
    expect(s.fee).toBe("");
    expect(s.subscription).toEqual([{ interval: "month", fee: "10" }]);
  });

  it("rejects fee and subscription together (A2A exclusivity)", () => {
    expect(() =>
      buildServiceEntry({ fee: "5", subscription: [{ interval: "month", fee: "10" }] })
    ).toThrow(OnchainOSError);
  });

  it("rejects neither fee nor subscription", () => {
    expect(() => buildServiceEntry({ fee: "" })).toThrow(OnchainOSError);
  });

  it("rejects malformed fees (A2A allows at most 2 decimals)", () => {
    expect(() => buildServiceEntry({ fee: "abc" })).toThrow(OnchainOSError);
    expect(() => buildServiceEntry({ fee: "5.123" })).toThrow(OnchainOSError);
    expect(() => buildServiceEntry({ fee: "5.12" })).not.toThrow();
  });
});

describe("assertAspDescription — ASP QA rules", () => {
  it("accepts the Meirei description", () => {
    expect(assertAspDescription(MEIREI_AGENT_DESCRIPTION)).toBe(MEIREI_AGENT_DESCRIPTION);
    expect(MEIREI_AGENT_DESCRIPTION.length).toBeLessThanOrEqual(500);
  });

  it("rejects URLs, markers, and over-length text", () => {
    expect(() => assertAspDescription("See https://example.com for details")).toThrow(/URLs/);
    expect(() => assertAspDescription("A dev environment service")).toThrow(/test\/env markers/);
    expect(() => assertAspDescription("x".repeat(501))).toThrow(/limit is 500/);
    expect(() => assertAspDescription("   ")).toThrow(/required/);
  });
});

describe("mapErrorToStatus — HTTP error contract", () => {
  it("maps unknown symbols to 422", () => {
    expect(mapErrorToStatus(new Error('Unknown symbol "fakerx" — did you mean TSLAx?')).status).toBe(422);
  });

  it("maps Onchain OS failures to 502", () => {
    const e = new OnchainOSError("onchainos swap quote failed: timeout");
    expect(mapErrorToStatus(e).status).toBe(502);
  });

  it("maps bad mandates to 400", () => {
    expect(mapErrorToStatus(new Error("Weights must sum to 100%, got 120.00%")).status).toBe(400);
    expect(mapErrorToStatus(new Error("Request body is not valid JSON.")).status).toBe(400);
  });
});