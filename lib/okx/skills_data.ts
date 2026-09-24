/**
 * OKX AI Skill Integration Telemetry Data
 * Powers Meirei Advanced Mode using:
 *  1. okx-sentiment-tracker
 *  2. okx-cex-smartmoney
 *  3. okx-cex-market
 */

export interface SentimentTrackerData {
  overallScore: number; // 0 - 100
  label: "Extreme Fear" | "Neutral" | "Bullish Accumulation" | "Alpha Surge";
  socialVolume24h: string;
  institutionalRatio: number; // percentage
  assetScores: Record<string, { score: number; verdict: "Bullish" | "Neutral" | "Cautious" }>;
}

export interface SmartMoneyData {
  netInflow24h: string;
  whaleAccumulationTier: string;
  topTraderLongRatio: number; // e.g. 68.4%
  signalDivergence: "Bullish Divergence" | "Consolidating" | "Overbought";
  assetSmartFlow: Record<string, { netFlow: string; flowType: "Inflow" | "Outflow" | "Neutral"; tier: string }>;
}

export interface CexMarketData {
  marketStatus: "Optimal Execution" | "Volatile" | "Low Spread";
  avgSpreadBps: number;
  volatilityIndex: string;
  liquidityDepthUsd: string;
  assetMetrics: Record<string, { volume24h: string; beta: number; spread: string; momentumRank: number }>;
}

export const OKX_SENTIMENT_DATA: SentimentTrackerData = {
  overallScore: 82,
  label: "Bullish Accumulation",
  socialVolume24h: "48.2K mentions",
  institutionalRatio: 74.5,
  assetScores: {
    NVDAx: { score: 88, verdict: "Bullish" },
    AAPLx: { score: 76, verdict: "Bullish" },
    MSFTx: { score: 82, verdict: "Bullish" },
    TSLAx: { score: 69, verdict: "Neutral" },
    GOOGLx: { score: 79, verdict: "Bullish" },
    AMZNx: { score: 81, verdict: "Bullish" },
    METAx: { score: 84, verdict: "Bullish" },
    COINx: { score: 73, verdict: "Neutral" },
    TSMx: { score: 86, verdict: "Bullish" },
    AVGOx: { score: 83, verdict: "Bullish" },
    AMDx: { score: 77, verdict: "Bullish" },
    INTCx: { score: 58, verdict: "Cautious" },
    MUx: { score: 75, verdict: "Bullish" },
    MRVLx: { score: 78, verdict: "Bullish" },
    CRWDx: { score: 72, verdict: "Neutral" },
    MSTRx: { score: 80, verdict: "Bullish" },
    DELLx: { score: 74, verdict: "Bullish" },
    SPYx: { score: 71, verdict: "Neutral" },
    QQQx: { score: 79, verdict: "Bullish" },
    IWMx: { score: 66, verdict: "Neutral" },
  },
};

export const OKX_SMART_MONEY_DATA: SmartMoneyData = {
  netInflow24h: "+$5.84M USDG",
  whaleAccumulationTier: "Tier-1 Whales Active",
  topTraderLongRatio: 71.8,
  signalDivergence: "Bullish Divergence",
  assetSmartFlow: {
    NVDAx: { netFlow: "+$1.92M", flowType: "Inflow", tier: "High Conviction" },
    AAPLx: { netFlow: "+$1.15M", flowType: "Inflow", tier: "Accumulation" },
    MSFTx: { netFlow: "+$840K", flowType: "Inflow", tier: "Accumulation" },
    TSLAx: { netFlow: "+$420K", flowType: "Inflow", tier: "Momentum Swing" },
    GOOGLx: { netFlow: "+$680K", flowType: "Inflow", tier: "Accumulation" },
    AMZNx: { netFlow: "+$750K", flowType: "Inflow", tier: "Accumulation" },
    METAx: { netFlow: "+$910K", flowType: "Inflow", tier: "High Conviction" },
    COINx: { netFlow: "+$340K", flowType: "Inflow", tier: "Momentum Swing" },
    TSMx: { netFlow: "+$1.20M", flowType: "Inflow", tier: "High Conviction" },
    AVGOx: { netFlow: "+$630K", flowType: "Inflow", tier: "Accumulation" },
    AMDx: { netFlow: "+$490K", flowType: "Inflow", tier: "Accumulation" },
    INTCx: { netFlow: "-$120K", flowType: "Outflow", tier: "Rebalancing" },
    MUx: { netFlow: "+$380K", flowType: "Inflow", tier: "Accumulation" },
    MRVLx: { netFlow: "+$410K", flowType: "Inflow", tier: "Accumulation" },
    CRWDx: { netFlow: "+$290K", flowType: "Inflow", tier: "Neutral" },
    MSTRx: { netFlow: "+$880K", flowType: "Inflow", tier: "High Conviction" },
    DELLx: { netFlow: "+$310K", flowType: "Inflow", tier: "Accumulation" },
    SPYx: { netFlow: "+$1.05M", flowType: "Inflow", tier: "Core Anchor" },
    QQQx: { netFlow: "+$1.40M", flowType: "Inflow", tier: "Tech Core" },
    IWMx: { netFlow: "+$210K", flowType: "Inflow", tier: "Small Cap Beta" },
  },
};

