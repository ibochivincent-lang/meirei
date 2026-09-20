import { getOnchainOSConfig, OnchainOSError, runCliJson } from "./onchainos";
import { resolveChain } from "./config";

/** Rules from `onchainos agent create --help`: A2A = exactly one of fee XOR subscription. */
export const MEIREI_SERVICE_NAME = "Mandate Portfolio Execution";
export const DEFAULT_ASP_FEE_USD = "5";
export const MEIREI_AGENT_DESCRIPTION =
  "Meirei turns a one-sentence investment mandate into a live xStocks plus stablecoin portfolio on X Layer (chain 196). It parses the mandate into target weights, reads wallet balances, prices every rebalance leg through the OKX DEX aggregator, and executes only after explicit confirmation.";

export type AspService = {
  serviceName: string;
  /** Newline-separated A2A structure: line 1 = capability summary (required); lines 2-3 optional. */
  serviceDescription: string;
  serviceType: "A2A";
  /** Plain number as a string (USDT implied), or "" for subscription-priced services. */
  fee: string;
  subscription?: Array<{ interval: "month"; fee: string }>;
  serviceGuide?: string;
};

export type AspCreateInput = {
  name: string;
  description: string;
  /** Required by ASP QA — upload an avatar first (`onchainos agent upload`). */
  pictureUrl: string;
  service: AspService | AspService[];
};

export function buildServiceEntry(
  options: { name?: string; fee?: string; subscription?: Array<{ interval: "month"; fee: string }>; guide?: string } = {}
): AspService {
  const fee = options.fee === undefined ? DEFAULT_ASP_FEE_USD : options.fee.trim();
  const subscription = options.subscription;

  if (fee && subscription?.length) {
    throw new OnchainOSError("A2A pricing is exclusive: pass a single-purchase fee OR a subscription, never both.");
  }
  if (!fee && !subscription?.length) {
    throw new OnchainOSError("A2A pricing requires a single-purchase fee or a non-empty subscription.");
  }
  if (fee && !/^\d+(?:\.\d{1,2})?$/.test(fee)) {
    throw new OnchainOSError(`Fee "${fee}" is not a plain number with at most 2 decimals (USDT implied).`);
  }

  const service: AspService = {
    serviceName: options.name ?? MEIREI_SERVICE_NAME,
    serviceDescription: meireiServiceDescription(),
    serviceType: "A2A",
    fee,
  };
  if (subscription?.length) service.subscription = subscription;
  if (options.guide) service.serviceGuide = options.guide;
  return service;
}

/** ASP QA: description must be <= 500 chars with no URLs and no test/env markers. */
export function assertAspDescription(description: string): string {
  const d = (description ?? "").trim();
  if (!d) throw new OnchainOSError("ASP description is required.");
  if (d.length > 500) throw new OnchainOSError(`ASP description is ${d.length} characters; the limit is 500.`);
  if (/https?:\/\/|www\./i.test(d)) throw new OnchainOSError("ASP description must not contain URLs.");
  if (/\b(test|staging|dev|local|dummy|placeholder)\b/i.test(d)) {
    throw new OnchainOSError('ASP description must not contain test/env markers like "test", "dev", "dummy".');
  }
  return d;
}

/** First-time consent + per-wallet uniqueness verdict. Read-only without --consent-key. */
export async function aspPreCheck(consentKey?: string): Promise<unknown> {
  const cfg = getOnchainOSConfig();
  const args = ["agent", "pre-check", "--role", "asp", "--chain", cfg.chain.alias];
  if (consentKey) args.push("--consent-key", consentKey);
  return runCliJson(args);
}

/** Registers Meirei as an ASP. Requires a picture (upload via `onchainos agent upload`). */
export async function aspRegister(input: AspCreateInput): Promise<unknown> {
  const cfg = getOnchainOSConfig();
  if (cfg.mock) throw new OnchainOSError("[MOCK] ASP registration is disabled in mock mode.");
  assertAspDescription(input.description);

  const services = Array.isArray(input.service) ? input.service : [input.service];
  if (!services.length) throw new OnchainOSError("ASP registration requires at least one service.");
  for (const s of services) {
    if (!s.serviceName || s.serviceName.length < 5 || s.serviceName.length > 30) {
      throw new OnchainOSError("Service name must be 5-30 characters.");
    }
    if (s.serviceType !== "A2A") throw new OnchainOSError("Only A2A services are supported by Meirei.");
  }

  return runCliJson([
    "agent", "create",
    "--name", input.name,
    "--role", "asp",
    "--description", input.description,
    "--picture", input.pictureUrl,
    "--service", JSON.stringify(services),
    "--chain", cfg.chain.alias,
  ]);
}

export async function aspActivate(agentId: string, preferredLanguage = "en-US"): Promise<unknown> {
  const cfg = getOnchainOSConfig();
  if (cfg.mock) throw new OnchainOSError("[MOCK] ASP activation is disabled in mock mode.");
  if (!agentId?.trim()) throw new OnchainOSError("ASP activation requires --agent-id.");
  return runCliJson([
    "agent", "activate",
    "--agent-id", agentId.trim(),
    "--preferred-language", preferredLanguage,
    "--chain", cfg.chain.alias,
  ]);
}

/** Lists Meirei's own agents. Read-only. */
export async function aspMyAgents(role: "asp" | "user" | "evaluator" = "asp"): Promise<unknown> {
  const cfg = getOnchainOSConfig();
  return runCliJson(["agent", "get-my-agents", "--role", role, "--chain", cfg.chain.alias]);
}

/** Lists the services of one agent. Read-only. */
export async function aspServiceList(agentId: string, page = 1, pageSize = 3): Promise<unknown> {
  const cfg = getOnchainOSConfig();
  if (!agentId?.trim()) throw new OnchainOSError("service-list requires --agent-id.");
  return runCliJson([
    "agent", "service-list",
    "--agent-id", agentId.trim(),
    "--page", String(page),
    "--page-size", String(pageSize),
    "--chain", cfg.chain.alias,
  ]);
}

function meireiServiceDescription(): string {
  // A2A shape: line 1 = capability summary (required); line 2 = user input; line 3 = delivery.
  return [
    "Executes a natural-language investment mandate as a live xStocks and stablecoin portfolio on X Layer (chain 196), for long-term self-directed investors who want 24/7 tokenized-equity rebalancing.",
    "User provides a mandate string (for example: 60 percent Mag7 xStocks, 20 percent USDG, max 8 percent single name), a wallet address on X Layer, and explicit confirmation before any swap.",
    "Returns parsed target weights, the rebalance plan with quotes, executed transaction hashes with X Layer explorer links, the final portfolio, and the fee receipt.",
  ].join("\n");
}

/** Convenience for docs/demos: the default payload Meirei would register. */
export function defaultAspRegistration(pictureUrl: string): AspCreateInput & { chain: string } {
  return {
    name: MEIREI_SERVICE_NAME,
    description: MEIREI_AGENT_DESCRIPTION,
    pictureUrl,
    service: buildServiceEntry(),
    chain: resolveChain().alias,
  };
}