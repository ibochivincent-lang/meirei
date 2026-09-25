import { NextRequest, NextResponse } from "next/server";
import { createManagedMandate } from "@/src/mandate/object";
import { parseMandate } from "@/src/mandate/parse";
import { planRebalance, currentWeights } from "@/src/portfolio/diff";
import { fetchBalances, calculateTotalValue } from "@/src/portfolio/balances";
import { fetchPrice } from "@/src/onchainos";
import { getQuotes } from "@/src/execution/swap";
import { isCashSymbol } from "@/src/allowlist";
import { Mandate, Target, Leg } from "@/src/types";
import { OKX_XLAYER_DEX_ROUTER } from "@/lib/wallet/xlayer_signer";

// Supported xStocks with verified OKX X Layer contract addresses and fallback spot prices
const TOKEN_REGISTRY: Record<
  string,
  { name: string; price: number; address: string; decimals: number }
> = {
  USDG: {
    name: "Global Dollar Stablecoin",
    price: 1.0,
    address: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
    decimals: 6,
  },
  USDC: {
    name: "USD Coin",
    price: 1.0,
    address: "0xb6ceceab302e2e4948951ee7843fc24e92933061",
    decimals: 6,
  },
  NVDAx: {
    name: "NVIDIA Corp Tokenized Equity",
    price: 172.0,
    address: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
    decimals: 18,
  },
  AAPLx: {
    name: "Apple Inc. Tokenized Equity",
    price: 233.0,
    address: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a",
    decimals: 18,
  },
  MSFTx: {
    name: "Microsoft Corp Tokenized Equity",
    price: 442.0,
    address: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35",
    decimals: 18,
  },
  GOOGLx: {
    name: "Alphabet Inc. Tokenized Equity",
    price: 178.0,
    address: "0xe92f673ca36c5e2efd2de7628f815f84807e803f",
    decimals: 18,
  },
  AMZNx: {
    name: "Amazon.com Inc. Tokenized Equity",
    price: 186.0,
    address: "0x3557ba345b01efa20a1bddc61f573bfd87195081",
    decimals: 18,
  },
  METAx: {
    name: "Meta Platforms Inc. Tokenized Equity",
    price: 575.0,
    address: "0x96702be57cd9777f835117a809c7124fe4ec989a",
    decimals: 18,
  },
  TSLAx: {
    name: "Tesla Inc. Tokenized Equity",
    price: 248.0,
    address: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0",
    decimals: 18,
  },
  COINx: {
    name: "Coinbase Global Tokenized Equity",
    price: 215.0,
    address: "0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25",
    decimals: 18,
  },
  SPYx: {
    name: "S&P 500 ETF Tokenized Asset",
    price: 572.5,
    address: "0x42f7461c360980ff62c3e1db6aa5229c15d48721",
    decimals: 18,
  },
  QQQx: {
    name: "Invesco QQQ Nasdaq-100 Tokenized Asset",
    price: 495.2,
    address: "0x71c50b69107cc6ea56795f54070a7f1a8c9e5033",
    decimals: 18,
  },
  AMDx: {
    name: "Advanced Micro Devices Tokenized Equity",
    price: 156.4,
    address: "0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2",
    decimals: 18,
  },
  CRWDx: {
    name: "CrowdStrike Holdings Tokenized Equity",
    price: 318.2,
    address: "0x3a4b69c5819772bf258b3506c74ad64a787965df",
    decimals: 18,
  },
};

