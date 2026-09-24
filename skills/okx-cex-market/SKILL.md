---
name: okx-cex-market
description: "OKX CEX and X Layer market price feed, 24h ticker metrics, liquidity depth, orderbook spread, and volatility index for tokenized equities and stablecoins."
license: MIT
metadata:
  author: meirei
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX CEX Market Skill

Provides deep market data feeds, multi-timeframe volatility estimates, orderbook depth metrics, and 24h volume tracking for OKX X Layer tokenized equities.

## Capabilities
- **24h Ticker & Volatility**: Live tracking of spot price, 24h high/low, and 30-day annualized volatility.
- **Liquidity Depth & Spread**: Bid/ask spread verification and liquidity depth to prevent slippage on rebalance trades.
- **Price Trend Invariants**: Feeds reliable price telemetry to mandate execution guards and OKX DEX Aggregator quotes.

## Usage in Meirei Advanced Mode
Feeds live market metrics into the Advanced Market Table, candlestick charts, and the momentum trajectory projection model.
