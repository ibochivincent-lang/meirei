import { describe, it, expect } from "vitest";
import {
  createManagedMandate,
  listMandates,
  getMandate,
  pauseMandate,
  resumeMandate,
  revokeMandate,
  editMandate,
  dryRunMandate,
} from "./object";
import { Holding } from "../types";

describe("First-Class Versioned Mandate Object Lifecycle", () => {
  const testWallet = "0x7f17d6224e7d48606598732c3f511412b5c1e922";

  it("creates an active mandate with version 1", () => {
    const mandate = createManagedMandate({
      walletAddress: testWallet,
      rawInput: "60% mag7, 40% USDG, max 10%",
      name: "Core Tech Mandate",
    });

    expect(mandate.id).toBeDefined();
    expect(mandate.version).toBe(1);
    expect(mandate.status).toBe("active");
    expect(mandate.maxSingle).toBeCloseTo(0.1, 4);
    expect(mandate.walletAddress).toBe(testWallet.toLowerCase());
  });

  it("lists and gets mandates by wallet", () => {
    const list = listMandates(testWallet);
    expect(list.length).toBeGreaterThanOrEqual(1);

    const first = list[0];
    const retrieved = getMandate(first.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(first.id);
  });

  it("pauses and resumes a mandate", () => {
    const mandate = createManagedMandate({
      walletAddress: testWallet,
      rawInput: "50% AAPLx, 50% USDG",
    });

    const paused = pauseMandate(mandate.id);
    expect(paused.status).toBe("paused");

    const resumed = resumeMandate(mandate.id);
    expect(resumed.status).toBe("active");

    const revoked = revokeMandate(mandate.id);
    expect(revoked.status).toBe("revoked");

    expect(() => pauseMandate(mandate.id)).toThrow("Cannot pause a revoked mandate.");
  });

  it("edits a mandate, increments version, and produces a risk diff", () => {
    const mandate = createManagedMandate({
      walletAddress: testWallet,
      rawInput: "60% mag7, 40% USDG, max 8%",
    });

    const { mandate: updated, riskDiff } = editMandate(mandate.id, {
      rawInput: "60% mag7, 40% USDG, max 15%",
    });

    expect(updated.version).toBe(2);
    expect(updated.maxSingle).toBeCloseTo(0.15, 4);
    expect(riskDiff.changed).toBe(true);
    expect(riskDiff.maxSingleChange).toBeDefined();
    expect(riskDiff.maxSingleChange?.riskIncreased).toBe(true);
    expect(riskDiff.summary).toContain("changed from 8% to 15%");
  });

  it("runs dry-run mode returning actions without signing", () => {
    const mandate = createManagedMandate({
      walletAddress: testWallet,
      rawInput: "50% AAPLx, 50% USDG",
    });

    const holdings: Holding[] = [{ symbol: "USDG", amount: 1000, valueUsd: 1000 }];

    const result = dryRunMandate(mandate, holdings);
    expect(result.status).toBe("dry_run");
    expect(result.requiresSigning).toBe(false);
    expect(result.plan.legs.length).toBeGreaterThan(0);
    expect(result.summaryText).toContain("Would execute");
  });
});