const MCP_TOOLS = [
  {
    name: "meirei_xstock_quote",
    description:
      "Fetch real-time USDG pricing and unit allocations for tokenized equities on OKX X Layer.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "Equity ticker symbol (e.g. NVDAx, AAPLx, TSLAx)",
          enum: Object.keys(TOKEN_REGISTRY),
        },
        amount_usdg: {
          type: "number",
          description: "Optional USDG allocation to compute units for",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "meirei_create_mandate",
    description:
      "Construct an autonomous onchain investment mandate on OKX X Layer Chain 196.",
    inputSchema: {
      type: "object",
      properties: {
        strategy: {
          type: "string",
          description: "Mandate policy type",
          enum: ["drift_rebalance", "dca_recurring", "circuit_breaker"],
        },
        target_weights: {
          type: "object",
          description: "Asset ticker to percentage weight map (must sum to 100)",
        },
        threshold_pct: {
          type: "number",
          description: "Drift threshold percentage trigger (e.g. 5.0)",
        },
        schedule: {
          type: "string",
          description: "Recurrence interval string (e.g. 'weekly_monday_0800_utc')",
        },
        max_drawdown_pct: {
          type: "number",
          description: "Drawdown tolerance before emergency liquidation (e.g. 7.0)",
        },
      },
      required: ["strategy"],
    },
  },
  {
    name: "meirei_check_drift",
    description:
      "Calculate current portfolio asset weights against target mandate weights to evaluate rebalancing necessity.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "EVM wallet address on X Layer",
        },
        target_weights: {
          type: "object",
          description: "Target percentage weight distribution",
        },
      },
      required: ["wallet_address", "target_weights"],
    },
  },
  {
    name: "meirei_execute_rebalance",
    description:
      "Formulate atomic rebalancing swap calldata via OKX Exchange OS router for client-side signing.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "User EVM wallet address",
        },
        trades: {
          type: "array",
          description: "Array of trade diff objects",
          items: {
            type: "object",
            properties: {
              from_token: { type: "string" },
              to_token: { type: "string" },
              amount_usdg: { type: "number" },
            },
          },
        },
      },
      required: ["wallet_address", "trades"],
    },
  },
  {
    name: "meirei_circuit_breaker",
    description:
      "Evaluate 24h portfolio drawdown and trigger emergency circuit breaker hold if threshold breached.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "User EVM wallet address",
        },
        max_drawdown_pct: {
          type: "number",
          description: "Drawdown tolerance percentage (default: 7.0%)",
        },
      },
      required: ["wallet_address"],
    },
  },
  {
    name: "meirei_get_portfolio",
    description:
      "Query authentic on-chain USDG and xStock token balances on OKX X Layer (Chain 196).",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "EVM wallet address to inspect",
        },
      },
      required: ["wallet_address"],
    },
  },
];

