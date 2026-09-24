import { describe, it, expect } from "vitest";
import { checkSanctions } from "../../lib/security/sanctions";

describe("Chainalysis & OFAC Sanctions Screening", () => {
  it("flags known OFAC sanctioned Tornado Cash / Lazarus addresses", async () => {
    // Known OFAC SDN address
    const sanctionedAddress = "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c";
    const result = await checkSanctions(sanctionedAddress);
    expect(result.isSanctioned).toBe(true);
    expect(result.reason).toContain("OFAC");
  });

  it("permits standard clean non-sanctioned user addresses", async () => {
    const cleanAddress = "0x7f17d6224e7d48606598732c3f511412b5c1e922";
    const result = await checkSanctions(cleanAddress);
    expect(result.isSanctioned).toBe(false);
  });

  it("handles malformed or empty addresses gracefully", async () => {
    const emptyResult = await checkSanctions("");
    expect(emptyResult.isSanctioned).toBe(false);

    const invalidResult = await checkSanctions("not-an-evm-address");
    expect(invalidResult.isSanctioned).toBe(false);
  });
});
