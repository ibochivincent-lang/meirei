/**
 * First-Class Versioned Mandate Object & Lifecycle Manager
 * Author: IboTV
 * 
 * Provides stateful mandate lifecycle (create, list, pause, edit, revoke),
 * automated risk-diff computation upon updates, and a dry-run execution mode.
 */

import { z } from "zod";
import { Mandate, Target, CashSymbol, Holding, RebalancePlan } from "../types";
import { parseMandate } from "./parse";
import { planRebalance } from "../portfolio/diff";

export const MandateStatusSchema = z.enum(["active", "paused", "revoked"]);
export type MandateStatus = z.infer<typeof MandateStatusSchema>;

export const ManagedMandateSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  walletAddress: z.string().min(42),
  name: z.string().min(1),
  targets: z.array(z.object({ symbol: z.string().min(1), weight: z.number().min(0).max(1) })),
  cashSymbol: z.enum(["USDG", "USDC"]),
  maxSingle: z.number().min(0).max(1),
  rebalanceBand: z.number().min(0).max(1),
  expiry: z.number().nonnegative(), // Unix timestamp (ms), 0 = no expiry
  status: MandateStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ManagedMandate = z.infer<typeof ManagedMandateSchema>;

export interface RiskDiff {
  changed: boolean;
  maxSingleChange?: { from: number; to: number; diffPct: number; riskIncreased: boolean };
  rebalanceBandChange?: { from: number; to: number };
  targetChanges: Array<{
    symbol: string;
    fromWeight: number;
    toWeight: number;
    diffPct: number;
  }>;
  summary: string;
}

export interface DryRunResult {
  mandateId: string;
  version: number;
  status: "dry_run";
  summaryText: string;
  plan: RebalancePlan;
  requiresSigning: false;
}

// In-memory mandate store with wallet indexing
const mandateStore = new Map<string, ManagedMandate>();

