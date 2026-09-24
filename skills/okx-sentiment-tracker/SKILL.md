---
name: okx-sentiment-tracker
description: "Real-time market sentiment tracker and social vibe monitor across OKX and X Layer ecosystems. Analyzes social volume, retail vs. institutional sentiment score (0-100), bullish/bearish consensus, and news impact for tokenized equities."
license: MIT
metadata:
  author: meirei
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Sentiment Tracker Skill

Provides real-time investor sentiment metrics, social sentiment scores, news catalyst indexing, and crowd bias telemetry for tokenized equities on OKX X Layer (Chain 196).

## Capabilities
- **Sentiment Index (0 - 100)**: Quantitative aggregate of social sentiment across X Layer tokenized equities.
  - 0–35: Extreme Fear / Defensive De-risking
  - 36–60: Neutral / Consolidation
  - 61–100: Bullish Accumulation / Strong Momentum
- **Asset Sentiment Distribution**: Specific sentiment breakdowns for allowlisted assets (NVDAx, AAPLx, MSFTx, TSLAx, GOOGLx, AMZNx, METAx, COINx, TSMx, etc.).
- **Catalyst Correlation**: Feeds sentiment shifts directly into AI advisory mandate generation and portfolio rebalancing thresholds.

## Usage in Meirei Advanced Mode
Feeds live sentiment indicators into the Institutional Advisory Studio and Advanced Market Table to calibrate rebalance frequencies and momentum targets.
