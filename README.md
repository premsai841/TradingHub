# Trading Hub

A free, open-source charting workspace with an incremental Pine Script-compatible runtime, historical bar replay, and a roadmap toward strategy testing.

> **Status: early prototype (0.1.0).** This project does not use TradingView's proprietary Pine runtime and does not claim full Pine Script compatibility.

## Current prototype

- Dark charting workspace built with React, TypeScript, Vite, and TradingView Lightweight Charts.
- Candlestick chart with BTCUSDT, ETHUSDT, and SOLUSDT symbol choices.
- Loads recent candles from Binance's public market-data endpoint; falls back to generated demo candles if the request fails.
- Pine-style editor with a first compatibility subset: `indicator()`, `input.int()`, `ta.ema()`, `ta.sma()`, `ta.crossover()`, `ta.crossunder()`, and `plot()`.
- Basic historical bar replay that reveals candles progressively.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/premsai841/TradingHub.git
cd TradingHub
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## First test script

The editor starts with an EMA crossover example. You can also paste:

```pine
//@version=5
indicator("Simple EMA", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "Fast EMA", color=color.aqua)
plot(slow, "Slow EMA", color=color.orange)
```

## Important limitations

- This is a deliberately small Pine-compatible subset, not a complete Pine compiler or TradingView clone.
- Many Pine constructs are not implemented yet: `request.security()`, arrays, loops, user-defined functions, labels/lines/boxes, most built-in indicators, and strategy order simulation.
- Bar Replay currently reveals the loaded candle series progressively. It is not yet a full TradingView-equivalent replay engine and does not yet simulate strategy orders.
- Binance public data is not a universal market-data feed. Availability, supported symbols, rate limits, and exchange terms apply. Demo candles are synthetic and must not be mistaken for live prices.
- Hosting can have a free tier, but market-data licensing, usage limits, and third-party service terms still apply.

## Roadmap

1. Expand the Pine parser/runtime and provide precise unsupported-feature errors.
2. Add on-chart buy/sell markers and indicator settings.
3. Add RSI, MACD, ATR, and additional built-ins.
4. Implement true sequential bar execution and replay controls.
5. Build a strategy engine with orders, fees, P&L, drawdown, and equity curve.
6. Add multi-timeframe data support and persistent layouts.

## Technology

- React + TypeScript + Vite
- [Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache-2.0; include required attribution when distributing)
- Binance public market-data endpoint (with synthetic demo fallback)

## Disclaimer

Trading Hub is an independent educational software project. It is not affiliated with, endorsed by, or sponsored by TradingView or Binance. Nothing in this project is investment advice.