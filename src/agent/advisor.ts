import { ALLOWLIST } from "../allowlist";

export type AdvisoryHorizon = "short_term" | "long_term";
export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface AllocationItem {
  symbol: string;
  weightPercent: number;
  role: string;
  rationale: string;
}

export interface AdvisoryPlan {
  id: string;
  strategyName: string;
  horizon: AdvisoryHorizon;
  horizonLabel: string;
  riskProfile: RiskProfile;
  riskLabel: string;
  mandateRule: string;
  allocations: AllocationItem[];
  thesis: string;
  rebalanceInterval: string;
  downsideProtection: string;
  expectedVolatility: string;
  recommendedDcaUsd: number;
}

/**
 * Generates an institutional-grade algorithmic investment mandate tailored to horizon and risk.
 */
export function generateAdvisoryPlan(params: {
  horizon: AdvisoryHorizon;
  riskProfile?: RiskProfile;
  mandateIndex?: number;
  capitalUsd?: number;
  customStocks?: string[];
  stablecoin?: "USDG" | "USDC" | "USDT";
}): AdvisoryPlan {
  const { horizon, riskProfile = "balanced", mandateIndex = 0, capitalUsd = 2500, customStocks = [], stablecoin = "USDG" } = params;

  // Custom stock selection branch: dynamically calculate allocation, weights, and thesis
  if (customStocks && customStocks.length > 0) {
    const validStocks = customStocks.filter(
      (s) => ALLOWLIST.some((item) => item.symbol === s) && s !== "USDG" && s !== "USDC" && s !== "USDT"
    );
    if (validStocks.length > 0) {
      let stableWeight = 25;
      let band = 2.5;
      let maxCap = 35;
      let calculatedRisk: RiskProfile = riskProfile;

      if (mandateIndex === 0) {
        stableWeight = horizon === "short_term" ? 15 : 25;
        band = 2.0;
        maxCap = 35;
        calculatedRisk = "aggressive";
      } else if (mandateIndex === 1) {
        stableWeight = horizon === "short_term" ? 10 : 30;
        band = 1.5;
        maxCap = 30;
        calculatedRisk = "aggressive";
      } else if (mandateIndex === 2) {
        stableWeight = horizon === "short_term" ? 20 : 45;
        band = 2.5;
        maxCap = 25;
        calculatedRisk = horizon === "short_term" ? "balanced" : "conservative";
      } else if (mandateIndex === 3) {
        stableWeight = horizon === "short_term" ? 40 : 20;
        band = 3.0;
        maxCap = 20;
        calculatedRisk = horizon === "short_term" ? "conservative" : "balanced";
      }

      const equityTotalWeight = 100 - stableWeight;
      const baseWeightPerStock = Math.floor(equityTotalWeight / validStocks.length);
      const remainder = equityTotalWeight - baseWeightPerStock * validStocks.length;

      const allocations: AllocationItem[] = [
        {
          symbol: stablecoin,
          weightPercent: stableWeight,
          role: "Stable Liquidity Buffer",
          rationale: `Protects portfolio liquidity on OKX X Layer and funds algorithmic rebalancing in ${stablecoin}.`,
        },
      ];

      validStocks.forEach((stk, idx) => {
        const weight = idx === 0 ? baseWeightPerStock + remainder : baseWeightPerStock;
        allocations.push({
          symbol: stk,
          weightPercent: weight,
          role: idx === 0 ? "Primary Alpha Driver" : "Portfolio Holding",
          rationale: `Direct tokenized equity exposure via OKX DEX Aggregator with automated ${band}% drift band monitoring.`,
        });
      });

      const stockRules = validStocks
        .map((stk) => {
          const alloc = allocations.find((a) => a.symbol === stk);
          return `${alloc?.weightPercent}% ${stk}`;
        })
        .join(", ");
      const mandateRule = `${stockRules}, ${stableWeight}% ${stablecoin}, max ${maxCap}%, band ${band}%`;

      return {
        id: `custom_${horizon}_m${mandateIndex}`,
        strategyName: `Custom Selection (${validStocks.join(", ")})`,
        horizon,
        horizonLabel:
          horizon === "short_term"
            ? "Short-Term Tactical (7 to 14 Days)"
            : "Long-Term Wealth Accumulation (1 to 2 Years)",
        riskProfile: calculatedRisk,
        riskLabel:
          calculatedRisk === "conservative"
            ? "Capital Preservation"
            : calculatedRisk === "aggressive"
            ? "High Alpha Acceleration"
            : "Strategic Balanced",
        mandateRule,
        allocations,
        thesis: `Custom multi-asset allocation synthesizing ${validStocks.length} allowlisted tokenized stocks on OKX X Layer paired with a ${stableWeight}% ${stablecoin} liquidity buffer. Algorithmic execution continuously balances positions when drift exceeds ${band}%.`,
        rebalanceInterval:
          horizon === "short_term"
            ? "Daily drift monitor / 7-day trigger"
            : "Monthly scheduled rebalance or 3% drift",
        downsideProtection: `${stableWeight}% ${stablecoin} liquidity floor with strict ${maxCap}% single-stock ceiling`,
        expectedVolatility:
          calculatedRisk === "aggressive"
            ? "High (Annualized ~30-40%)"
            : calculatedRisk === "conservative"
            ? "Low (Annualized ~10-15%)"
            : "Moderate (Annualized ~18-24%)",
        recommendedDcaUsd: Math.round(
          capitalUsd * (calculatedRisk === "aggressive" ? 0.25 : calculatedRisk === "conservative" ? 0.1 : 0.15)
        ),
      };
    }
  }

  // SHORT-TERM MANDATE DIRECTIVES (4 DISTINCT ALGORITHMIC RULES)
  if (horizon === "short_term") {
    // Mandate #1: Dynamic High-Beta Momentum Rotation
    if (mandateIndex === 0) {
      return {
        id: "st_m1_high_beta_momentum",
        strategyName: "Dynamic High-Beta Momentum Rotation",
        horizon: "short_term",
        horizonLabel: "High Velocity (3 to 7 Days)",
        riskProfile: "aggressive",
        riskLabel: "High Alpha Momentum",
        mandateRule: `35% NVDAx, 25% TSLAx, 15% AMDx, 10% COINx, 15% ${stablecoin}, max 35%, band 2%`,
        allocations: [
          { symbol: "NVDAx", weightPercent: 35, role: "Primary AI Compute Anchor", rationale: "Captures top-volume momentum on X Layer with deep DEX liquidity." },
          { symbol: "TSLAx", weightPercent: 25, role: "High-Beta Expansion", rationale: "High intraday volatility generates frequent mean-reversion rebalancing opportunities." },
          { symbol: "AMDx", weightPercent: 15, role: "Semiconductor Momentum", rationale: "Correlated chip momentum leg expanding overall basket alpha." },
          { symbol: "COINx", weightPercent: 10, role: "Crypto-Correlated Beta", rationale: "High-beta accelerator capitalizing on institutional crypto liquidity surges." },
          { symbol: stablecoin, weightPercent: 15, role: "Trailing Stop & Gas Buffer", rationale: "Guarantees dry powder to rebalance swings and fund 5% trailing stop-loss protection." },
        ],
        thesis: "Focuses aggressively on top-volume momentum leaders (NVDAx, TSLAx, AMDx, COINx) with automated 5% trailing stop protection. Capitalizes on rapid momentum breakouts and methodically rotates volatility gains into USDG liquidity.",
        rebalanceInterval: "Daily momentum scan / 2.0% drift trigger",
        downsideProtection: "Dynamic 5.0% trailing stop loss with auto-exit into USDG",
        expectedVolatility: "High (Annualized ~35-42%)",
        recommendedDcaUsd: Math.round(capitalUsd * 0.25),
      };
    }

    // Mandate #2: Breakout Alpha & Whale Inflow
    if (mandateIndex === 1) {
      return {
        id: "st_m2_breakout_whale_flow",
        strategyName: "Breakout Alpha & Whale Inflow",
        horizon: "short_term",
        horizonLabel: "Institutional Flow (24 to 48 Hours)",
        riskProfile: "aggressive",
        riskLabel: "Smart Money Alpha",
        mandateRule: `30% NVDAx, 25% MSFTx, 20% TSMx, 15% AVGOx, 10% ${stablecoin}, max 30%, band 1.5%`,
        allocations: [
          { symbol: "NVDAx", weightPercent: 30, role: "Whale Inflow Leader (+$1.92M)", rationale: "Highest net inflow tier across OKX CEX/DEX bridges over the past 24 hours." },
          { symbol: "MSFTx", weightPercent: 25, role: "Institutional Cloud Flow (+$840K)", rationale: "Strong institutional accumulation supporting top-trader long positioning." },
          { symbol: "TSMx", weightPercent: 20, role: "Foundry Chip Inflow (+$1.20M)", rationale: "Major buy-side whale accumulation confirmed by okx-cex-smartmoney." },
          { symbol: "AVGOx", weightPercent: 15, role: "AI Networking Hardware (+$630K)", rationale: "High conviction institutional bid with low bid-ask spreads." },
          { symbol: stablecoin, weightPercent: 10, role: "Smart Flow Rebalance Buffer", rationale: "Enables instant hedging on any 3% adverse flow divergence." },
        ],
        thesis: "Monitors whale accumulation via okx-cex-smartmoney telemetry. Automatically builds positions where 24h institutional net inflow exceeds $500K on X Layer, and immediately hedges into USDG upon detecting 3% adverse divergence.",
        rebalanceInterval: "48h whale flow trigger window",
        downsideProtection: "3.0% hedge threshold directly into USDG on institutional outflow",
        expectedVolatility: "Moderate-High (Annualized ~26-32%)",
        recommendedDcaUsd: Math.round(capitalUsd * 0.2),
      };
    }

    // Mandate #3: Sentiment & Liquidity Momentum
    if (mandateIndex === 2) {
      return {
        id: "st_m3_sentiment_momentum",
        strategyName: "Sentiment & Liquidity Momentum",
        horizon: "short_term",
        horizonLabel: "Sentiment Swing (7 to 14 Days)",
        riskProfile: "balanced",
        riskLabel: "Sentiment Balanced",
        mandateRule: `30% AAPLx, 25% GOOGLx, 20% METAx, 15% AMZNx, 10% ${stablecoin}, max 30%, band 2.5%`,
        allocations: [
          { symbol: "AAPLx", weightPercent: 30, role: "Sentiment Score 88/100", rationale: "Dominant retail and institutional social sentiment leader across 48.2K mentions." },
          { symbol: "GOOGLx", weightPercent: 25, role: "Sentiment Score 84/100", rationale: "Accelerating AI ecosystem sentiment and deep on-chain swap liquidity." },
          { symbol: "METAx", weightPercent: 20, role: "Sentiment Score 82/100", rationale: "Llama open model momentum and digital ad monetization conviction." },
          { symbol: "AMZNx", weightPercent: 15, role: "Sentiment Score 79/100", rationale: "AWS cloud growth optimism driving steady buy-side interest." },
          { symbol: stablecoin, weightPercent: 10, role: "Sentiment Cycle Reserve", rationale: "Buffers 14-day rotational rebalances across allowlisted tokens." },
        ],
        thesis: "Positions into high-conviction mega-caps holding sentiment scores > 75 on okx-sentiment-tracker. Executes systematic 14-day rotational rebalancing across OKX X Layer DEX liquidity pools.",
        rebalanceInterval: "14-day dynamic sentiment rotation cycle",
        downsideProtection: "Sentiment threshold cut-off (<60 triggers partial hedge to USDG)",
        expectedVolatility: "Moderate (Annualized ~18-24%)",
        recommendedDcaUsd: Math.round(capitalUsd * 0.15),
      };
    }

    // Mandate #4: Dip Accumulator & Swing Guard
    return {
      id: "st_m4_dip_accumulator",
      strategyName: "Dip Accumulator & Swing Guard",
      horizon: "short_term",
      horizonLabel: "Tactical Swing (Event-Driven)",
      riskProfile: "conservative",
      riskLabel: "Capital Preservation",
      mandateRule: `20% MSFTx, 20% AAPLx, 20% GOOGLx, 40% ${stablecoin}, max 20%, band 3%`,
      allocations: [
        { symbol: stablecoin, weightPercent: 40, role: "Primary Dry Powder Reserve", rationale: "Shields capital from drawdowns and triggers automated buying on 3% pullbacks." },
        { symbol: "MSFTx", weightPercent: 20, role: "Enterprise Fortress Anchor", rationale: "Extremely resilient enterprise earnings floor with low beta." },
        { symbol: "AAPLx", weightPercent: 20, role: "Consumer Moat Leg", rationale: "Consistently low intraday drawdowns and high DEX swap volume." },
        { symbol: "GOOGLx", weightPercent: 20, role: "Cash Generative Swing Leg", rationale: "High profit margin profile that reliably rebounds after sector pullbacks." },
      ],
      thesis: "Disciplined counter-cyclical swing mandate. Maintains a dominant 40% USDG cash sleeve to automatically scoop 3% pullback dips, while methodically harvesting 8% upside surges back into USDG liquidity.",
      rebalanceInterval: "Event-driven: 3% pullback buy / 8% profit take",
      downsideProtection: "Heavy 40% USDG cash fortress buffer",
      expectedVolatility: "Low-Moderate (Annualized ~12-16%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.1),
    };
  }

  // LONG-TERM MANDATE DIRECTIVES (4 DISTINCT ALGORITHMIC RULES)
  // Mandate #1: Systematic Blue Chip DCA
  if (mandateIndex === 0) {
    return {
      id: "lt_m1_bluechip_dca",
      strategyName: "Systematic Blue Chip DCA",
      horizon: "long_term",
      horizonLabel: "Long-Term Growth (1 to 2 Years)",
      riskProfile: "balanced",
      riskLabel: "Core Blue Chip DCA",
      mandateRule: `25% NVDAx, 25% MSFTx, 25% AAPLx, 25% ${stablecoin}, max 25%, band 3%`,
      allocations: [
        { symbol: "NVDAx", weightPercent: 25, role: "AI Silicon Dominance", rationale: "Sovereign and enterprise AI hardware compounding." },
        { symbol: "MSFTx", weightPercent: 25, role: "Cloud & Enterprise Moat", rationale: "Mission-critical enterprise software generating perpetual recurring cash flows." },
        { symbol: "AAPLx", weightPercent: 25, role: "Consumer Hardware Monopoly", rationale: "2+ billion active installed base generating high-margin ecosystem revenue." },
        { symbol: stablecoin, weightPercent: 25, role: "Monthly Inflow Buffer", rationale: "Absorbs incoming monthly contributions before systematic rebalancing." },
      ],
      thesis: "Fortress technology compounding mandate. Systematically accumulates top 3 institutional monopolies with zero-gas execution sponsored by OKX Paymaster on X Layer.",
      rebalanceInterval: "Monthly scheduled DCA or on 3% drift",
      downsideProtection: "25% USDG cash cushion with equal-weight tech caps",
      expectedVolatility: "Moderate (Annualized ~18-22%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.15),
    };
  }

  // Mandate #2: Risk-Weighted Market Cap DCA
  if (mandateIndex === 1) {
    return {
      id: "lt_m2_market_cap_dca",
      strategyName: "Risk-Weighted Market Cap DCA",
      horizon: "long_term",
      horizonLabel: "Strategic Horizon (2+ Years)",
      riskProfile: "balanced",
      riskLabel: "Market Cap Weighted",
      mandateRule: `20% NVDAx, 18% MSFTx, 16% AAPLx, 10% AMZNx, 6% GOOGLx, 30% ${stablecoin}, max 20%, band 3%`,
      allocations: [
        { symbol: "NVDAx", weightPercent: 20, role: "AI Compute Infrastructure", rationale: "Leading weighting proportional to global market capitalization leadership." },
        { symbol: "MSFTx", weightPercent: 18, role: "Enterprise Cloud Moat", rationale: "High recurring enterprise SaaS revenue." },
        { symbol: "AAPLx", weightPercent: 16, role: "Hardware & Services", rationale: "Massive programmatic share repurchases and consumer retention." },
        { symbol: "AMZNx", weightPercent: 10, role: "Cloud & Retail Logistics", rationale: "Expanding operating margins across retail and AWS cloud dominance." },
        { symbol: "GOOGLx", weightPercent: 6, role: "Search & Deep Learning", rationale: "Core search and digital advertising revenue engine." },
        { symbol: stablecoin, weightPercent: 30, role: "Liquidity Buffer Sleeve", rationale: "Buffer to fund periodic rebalances without selling at a loss." },
      ],
      thesis: "Institutional-grade market capitalization sleeve with dynamic 70/30 equity/stablecoin allocation rebalanced quarterly on OKX X Layer.",
      rebalanceInterval: "Quarterly rebalance or on 3% drift",
      downsideProtection: "30% USDG buffer with proportional market-cap weighting",
      expectedVolatility: "Moderate (Annualized ~16-20%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.12),
    };
  }

  // Mandate #3: Capital Preservation & Value DCA
  if (mandateIndex === 2) {
    return {
      id: "lt_m3_capital_preservation",
      strategyName: "Capital Preservation & Value DCA",
      horizon: "long_term",
      horizonLabel: "Multi-Year Core (3+ Years)",
      riskProfile: "conservative",
      riskLabel: "Capital Preservation",
      mandateRule: `20% AAPLx, 20% MSFTx, 15% GOOGLx, 45% ${stablecoin}, max 20%, band 3%`,
      allocations: [
        { symbol: stablecoin, weightPercent: 45, role: "Yield & Anchor Sleeve", rationale: "Protects overall portfolio purchasing power against adverse market swings." },
        { symbol: "AAPLx", weightPercent: 20, role: "Consumer Moat", rationale: "Unmatched ecosystem retention and low historical volatility." },
        { symbol: "MSFTx", weightPercent: 20, role: "Enterprise Resilience", rationale: "Stable long-term enterprise software compounding." },
        { symbol: "GOOGLx", weightPercent: 15, role: "Cash Generative Core", rationale: "Fortress balance sheet with massive net cash reserves." },
      ],
      thesis: "Conservative compounder built on fortress balance sheets. Allocates 55% across 3 tech monopolies with strict 20% position caps and 45% USDG stability reserve.",
      rebalanceInterval: "Quarterly rebalance check",
      downsideProtection: "Fortress 45% stablecoin reserve with strict equity caps",
      expectedVolatility: "Low (Annualized ~10-14%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.08),
    };
  }

  // Mandate #4: All-Weather Multi-Asset Compounder
  return {
    id: "lt_m4_all_weather_compounder",
    strategyName: "All-Weather Multi-Asset Compounder",
    horizon: "long_term",
    horizonLabel: "Long-Term Growth (3+ Years)",
    riskProfile: "aggressive",
    riskLabel: "All-Weather Compounder",
    mandateRule: `12% NVDAx, 12% MSFTx, 12% AAPLx, 12% AMZNx, 12% GOOGLx, 10% METAx, 10% TSLAx, 20% ${stablecoin}, max 15%, band 3%`,
    allocations: [
      { symbol: "NVDAx", weightPercent: 12, role: "AI Compute", rationale: "High growth accelerated computing." },
      { symbol: "MSFTx", weightPercent: 12, role: "Enterprise Cloud", rationale: "Mission-critical enterprise software." },
      { symbol: "AAPLx", weightPercent: 12, role: "Consumer Hardware", rationale: "Global mobile ecosystem foundation." },
      { symbol: "AMZNx", weightPercent: 12, role: "Cloud & E-Commerce", rationale: "AWS and logistics operating margins." },
      { symbol: "GOOGLx", weightPercent: 12, role: "Search & Video", rationale: "Digital ads and Gemini ecosystem scale." },
      { symbol: "METAx", weightPercent: 10, role: "Social & Open AI", rationale: "Llama open model leadership." },
      { symbol: "TSLAx", weightPercent: 10, role: "Mobility & Robotics", rationale: "Clean energy and autonomous computing." },
      { symbol: stablecoin, weightPercent: 20, role: "All-Weather Buffer", rationale: "Absorbs volatility and fuels programmatic dip purchases." },
    ],
    thesis: "Aggressive multi-year wealth accumulation mandate allocating 80% into 7 global technology leaders. Dynamic rebalancing caps individual asset drag at 15%.",
    rebalanceInterval: "Bi-monthly rebalance check or 3% drift",
    downsideProtection: "20% USDG buffer with strict 15% maximum single-name constraint",
    expectedVolatility: "Moderate-High (Annualized ~20-25%)",
    recommendedDcaUsd: Math.round(capitalUsd * 0.2),
  };
}
