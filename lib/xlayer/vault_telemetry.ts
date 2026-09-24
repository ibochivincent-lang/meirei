/**
 * Daybreak Conviction Vault Telemetry on OKX X Layer (Chain 196)
 *
 * Tracks on-chain conviction theses and locked xStock backing from the
 * DaybreakConvictionVault contract deployed at:
 * 0x55318F36f5B482e9F2b1429f2Ca7fD7c5BBf97fc (Block 71490884)
 */

export const DAYBREAK_CONVICTION_VAULT = {
  address: "0x55318F36f5B482e9F2b1429f2Ca7fD7c5BBf97fc" as const,
  network: "OKX X Layer",
  chainId: 196,
  blockDeployed: 71490884,
  explorerUrl: "https://www.oklink.com/xlayer/address/0x55318F36f5B482e9F2b1429f2Ca7fD7c5BBf97fc",
};

export interface StockConvictionMetric {
  symbol: string;
  thesesCount: number;
  lockedUnits: number;
  convictionScore: number; // 0 - 100
  dominantThesis: string;
  sentimentTrend: "Strong Accumulation" | "Bullish Holding" | "Momentum Long";
}

export const DAYBREAK_ONCHAIN_CONVICTION: Record<string, StockConvictionMetric> = {
  NVDAx: {
    symbol: "NVDAx",
    thesesCount: 14,
    lockedUnits: 1420.5,
    convictionScore: 94,
    dominantThesis: "AI Datacenter Hardware CapEx Expansion into 2027",
    sentimentTrend: "Strong Accumulation",
  },
  TSLAx: {
    symbol: "TSLAx",
    thesesCount: 11,
    lockedUnits: 890.2,
    convictionScore: 82,
    dominantThesis: "Robotaxi Unsupervised FSD Rollout & Megapack Storage Ramp",
    sentimentTrend: "Momentum Long",
  },
  AAPLx: {
    symbol: "AAPLx",
    thesesCount: 9,
    lockedUnits: 650.0,
    convictionScore: 85,
    dominantThesis: "Apple Intelligence Supercycle & Services Margin Expansion",
    sentimentTrend: "Bullish Holding",
  },
  MSFTx: {
    symbol: "MSFTx",
    thesesCount: 8,
    lockedUnits: 480.0,
    convictionScore: 88,
    dominantThesis: "Azure AI Monetization & Enterprise Copilot Saturation",
    sentimentTrend: "Strong Accumulation",
  },
  AMZNx: {
    symbol: "AMZNx",
    thesesCount: 7,
    lockedUnits: 720.0,
    convictionScore: 86,
    dominantThesis: "AWS Cloud Reacceleration & Prime Ad Yield Efficiency",
    sentimentTrend: "Strong Accumulation",
  },
  GOOGLx: {
    symbol: "GOOGLx",
    thesesCount: 8,
    lockedUnits: 610.0,
    convictionScore: 84,
    dominantThesis: "Gemini Model Integration Across Workspace & Search Defense",
    sentimentTrend: "Bullish Holding",
  },
  METAx: {
    symbol: "METAx",
    thesesCount: 10,
    lockedUnits: 540.0,
    convictionScore: 91,
    dominantThesis: "Llama Open-Source Ecosystem Dominance & AI Ad Engine Monetization",
    sentimentTrend: "Strong Accumulation",
  },
  MSTRx: {
    symbol: "MSTRx",
    thesesCount: 15,
    lockedUnits: 3450.0,
    convictionScore: 96,
    dominantThesis: "Treasury Reserve Bitcoin Accretion Multiple Expansion",
    sentimentTrend: "Strong Accumulation",
  },
  COINx: {
    symbol: "COINx",
    thesesCount: 7,
    lockedUnits: 410.0,
    convictionScore: 79,
    dominantThesis: "Base L2 Network Fee Capture & Institutional Custody Dominance",
    sentimentTrend: "Momentum Long",
  },
  CRCLx: {
    symbol: "CRCLx",
    thesesCount: 6,
    lockedUnits: 1200.0,
    convictionScore: 80,
    dominantThesis: "Cross-Chain Stablecoin Market Share Growth & Net Interest Margin",
    sentimentTrend: "Bullish Holding",
  },
  SPYx: {
    symbol: "SPYx",
    thesesCount: 5,
    lockedUnits: 320.0,
    convictionScore: 78,
    dominantThesis: "Macro Soft Landing & Corporate Earnings Resilience",
    sentimentTrend: "Bullish Holding",
  },
  QQQx: {
    symbol: "QQQx",
    thesesCount: 9,
    lockedUnits: 510.0,
    convictionScore: 89,
    dominantThesis: "Large-Cap Tech Operating Leverage & Productivity Boom",
    sentimentTrend: "Strong Accumulation",
  },
  HOODx: {
    symbol: "HOODx",
    thesesCount: 4,
    lockedUnits: 880.0,
    convictionScore: 76,
    dominantThesis: "Crypto Margin Expansion & European Asset Tokenization Growth",
    sentimentTrend: "Momentum Long",
  },
  PLTRx: {
    symbol: "PLTRx",
    thesesCount: 8,
    lockedUnits: 950.0,
    convictionScore: 87,
    dominantThesis: "AIP Bootcamps US Commercial Pipeline Acceleration",
    sentimentTrend: "Strong Accumulation",
  },
  GMEx: {
    symbol: "GMEx",
    thesesCount: 12,
    lockedUnits: 2800.0,
    convictionScore: 74,
    dominantThesis: "Balance Sheet Cash Inflow & Community Cult Velocity",
    sentimentTrend: "Momentum Long",
  },
  AMDx: {
    symbol: "AMDx",
    thesesCount: 6,
    lockedUnits: 390.0,
    convictionScore: 81,
    dominantThesis: "MI350X/MI400 Compute Accelerators Market Share Gain",
    sentimentTrend: "Bullish Holding",
  },
  NFLXx: {
    symbol: "NFLXx",
    thesesCount: 5,
    lockedUnits: 240.0,
    convictionScore: 83,
    dominantThesis: "Ad-Tier Subscriber Growth & Live Global Event Monetization",
    sentimentTrend: "Bullish Holding",
  },
  GLDx: {
    symbol: "GLDx",
    thesesCount: 7,
    lockedUnits: 430.0,
    convictionScore: 85,
    dominantThesis: "Global Sovereign Reserve Diversification & Rate Cut Tailwind",
    sentimentTrend: "Bullish Holding",
  },
  INTCx: {
    symbol: "INTCx",
    thesesCount: 3,
    lockedUnits: 620.0,
    convictionScore: 68,
    dominantThesis: "18A Foundry Process Execution & US CHIPS Act Subsidies",
    sentimentTrend: "Bullish Holding",
  },
  ORCLx: {
    symbol: "ORCLx",
    thesesCount: 5,
    lockedUnits: 310.0,
    convictionScore: 82,
    dominantThesis: "OCI Multi-Cloud Database Partnerships with AWS, Azure & GCP",
    sentimentTrend: "Bullish Holding",
  },
};
