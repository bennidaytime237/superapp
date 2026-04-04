# Sage

Unified crypto superapp combining crosschain bridging, same-chain swaps, fiat on/off ramps, and gas distribution — all in one interface.

## Architecture

```
public/               Static frontend (deployed to Vercel)
  index.html          Dashboard — balances, assets, activity feed
  swap.html           Swap (Uniswap) & Bridge (Across) interface
  buysell.html        Buy & Sell crypto via MoonPay
  gas.html            Gas top-up — distribute gas across chains
  transactions.html   Full transaction history with explorer links
  favicon.svg         Sage icon
  sage-logo.svg       Sage logo
  sage-wordmark.svg   Sage wordmark

api/                  Vercel serverless functions
  balances.js         Multi-chain balance fetcher (17 chains, fallback RPCs)
  prices.js           CoinGecko price proxy with fallback
  routes.js           Across Protocol route/chain/token proxy
  history.js          Block explorer queries for crossdevice tx history
```

## Integrations

- **Across Protocol** — crosschain bridging via `/swap/approval` API, ~2s fills
- **Uniswap Universal Router v2** — same-chain swaps via on-chain QuoterV2 quotes
- **MoonPay** — fiat on/off ramps via buy widget
- **Hyperliquid** — deposits via Across embedded actions to Bridge2 contract

## Supported Chains

Ethereum, Arbitrum, Base, Optimism, Polygon, BNB Chain, zkSync Era, Linea, Mode, Lisk, World Chain, Blast, Scroll, Zora, Unichain, Ink, Soneium, HyperEVM, Lens

## Deploy

```bash
vercel
```

Static files served from `public/`, serverless functions from `api/`. No build step required.