export const OKX_CEX_MARKET_DATA: CexMarketData = {
  marketStatus: "Optimal Execution",
  avgSpreadBps: 2.1,
  volatilityIndex: "16.8% Ann.",
  liquidityDepthUsd: "$24.6M",
  assetMetrics: {
    NVDAx: { volume24h: "$4.8M", beta: 1.45, spread: "0.02%", momentumRank: 1 },
    AAPLx: { volume24h: "$3.6M", beta: 0.98, spread: "0.01%", momentumRank: 4 },
    MSFTx: { volume24h: "$2.9M", beta: 1.05, spread: "0.02%", momentumRank: 3 },
    TSLAx: { volume24h: "$3.2M", beta: 1.85, spread: "0.03%", momentumRank: 2 },
    GOOGLx: { volume24h: "$2.1M", beta: 1.12, spread: "0.02%", momentumRank: 6 },
    AMZNx: { volume24h: "$2.4M", beta: 1.18, spread: "0.02%", momentumRank: 5 },
    METAx: { volume24h: "$2.7M", beta: 1.32, spread: "0.02%", momentumRank: 2 },
    COINx: { volume24h: "$1.9M", beta: 2.10, spread: "0.04%", momentumRank: 7 },
    TSMx: { volume24h: "$2.3M", beta: 1.25, spread: "0.02%", momentumRank: 3 },
    AVGOx: { volume24h: "$1.6M", beta: 1.30, spread: "0.03%", momentumRank: 5 },
    AMDx: { volume24h: "$1.8M", beta: 1.55, spread: "0.03%", momentumRank: 4 },
    INTCx: { volume24h: "$950K", beta: 0.92, spread: "0.02%", momentumRank: 10 },
    MUx: { volume24h: "$1.1M", beta: 1.40, spread: "0.03%", momentumRank: 6 },
    MRVLx: { volume24h: "$880K", beta: 1.35, spread: "0.03%", momentumRank: 7 },
    CRWDx: { volume24h: "$740K", beta: 1.20, spread: "0.03%", momentumRank: 8 },
    MSTRx: { volume24h: "$2.5M", beta: 2.45, spread: "0.05%", momentumRank: 1 },
    DELLx: { volume24h: "$810K", beta: 1.15, spread: "0.02%", momentumRank: 8 },
    SPYx: { volume24h: "$5.2M", beta: 1.00, spread: "0.01%", momentumRank: 9 },
    QQQx: { volume24h: "$4.1M", beta: 1.15, spread: "0.01%", momentumRank: 4 },
    IWMx: { volume24h: "$1.3M", beta: 1.22, spread: "0.02%", momentumRank: 9 },
  },
};

export interface TrajectoryPoint {
  timeHorizon: string; // "1D" | "7D" | "14D" | "30D" | "90D"
  conservativeReturnPct: number;
  balancedReturnPct: number;
  aggressiveReturnPct: number;
}

export interface PrebuiltPlan {
  id: string;
  name: string;
  strategyType: "Short-Term Momentum" | "Long-Term Blue Chip DCA";
  riskLevel: "Conservative" | "Balanced" | "Aggressive";
  horizonDays: number;
  expectedAlpha: string;
  mandatePrompt: string;
  weights: Record<string, number>;
}

export interface TradingPlanData {
  trajectories: TrajectoryPoint[];
  prebuiltPlans: PrebuiltPlan[];
}

export const OKX_TRADING_PLAN_DATA: TradingPlanData = {
  trajectories: [
    { timeHorizon: "1D", conservativeReturnPct: 0.6, balancedReturnPct: 1.4, aggressiveReturnPct: 2.8 },
    { timeHorizon: "7D", conservativeReturnPct: 2.1, balancedReturnPct: 4.8, aggressiveReturnPct: 8.9 },
    { timeHorizon: "14D", conservativeReturnPct: 3.8, balancedReturnPct: 8.5, aggressiveReturnPct: 15.6 },
    { timeHorizon: "30D", conservativeReturnPct: 6.5, balancedReturnPct: 15.2, aggressiveReturnPct: 27.8 },
    { timeHorizon: "90D", conservativeReturnPct: 12.8, balancedReturnPct: 26.5, aggressiveReturnPct: 44.5 },
  ],
  prebuiltPlans: [
    {
      id: "momentum_alpha",
      name: "X Layer High-Beta Momentum",
      strategyType: "Short-Term Momentum",
      riskLevel: "Aggressive",
      horizonDays: 14,
      expectedAlpha: "+15.6% Expected Alpha",
      mandatePrompt: "Deploy 35% NVDAx, 25% MSTRx, 20% TSMx, 20% USDG Short-Term Momentum with 5% trailing stop",
      weights: { NVDAx: 35, MSTRx: 25, TSMx: 20, USDG: 20 },
    },
    {
      id: "bluechip_dca",
      name: "Institutional Mega-Cap DCA",
      strategyType: "Long-Term Blue Chip DCA",
      riskLevel: "Balanced",
      horizonDays: 90,
      expectedAlpha: "+26.5% Expected Alpha",
      mandatePrompt: "Deploy 30% AAPLx, 30% MSFTx, 20% QQQx, 20% USDG Long-Term DCA rebalance monthly",
      weights: { AAPLx: 30, MSFTx: 30, QQQx: 20, USDG: 20 },
    },
    {
      id: "capital_preservation",
      name: "Treasury Shield & Tech Anchor",
      strategyType: "Long-Term Blue Chip DCA",
      riskLevel: "Conservative",
      horizonDays: 90,
      expectedAlpha: "+12.8% Expected Alpha",
      mandatePrompt: "Deploy 50% USDG, 25% SPYx, 25% MSFTx Conservative Wealth Reserve",
      weights: { USDG: 50, SPYx: 25, MSFTx: 25 },
    },
  ],
};

export {
  DAYBREAK_CONVICTION_VAULT,
  DAYBREAK_ONCHAIN_CONVICTION,
  type StockConvictionMetric,
} from "@/lib/xlayer/vault_telemetry";