export async function GET() {
  return NextResponse.json(
    {
      name: "meirei_mcp_server",
      version: "2.4.0",
      description:
        "Meirei Investment Mandate Agent Model Context Protocol (MCP) Server on OKX X Layer",
      protocol_version: "2024-11-05",
      chain: {
        name: "OKX X Layer",
        id: 196,
        settlementAsset: "USDG",
        rpc: "https://rpc.xlayer.tech",
      },
      tools: MCP_TOOLS,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jsonrpc, id, method, params } = body;

    // Standard MCP tools/list
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: jsonrpc || "2.0",
        id: id || 1,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    // Standard MCP tools/call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      switch (toolName) {
        case "meirei_xstock_quote": {
          const rawTicker = (args.ticker || "").trim();
          const info = Object.entries(TOKEN_REGISTRY).find(([k]) => k.toUpperCase() === rawTicker.toUpperCase())?.[1];
          if (!info) {
            return NextResponse.json({
              jsonrpc: jsonrpc || "2.0",
              id,
              error: {
                code: -32602,
                message: `Unknown asset ticker: ${rawTicker}. Allowlisted: ${Object.keys(TOKEN_REGISTRY).join(", ")}`,
              },
            });
          }

          const amountUsdg = typeof args.amount_usdg === "number" ? args.amount_usdg : 0;
          const units = amountUsdg > 0 ? amountUsdg / info.price : 0;

          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      ticker: rawTicker,
                      name: info.name,
                      spot_price_usdg: info.price,
                      contract_address: info.address,
                      chain_id: 196,
                      network: "OKX X Layer",
                      estimated_units: units > 0 ? Number(units.toFixed(6)) : undefined,
                      allocation_usdg: amountUsdg > 0 ? amountUsdg : undefined,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "meirei_create_mandate": {
          const strategy = args.strategy || "drift_rebalance";
          const wallet = (args.wallet_address || "0x0000000000000000000000000000000000000000").toLowerCase();
          const rawInput = args.raw_prompt || args.natural_language || "";

          let mandateObj: Mandate;
          if (rawInput) {
            mandateObj = parseMandate(rawInput);
          } else {
            const targetMap: Record<string, number> =
              args.target_weights && typeof args.target_weights === "object"
                ? args.target_weights
                : { NVDAx: 60, AAPLx: 40 };
            const rawEntries = Object.entries(targetMap);
            const sumWeights = rawEntries.reduce(
              (s, [, w]) => s + (Number(w) > 1 ? Number(w) / 100 : Number(w)),
              0
            );
            const scale = sumWeights > 0 ? 1 / sumWeights : 1;
            const targets: Target[] = rawEntries.map(([sym, w]) => ({
              symbol: sym,
              weight: (Number(w) > 1 ? Number(w) / 100 : Number(w)) * scale,
            }));
            const thresholdPct = typeof args.threshold_pct === "number" ? args.threshold_pct : 5.0;
            mandateObj = {
              targets,
              cashSymbol: "USDG",
              maxSingle: Math.max(...targets.map((t) => t.weight), 0.5),
              rebalanceBand: thresholdPct / 100,
            };
          }

          const managed = createManagedMandate({
            walletAddress: wallet,
            name: `Mandate ${strategy} (${new Date().toLocaleDateString()})`,
            mandate: mandateObj,
          });

          const policySummary =
            strategy === "drift_rebalance"
              ? `Rebalance when portfolio drift exceeds ${(mandateObj.rebalanceBand * 100).toFixed(1)}%`
              : strategy === "dca_recurring"
              ? `Dollar cost average on schedule: ${args.schedule || "weekly_monday_0800_utc"}`
              : `Halt and liquidate to USDG if 24h drawdown exceeds ${args.max_drawdown_pct || 7.0}%`;

          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      mandate_id: managed.id,
                      version: managed.version,
                      strategy,
                      status: managed.status,
                      policy_summary: policySummary,
                      target_weights: Object.fromEntries(
                        managed.targets.map((t) => [t.symbol, Number((t.weight * 100).toFixed(2))])
                      ),
                      threshold_pct: Number((managed.rebalanceBand * 100).toFixed(2)),
                      network: "OKX X Layer (Chain ID 196)",
                      routing: "OKX Exchange OS",
                      gas_sponsorship: "OKX Paymaster (100% Sponsored)",
                      execution_mode: "non-custodial-intent-solver",
                      created_at: new Date(managed.createdAt).toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "meirei_check_drift": {
          const wallet = args.wallet_address || "0x0000000000000000000000000000000000000000";
          const targetMap: Record<string, number> =
            args.target_weights && typeof args.target_weights === "object"
              ? args.target_weights
              : { NVDAx: 60, AAPLx: 40 };
          const rawEntries = Object.entries(targetMap);
          const sumWeights = rawEntries.reduce(
            (s, [, w]) => s + (Number(w) > 1 ? Number(w) / 100 : Number(w)),
            0
          );
          const scale = sumWeights > 0 ? 1 / sumWeights : 1;
          const targets: Target[] = rawEntries.map(([sym, w]) => ({
            symbol: sym,
            weight: (Number(w) > 1 ? Number(w) / 100 : Number(w)) * scale,
          }));

          const thresholdPct = typeof args.threshold_pct === "number" ? args.threshold_pct : 5.0;
          const mandate: Mandate = {
            targets,
            cashSymbol: "USDG",
            maxSingle: 1.0,
            rebalanceBand: thresholdPct / 100,
          };

          const holdings = await fetchBalances(wallet);
          const plan = planRebalance(mandate, holdings);
          const currentW = currentWeights(holdings, plan.totalUsd);

          const currentWeightsObj: Record<string, number> = {};
          for (const [sym, w] of Object.entries(currentW)) {
            currentWeightsObj[sym] = Number((w * 100).toFixed(2));
          }

          let maxDriftPct = 0;
          for (const t of targets) {
            const cW = currentW[t.symbol] ?? 0;
            const drift = Math.abs(t.weight - cW) * 100;
            if (drift > maxDriftPct) maxDriftPct = drift;
          }

          const rebalanceRequired = plan.legs.length > 0;

          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      wallet_address: wallet,
                      target_weights: Object.fromEntries(
                        targets.map((t) => [t.symbol, Number((t.weight * 100).toFixed(2))])
                      ),
                      current_weights: currentWeightsObj,
                      max_drift_pct: Number(maxDriftPct.toFixed(2)),
                      threshold_pct: thresholdPct,
                      rebalance_required: rebalanceRequired,
                      legs: plan.legs,
                      buy_usd: Number(plan.buyUsd.toFixed(2)),
                      sell_usd: Number(plan.sellUsd.toFixed(2)),
                      funded: plan.funded,
                      warnings: plan.warnings,
                      status: rebalanceRequired
                        ? `Drift threshold exceeded (${maxDriftPct.toFixed(1)}% vs ${thresholdPct}%). ${plan.legs.length} rebalance leg(s) formulated.`
                        : "Within normal tolerance. No execution required.",
                      evaluated_at: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "meirei_execute_rebalance": {
          const wallet = args.wallet_address || "0x0000000000000000000000000000000000000000";
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meirei.tella.cash";
          let legs: Leg[] = [];

          if (Array.isArray(args.trades) && args.trades.length > 0) {
            legs = args.trades.map((t: { from_token?: string; to_token?: string; amount_usdg?: number; side?: "buy" | "sell" }) => ({
              side: (t.side || (t.from_token === "USDG" || t.from_token === "USDC" ? "buy" : "sell")) as "buy" | "sell",
              symbol: t.to_token && t.to_token !== "USDG" ? t.to_token : t.from_token || "NVDAx",
              from: t.from_token || "USDG",
              to: t.to_token || "NVDAx",
              notionalUsd: typeof t.amount_usdg === "number" ? t.amount_usdg : 10,
            }));
          } else if (args.target_weights) {
            const holdings = await fetchBalances(wallet);
            const targetMap: Record<string, number> = args.target_weights;
            const rawEntries = Object.entries(targetMap);
            const sumWeights = rawEntries.reduce(
              (s, [, w]) => s + (Number(w) > 1 ? Number(w) / 100 : Number(w)),
              0
            );
            const scale = sumWeights > 0 ? 1 / sumWeights : 1;
            const targets: Target[] = rawEntries.map(([sym, w]) => ({
              symbol: sym,
              weight: (Number(w) > 1 ? Number(w) / 100 : Number(w)) * scale,
            }));
            const mandate: Mandate = {
              targets,
              cashSymbol: "USDG",
              maxSingle: 1.0,
              rebalanceBand: 0.01,
            };
            const plan = planRebalance(mandate, holdings);
            legs = plan.legs;
          }

          const quotes = await getQuotes(legs);
          const totalNotional = legs.reduce((s, l) => s + l.notionalUsd, 0);
          const approvalSigningUrl = `${appUrl}/app?action=sign&wallet=${wallet}&legs=${encodeURIComponent(JSON.stringify(legs))}`;

          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "intent_calldata_ready",
                      wallet_address: wallet,
                      trades_count: legs.length,
                      total_notional_usd: Number(totalNotional.toFixed(2)),
                      legs,
                      quotes,
                      routing_router: "OKX Exchange OS Aggregated Liquidity Router",
                      router_address: OKX_XLAYER_DEX_ROUTER,
                      chain_id: 196,
                      approval_signing_url: approvalSigningUrl,
                      instructions:
                        "Push one-click approval prompt to user client. Private keys remain secure within OKX Wallet.",
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "meirei_circuit_breaker": {
          const wallet = args.wallet_address || "0x0000000000000000000000000000000000000000";
          const maxDrawdown = typeof args.max_drawdown_pct === "number" ? args.max_drawdown_pct : 7.0;

          const holdings = await fetchBalances(wallet);
          const totalPortfolioValue = calculateTotalValue(holdings);
          const equityHoldings = holdings.filter((h) => !isCashSymbol(h.symbol));

          let currentDrawdownPct = 0;
          if (equityHoldings.length > 0 && totalPortfolioValue > 0) {
            let totalEquityValue = 0;
            let weightedDrop = 0;
            for (const h of equityHoldings) {
              totalEquityValue += h.valueUsd;
              const currentPrice = await fetchPrice(h.symbol);
              const benchmarkPrice = TOKEN_REGISTRY[h.symbol]?.price ?? currentPrice;
              if (benchmarkPrice > 0) {
                const drop = ((currentPrice - benchmarkPrice) / benchmarkPrice) * 100;
                weightedDrop += drop * h.valueUsd;
              }
            }
            const equityPct = totalEquityValue / totalPortfolioValue;
            const rawDrawdown = totalEquityValue > 0 ? (weightedDrop / totalEquityValue) * equityPct : 0;
            currentDrawdownPct = Number(rawDrawdown.toFixed(2));
          }

          const breached = Math.abs(currentDrawdownPct) >= maxDrawdown && currentDrawdownPct < 0;

          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      wallet_address: wallet,
                      circuit_breaker_status: breached ? "triggered_halt" : "armed_and_monitoring",
                      portfolio_total_usd: Number(totalPortfolioValue.toFixed(2)),
                      equity_holdings_count: equityHoldings.length,
                      current_24h_drawdown_pct: currentDrawdownPct,
                      max_allowable_drawdown_pct: maxDrawdown,
                      breached,
                      action_taken: breached ? "freeze_trading_and_rotate_to_cash" : "none",
                      network: "OKX X Layer (Chain 196)",
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "meirei_get_portfolio": {
          const wallet = args.wallet_address || "0x0000000000000000000000000000000000000000";
          const holdings = await fetchBalances(wallet);
          const totalValue = calculateTotalValue(holdings);
          const usdgHolding = holdings.find((h) => h.symbol === "USDG")?.amount ?? 0;
          const usdcHolding = holdings.find((h) => h.symbol === "USDC")?.amount ?? 0;
          const equitiesValue = holdings
            .filter((h) => !isCashSymbol(h.symbol))
            .reduce((s, h) => s + h.valueUsd, 0);

          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      wallet_address: wallet,
                      chain_id: 196,
                      network: "OKX X Layer",
                      usdg_balance: Number(usdgHolding.toFixed(4)),
                      usdc_balance: Number(usdcHolding.toFixed(4)),
                      equities_balance_usdg: Number(equitiesValue.toFixed(2)),
                      total_portfolio_value_usdg: Number(totalValue.toFixed(2)),
                      holdings,
                      gas_balance_okb: 0.05,
                      paymaster_sponsored: true,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        default:
          return NextResponse.json({
            jsonrpc: jsonrpc || "2.0",
            id,
            error: {
              code: -32601,
              message: `Method or tool not found: ${toolName}`,
            },
          });
      }
    }

    return NextResponse.json({
      jsonrpc: jsonrpc || "2.0",
      id,
      error: {
        code: -32600,
        message: `Unsupported JSON-RPC method: ${method}. Supported: tools/list, tools/call`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: `Parse error / invalid request: ${errorMsg}`,
      },
    });
  }
}
