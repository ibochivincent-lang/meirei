---
name: trading-plan-generator
description: "Algorithmic trading plan and investment mandate generator for OKX X Layer tokenized equities. Synthesizes risk profiles, investment horizons (Short-Term Momentum vs. Long-Term DCA), smart-money flow, and sentiment signals into deterministic, executable mandate rules."
license: MIT
metadata:
  author: meirei
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# Trading Plan Generator Skill

Generates autonomous, mathematically sound investment mandates and trade plans tailored for OKX X Layer tokenized equities and USDG cash reserves.

## Capabilities
- **Horizon & Risk Matrix**:
  - **Short-Term Momentum**: Alpha-seeking strategy exploiting technical breakouts, sentiment surges, and smart-money inflows with dynamic trailing stop protection.
  - **Long-Term Blue Chip DCA**: Quantitative Dollar Cost Averaging into mega-cap equities and index ETFs with 5% portfolio drift rebalance thresholds.
- **Dynamic Risk Calibration**:
  - **Conservative**: Capital preservation, heavy USDG/cash weighting (40-60%), low-beta equity anchors.
  - **Balanced**: Strategic growth across tech leaders and semiconductor infrastructure.
  - **Aggressive**: High-conviction alpha concentration with active volatility hedging.
- **Deterministic Mandate Syntax**: Outputs validated natural-language strings directly executable by Meirei's OKX DEX Aggregator session key validator on Chain 196.

## Usage in Meirei Advanced Mode
Drives the AI Advisory Studio, generates the Short-Term Momentum X/Y trajectory graph, and creates 1-click executable mandate directives.