export function createManagedMandate(params: {
  walletAddress: string;
  name?: string;
  rawInput?: string;
  mandate?: Mandate;
  expiryMs?: number;
}): ManagedMandate {
  const parsed = params.mandate ?? (params.rawInput ? parseMandate(params.rawInput) : undefined);
  if (!parsed) {
    throw new Error("Must provide rawInput string or parsed Mandate object.");
  }

  const id = `mandate_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  const record: ManagedMandate = {
    id,
    version: 1,
    walletAddress: params.walletAddress.toLowerCase(),
    name: params.name || `Mandate ${new Date(now).toLocaleDateString()}`,
    targets: parsed.targets,
    cashSymbol: parsed.cashSymbol,
    maxSingle: parsed.maxSingle,
    rebalanceBand: parsed.rebalanceBand,
    expiry: params.expiryMs ? now + params.expiryMs : 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  ManagedMandateSchema.parse(record);
  mandateStore.set(id, record);
  return record;
}

export function listMandates(walletAddress: string): ManagedMandate[] {
  const addr = walletAddress.toLowerCase();
  return Array.from(mandateStore.values()).filter((m) => m.walletAddress === addr);
}

export function getMandate(id: string): ManagedMandate | undefined {
  return mandateStore.get(id);
}

export function pauseMandate(id: string): ManagedMandate {
  const m = mandateStore.get(id);
  if (!m) throw new Error(`Mandate "${id}" not found.`);
  if (m.status === "revoked") throw new Error("Cannot pause a revoked mandate.");
  m.status = "paused";
  m.updatedAt = Date.now();
  return m;
}

export function resumeMandate(id: string): ManagedMandate {
  const m = mandateStore.get(id);
  if (!m) throw new Error(`Mandate "${id}" not found.`);
  if (m.status === "revoked") throw new Error("Cannot resume a revoked mandate.");
  m.status = "active";
  m.updatedAt = Date.now();
  return m;
}

export function revokeMandate(id: string): ManagedMandate {
  const m = mandateStore.get(id);
  if (!m) throw new Error(`Mandate "${id}" not found.`);
  m.status = "revoked";
  m.updatedAt = Date.now();
  return m;
}

/**
 * Computes risk difference when a mandate is edited.
 */
export function computeRiskDiff(before: ManagedMandate, after: Mandate): RiskDiff {
  const targetChanges: RiskDiff["targetChanges"] = [];
  const allSymbols = new Set([
    ...before.targets.map((t) => t.symbol),
    ...after.targets.map((t) => t.symbol),
  ]);

  for (const sym of allSymbols) {
    const fromW = before.targets.find((t) => t.symbol === sym)?.weight ?? 0;
    const toW = after.targets.find((t) => t.symbol === sym)?.weight ?? 0;
    if (Math.abs(fromW - toW) > 1e-4) {
      targetChanges.push({
        symbol: sym,
        fromWeight: fromW,
        toWeight: toW,
        diffPct: Number(((toW - fromW) * 100).toFixed(2)),
      });
    }
  }

  const maxSingleDiff = after.maxSingle - before.maxSingle;
  const maxSingleChange =
    Math.abs(maxSingleDiff) > 1e-4
      ? {
          from: before.maxSingle,
          to: after.maxSingle,
          diffPct: Number((maxSingleDiff * 100).toFixed(2)),
          riskIncreased: maxSingleDiff > 0,
        }
      : undefined;

  const bandDiff = after.rebalanceBand - before.rebalanceBand;
  const rebalanceBandChange =
    Math.abs(bandDiff) > 1e-4
      ? { from: before.rebalanceBand, to: after.rebalanceBand }
      : undefined;

  const changed = targetChanges.length > 0 || Boolean(maxSingleChange) || Boolean(rebalanceBandChange);

  let summary = changed ? "Mandate updated." : "No risk change detected.";
  if (maxSingleChange) {
    summary += ` Max single asset limit changed from ${(maxSingleChange.from * 100).toFixed(0)}% to ${(maxSingleChange.to * 100).toFixed(0)}% (${maxSingleChange.riskIncreased ? "higher risk" : "lower risk"}).`;
  }

  return {
    changed,
    maxSingleChange,
    rebalanceBandChange,
    targetChanges,
    summary,
  };
}

/**
 * Edits an existing mandate, increments version, and returns updated mandate and risk diff.
 */
export function editMandate(
  id: string,
  updates: { rawInput?: string; mandate?: Mandate; name?: string }
): { mandate: ManagedMandate; riskDiff: RiskDiff } {
  const current = mandateStore.get(id);
  if (!current) throw new Error(`Mandate "${id}" not found.`);
  if (current.status === "revoked") throw new Error("Cannot edit a revoked mandate.");

  const newMandate = updates.mandate ?? (updates.rawInput ? parseMandate(updates.rawInput) : undefined);
  if (!newMandate) throw new Error("Must provide updated rawInput or mandate object.");

  const riskDiff = computeRiskDiff(current, newMandate);

  current.version += 1;
  current.targets = newMandate.targets;
  current.cashSymbol = newMandate.cashSymbol;
  current.maxSingle = newMandate.maxSingle;
  current.rebalanceBand = newMandate.rebalanceBand;
  if (updates.name) current.name = updates.name;
  current.updatedAt = Date.now();

  ManagedMandateSchema.parse(current);
  return { mandate: current, riskDiff };
}

/**
 * Dry run mode: simulates rebalancing against user holdings with zero broadcast and no signing prompt.
 */
export function dryRunMandate(mandate: ManagedMandate | Mandate, holdings: Holding[]): DryRunResult {
  const mandateObj: Mandate = {
    targets: mandate.targets,
    cashSymbol: mandate.cashSymbol,
    maxSingle: mandate.maxSingle,
    rebalanceBand: mandate.rebalanceBand,
  };

  const plan = planRebalance(mandateObj, holdings);
  const mandateId = "id" in mandate ? mandate.id : "transient_mandate";
  const version = "version" in mandate ? mandate.version : 1;

  let summaryText = "";
  if (plan.legs.length === 0) {
    summaryText = "Dry run: Portfolio is currently within target bands. No trades would be executed.";
  } else {
    const actions = plan.legs
      .map((l) => `${l.side.toUpperCase()} $${l.notionalUsd.toFixed(2)} USDG of ${l.symbol}`)
      .join(", ");
    summaryText = `Dry run: Would execute ${plan.legs.length} leg(s): ${actions}. Total rebalance notional: $${(plan.buyUsd + plan.sellUsd).toFixed(2)} USDG. No signatures required.`;
  }

  return {
    mandateId,
    version,
    status: "dry_run",
    summaryText,
    plan,
    requiresSigning: false,
  };
}
