import { NextResponse } from "next/server";

export interface NewsCatalyst {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  category: string;
  impact: "Bullish" | "Bearish" | "Volatility Alert";
  timestamp: string;
  summary: string;
  marketEffectAnalysis: string;
  suggestedAction: {
    label: string;
    tradePrompt: string;
  };
}

const LIVE_CATALYSTS: NewsCatalyst[] = [
  {
    id: "cat_1",
    ticker: "NVDAx",
    companyName: "NVIDIA Corp.",
    headline: "Blackwell Architecture Production Ramps Faster Than Forecast Amid Record Hyperscaler Capex",
    category: "AI Infrastructure",
    impact: "Bullish",
    timestamp: "14m ago",
    summary: "Cloud service providers announce expanded multi-billion dollar capital expenditure budgets for next-generation B200 GPU clusters, driving forward orders into 2027.",
    marketEffectAnalysis: "Strong spot demand catalyst on X Layer. Expect tightened bid-ask spreads and upward rebalance pressure across high-beta tech sleeves. The Meirei momentum advisor signals overweight accumulation.",
    suggestedAction: {
      label: "Accumulate NVDAx",
      tradePrompt: "Buy 250 USDG of NVDAx",
    },
  },
  {
    id: "cat_2",
    ticker: "AAPLx",
    companyName: "Apple Inc.",
    headline: "Apple Intelligence Global Rollout Drives Upgrade Supercycle in Asian & European Supply Chains",
    category: "Product Cycle",
    impact: "Bullish",
    timestamp: "42m ago",
    summary: "Component suppliers report 15% upward revisions in device build targets as enterprise and retail demand for on-device neural processing accelerators spikes.",
    marketEffectAnalysis: "Lowers downside volatility for AAPLx. The asset serves as an ideal anchor for long-term defensive growth mandates on X Layer with minimal price impact across DEX pools.",
    suggestedAction: {
      label: "Add to Core AAPLx",
      tradePrompt: "Buy 200 USDG of AAPLx",
    },
  },
  {
    id: "cat_3",
    ticker: "TSLAx",
    companyName: "Tesla Inc.",
    headline: "Full Self-Driving Regulatory Filings Submitted Across Major Metropolitan Corridors",
    category: "Autonomous Mobility",
    impact: "Volatility Alert",
    timestamp: "1h ago",
    summary: "Autonomous testing permits advance in key jurisdictions while energy storage Megapack deployments reach new record quarterly capacity milestones.",
    marketEffectAnalysis: "Elevated short-term intraday volatility. Ideal for tactical swing mandates. Rebalance band triggers may fire frequently as price action tests resistance levels on X Layer.",
    suggestedAction: {
      label: "Trade TSLAx Swing",
      tradePrompt: "35% TSLAx, 25% NVDAx, 40% USDG, max 35%, band 2%",
    },
  },
  {
    id: "cat_4",
    ticker: "MSFTx",
    companyName: "Microsoft Corp.",
    headline: "Azure Cloud Infrastructure Revenues Accelerate as Enterprise Generative Workloads Double",
    category: "Enterprise Software",
    impact: "Bullish",
    timestamp: "2h ago",
    summary: "Commercial cloud bookings expand at a 28% annualized clip with 85% of Fortune 500 enterprises adopting multi-tenant AI copilot integrations.",
    marketEffectAnalysis: "Solidifies MSFTx as a foundational holding in Magnificent 7 mandates. Favorable liquidity and institutional backing reduce rebalance slippage on OKX DEX.",
    suggestedAction: {
      label: "Allocate to MSFTx",
      tradePrompt: "Buy 300 USDG of MSFTx",
    },
  },
  {
    id: "cat_5",
    ticker: "USDG",
    companyName: "Global Dollar (USDG)",
    headline: "Federal Reserve Holds Rates Steady While Liquidity Pools on X Layer Expand",
    category: "Monetary Policy & Macro",
    impact: "Bullish",
    timestamp: "3h ago",
    summary: "Central bank signals stable benchmark interest rates, providing macro stability across digital dollar stablecoins and encouraging risk-on equity mandate deployments.",
    marketEffectAnalysis: "Zero price drift against the dollar. Increases purchasing power and lowers borrowing costs across Layer 2 protocols. Optimal moment to deploy idle USDG reserves into tech mandates.",
    suggestedAction: {
      label: "Deploy Mag7 Mandate",
      tradePrompt: "70% mag7, 30% USDG, max 15%, band 3%",
    },
  },
  {
    id: "cat_6",
    ticker: "METAx",
    companyName: "Meta Platforms Inc.",
    headline: "Llama AI Model Family Reaches 650 Million Downloads; Ad Revenue Conversion Soars",
    category: "Digital Advertising & AI",
    impact: "Bullish",
    timestamp: "4h ago",
    summary: "Open source foundation model adoption directly feeds automated ad targeting algorithms, boosting click-through yields and quarterly operating margins.",
    marketEffectAnalysis: "High cash-flow generation protects against broader market corrections. Algorithmic advisors recommend pairing METAx with high-growth semiconductor names for balanced momentum.",
    suggestedAction: {
      label: "Position in METAx",
      tradePrompt: "Buy 150 USDG of METAx",
    },
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    feed: "OKX Global Market Intelligence · X Layer Onchain Anchor",
    updatedAt: new Date().toISOString(),
    catalysts: LIVE_CATALYSTS,
  });
}
