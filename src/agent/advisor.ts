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
  riskProfile: RiskProfile;
  capitalUsd?: number;
  customStocks?: string[];
  stablecoin?: "USDG" | "USDC" | "USDT";
}): AdvisoryPlan {
  const { horizon, riskProfile, capitalUsd = 2500, customStocks = [], stablecoin = "USDG" } = params;

  // Custom stock selection branch: dynamically calculate allocation, weights, and thesis
  if (customStocks && customStocks.length > 0) {
    const validStocks = customStocks.filter(
      (s) => ALLOWLIST.some((item) => item.symbol === s) && s !== "USDG" && s !== "USDC" && s !== "USDT"
    );
    if (validStocks.length > 0) {
      let stableWeight = 25;
      let band = 2.5;
      let maxCap = 35;
      if (riskProfile === "conservative") {
        stableWeight = horizon === "short_term" ? 45 : 35;
        band = 2.0;
        maxCap = 25;
      } else if (riskProfile === "aggressive") {
        stableWeight = horizon === "short_term" ? 10 : 15;
        band = 1.5;
        maxCap = 45;
      } else {
        stableWeight = horizon === "short_term" ? 25 : 30;
        band = 2.5;
        maxCap = 30;
      }

      const equityTotalWeight = 100 - stableWeight;
      const baseWeightPerStock = Math.floor(equityTotalWeight / validStocks.length);
      const remainder = equityTotalWeight - baseWeightPerStock * validStocks.length;

      const allocations: AllocationItem[] = [
        {
          symbol: stablecoin,
          weightPercent: stableWeight,
          role: "Stable Liquidity Buffer",
          rationale: `Protects portfolio liquidity on OKX X Layer and funds rebalance swings in ${stablecoin}.`,
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
        id: `custom_${horizon}_${riskProfile}`,
        strategyName: `Custom Selection (${validStocks.join(", ")})`,
        horizon,
        horizonLabel:
          horizon === "short_term"
            ? "Short-Term Tactical (7 to 14 Days)"
            : "Long-Term Wealth Accumulation (1 to 2 Years)",
        riskProfile,
        riskLabel:
          riskProfile === "conservative"
            ? "Capital Preservation"
            : riskProfile === "aggressive"
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
          riskProfile === "aggressive"
            ? "High (Annualized ~30-40%)"
            : riskProfile === "conservative"
            ? "Low (Annualized ~10-15%)"
            : "Moderate (Annualized ~18-24%)",
        recommendedDcaUsd: Math.round(
          capitalUsd * (riskProfile === "aggressive" ? 0.25 : riskProfile === "conservative" ? 0.1 : 0.15)
        ),
      };
    }
  }

  if (horizon === "short_term") {
    if (riskProfile === "conservative") {
      return {
        id: "st_conservative",
        strategyName: "Defensive Short-Term Momentum",
        horizon: "short_term",
        horizonLabel: "Tactical (3 to 7 Days)",
        riskProfile: "conservative",
        riskLabel: "Capital Preservation",
        mandateRule: "20% NVDAx, 15% MSFTx, 15% AAPLx, 50% USDG, max 20%, band 2%",
        allocations: [
          { symbol: "USDG", weightPercent: 50, role: "Stable Liquidity Floor", rationale: "Shields capital against adverse market swings while waiting for entry signals." },
          { symbol: "NVDAx", weightPercent: 20, role: "AI Momentum Anchor", rationale: "Captures high liquidity trading volume without overexposing total capital." },
          { symbol: "MSFTx", weightPercent: 15, role: "Enterprise Stability", rationale: "Low beta resilience relative to the broader semiconductor basket." },
          { symbol: "AAPLx", weightPercent: 15, role: "Cash Flow Anchor", rationale: "Consistently low intraday drawdowns and high DEX swap volume." },
        ],
        thesis: "Combines 50% stablecoin reserve with tight single-stock caps (max 20%). Rebalances every 3 days to lock in gains into USDG whenever equity legs appreciate above the 2% drift threshold.",
        rebalanceInterval: "3-day trigger window",
        downsideProtection: "Strict 50% USDG reserve floor",
        expectedVolatility: "Low (Annualized ~8-12%)",
        recommendedDcaUsd: Math.round(capitalUsd * 0.1),
      };
    }

    if (riskProfile === "aggressive") {
      return {
        id: "st_aggressive",
        strategyName: "High Velocity Tech Alpha",
        horizon: "short_term",
        horizonLabel: "High Frequency (24 to 48 Hours)",
        riskProfile: "aggressive",
        riskLabel: "Maximum Capital Acceleration",
        mandateRule: "45% NVDAx, 35% TSLAx, 10% METAx, 10% USDG, max 45%, band 1.5%",
        allocations: [
          { symbol: "NVDAx", weightPercent: 45, role: "Primary Alpha Driver", rationale: "Maximized exposure to data center compute demand and earnings momentum." },
          { symbol: "TSLAx", weightPercent: 35, role: "High-Beta Expansion", rationale: "High volatility provides frequent mean-reversion rebalancing opportunities." },
          { symbol: "METAx", weightPercent: 10, role: "Ad Monetization Support", rationale: "Positive operating leverage with strong cash flow backing." },
          { symbol: "USDG", weightPercent: 10, role: "Friction Buffer", rationale: "Maintains minimal dry powder to cover on-chain DEX gas and slippage." },
        ],
        thesis: "Concentrated 80% allocation in the highest-beta tokenized assets (NVDAx, TSLAx). The algorithmic agent monitors 1.5% drift bands to continuously harvest volatility profits into USDG.",
        rebalanceInterval: "Daily drift monitoring",
        downsideProtection: "Dynamic algorithmic profit harvesting at 1.5% drift",
        expectedVolatility: "High (Annualized ~35-45%)",
        recommendedDcaUsd: Math.round(capitalUsd * 0.25),
      };
    }

    // Balanced
    return {
      id: "st_balanced",
      strategyName: "Balanced Momentum & Swing Sleeve",
      horizon: "short_term",
      horizonLabel: "Swing Horizon (7 to 14 Days)",
      riskProfile: "balanced",
      riskLabel: "Moderate Growth",
      mandateRule: "35% NVDAx, 25% TSLAx, 15% METAx, 25% USDG, max 35%, band 2.5%",
      allocations: [
        { symbol: "NVDAx", weightPercent: 35, role: "Core Tech Momentum", rationale: "Leading driver of equity returns on X Layer with deep DEX liquidity." },
        { symbol: "TSLAx", weightPercent: 25, role: "Beta Multiplier", rationale: "Captures broader market risk-on shifts with rapid turnaround." },
        { symbol: "METAx", weightPercent: 15, role: "Quality Growth", rationale: "Strong balance sheet dampening downside volatility." },
        { symbol: "USDG", weightPercent: 25, role: "Dry Powder Reserve", rationale: "Deploys automatically into dips when equities cross negative drift thresholds." },
      ],
      thesis: "Targeted swing allocation designed to outpace benchmark indices while maintaining a 25% USDG safety cushion. Algorithmic rebalancing triggers every 7 days or when drift exceeds 2.5%.",
      rebalanceInterval: "Weekly 7-day rebalance",
      downsideProtection: "25% USDG cash cushion with single-name 35% cap",
      expectedVolatility: "Moderate (Annualized ~20-25%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.15),
    };
  }

  // Long-Term Horizons
  if (riskProfile === "conservative") {
    return {
      id: "lt_conservative",
      strategyName: "Blue Chip Wealth Preserver & Dividend Core",
      horizon: "long_term",
      horizonLabel: "Multi-Year Core (1 to 3+ Years)",
      riskProfile: "conservative",
      riskLabel: "Wealth Preservation & Compounding",
      mandateRule: "15% AAPLx, 15% MSFTx, 15% GOOGLx, 15% AMZNx, 40% USDG, max 15%, band 3%",
      allocations: [
        { symbol: "USDG", weightPercent: 40, role: "Yield & Anchor Sleeve", rationale: "Protects overall portfolio purchasing power against market drawdowns." },
        { symbol: "AAPLx", weightPercent: 15, role: "Consumer Monopoly", rationale: "Unmatched ecosystem retention and massive programmatic share repurchases." },
        { symbol: "MSFTx", weightPercent: 15, role: "Enterprise Cloud Moat", rationale: "Mission-critical enterprise software contracts generating perpetual cash flows." },
        { symbol: "GOOGLx", weightPercent: 15, role: "Search & AI Monopolies", rationale: "Dominant global search market share and Android ecosystem scale." },
        { symbol: "AMZNx", weightPercent: 15, role: "E-Commerce & AWS Infra", rationale: "Dual engine of global e-commerce logistics and AWS cloud infrastructure." },
      ],
      thesis: "Conservative compounder built on fortress balance sheets. Allocates 60% across the four most profitable tech monopolies with strict 15% individual position caps and 40% USDG stability reserve.",
      rebalanceInterval: "Quarterly rebalance check",
      downsideProtection: "40% stablecoin reserve with equal weight equity caps",
      expectedVolatility: "Low (Annualized ~10-14%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.08),
    };
  }

  if (riskProfile === "aggressive") {
    return {
      id: "lt_aggressive",
      strategyName: "Full Magnificent 7 Maximum Compounder",
      horizon: "long_term",
      horizonLabel: "Long-Term Growth (3+ Years)",
      riskProfile: "aggressive",
      riskLabel: "Aggressive Equity Accumulation",
      mandateRule: "85% mag7, 15% USDG, max 20%, band 3%",
      allocations: [
        { symbol: "NVDAx", weightPercent: 18, role: "AI Compute Infrastructure", rationale: "Sovereign and enterprise AI hardware monopoly." },
        { symbol: "MSFTx", weightPercent: 16, role: "Enterprise Software & Cloud", rationale: "Azure cloud compounding with enterprise Copilot adoption." },
        { symbol: "AAPLx", weightPercent: 15, role: "Edge Devices & Services", rationale: "2+ billion active installed base generating high-margin service revenue." },
        { symbol: "AMZNx", weightPercent: 13, role: "Cloud & Retail Logistics", rationale: "Expanding operating margins across retail and AWS cloud dominance." },
        { symbol: "GOOGLx", weightPercent: 12, role: "Search & Deep Learning", rationale: "Gemini AI models monetizing across YouTube, Search, and Cloud." },
        { symbol: "METAx", weightPercent: 11, role: "Social Graph & Open AI", rationale: "Llama open model leadership and massive digital advertising reach." },
        { symbol: "USDG", weightPercent: 15, role: "DCA Inflow Buffer", rationale: "Absorbs incoming monthly contributions before systematic rebalancing." },
      ],
      thesis: "Aggressive multi-year wealth accumulation mandate allocating 85% into the global technology leaders driving modern GDP. Dynamic rebalancing caps individual asset drag at 20%.",
      rebalanceInterval: "Monthly scheduled DCA & rebalance",
      downsideProtection: "20% maximum single-name constraint to eliminate idiosyncratic stock risk",
      expectedVolatility: "Moderate-High (Annualized ~25-32%)",
      recommendedDcaUsd: Math.round(capitalUsd * 0.2),
    };
  }

  // Long-Term Balanced
  return {
    id: "lt_balanced",
    strategyName: "Magnificent 7 Balanced Index & DCA Mandate",
    horizon: "long_term",
    horizonLabel: "Strategic Horizon (1 to 2 Years)",
    riskProfile: "balanced",
    riskLabel: "Balanced Compounding",
    mandateRule: "70% mag7, 30% USDG, max 15%, band 3%",
    allocations: [
      { symbol: "AAPLx", weightPercent: 10, role: "Consumer Hardware & Services", rationale: "Steady cash-generative foundation." },
      { symbol: "MSFTx", weightPercent: 10, role: "Enterprise Software", rationale: "High recurring SaaS revenue and cloud leadership." },
      { symbol: "NVDAx", weightPercent: 10, role: "Accelerated Computing", rationale: "Core AI silicon backbone." },
      { symbol: "GOOGLx", weightPercent: 10, role: "Search & Video", rationale: "Dominant digital ad networks." },
      { symbol: "AMZNx", weightPercent: 10, role: "E-Commerce & Cloud", rationale: "Global retail and AWS infrastructure." },
      { symbol: "METAx", weightPercent: 10, role: "Social & Digital Ads", rationale: "High-margin advertising powerhouse." },
      { symbol: "TSLAx", weightPercent: 10, role: "Autonomous Mobility & Energy", rationale: "Clean energy and robotic automation exposure." },
      { symbol: "USDG", weightPercent: 30, role: "Rebalance Anchor", rationale: "Buffer to fund periodic rebalances without selling at a loss." },
    ],
    thesis: "The flagship balanced Meirei mandate. Equal-weight exposure across all 7 Mag7 tech equities (10% each) combined with 30% USDG cash sleeve. Automatically buys underperforming names and trims winners when drift exceeds 3%.",
    rebalanceInterval: "Quarterly rebalance or on 3% drift",
    downsideProtection: "30% USDG buffer with strictly equal-weighted 10% positions",
    expectedVolatility: "Balanced (Annualized ~18-22%)",
    recommendedDcaUsd: Math.round(capitalUsd * 0.12),
  };
}
