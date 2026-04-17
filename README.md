# Sage

Unified crypto superapp combining crosschain bridging, same-chain swaps, fiat on/off ramps, and gas distribution — all in one interface.

## Architecture

```
public/               Static frontend (deployed to Vercel)
  index.html          Dashboard — balances, assets, activity feed
  swap.html           Swap (Uniswap) & Bridge (Across) interface
  send.html           Send a token to another wallet / ENS
  request.html        Generate a shareable payment request link
  payments.html       Buy & Sell crypto via MoonPay
  gas.html            Gas top-up — distribute gas across chains
  sweep.html          Batch-bridge all dust balances to one chain
  transactions.html   Full transaction history with explorer links
  radar.html          Network-wide Across activity feed
  hyperliquid.html    Deposit to Hyperliquid via Across
  polymarket.html     Deposit to Polymarket
  theme.css / theme.js  Shared theme tokens + dark/light toggle

api/                  Vercel serverless functions
  _cors.js            Shared CORS + OPTIONS helper (allowlist via ALLOWED_ORIGINS)
  balances.js         Multi-chain balance fetcher (17 chains, fallback RPCs)
  bridge-times.js     Representative bridge-time estimates via Across
  ens.js              ENS forward/reverse resolution
  prices.js           CoinGecko price proxy with DeFi Llama fallback
  radar.js            Network-wide Across deposit feed
  routes.js           Across Protocol route/chain/token proxy
  transactions.js     User transaction history via Across deposits API
```

## Integrations

- **Across Protocol** — crosschain bridging via `/swap/approval` API, ~2s fills
- **Uniswap Universal Router v2** — same-chain swaps via on-chain QuoterV2 quotes
- **MoonPay** — fiat on/off ramps via buy widget
- **Hyperliquid** — deposits via Across embedded actions to Bridge2 contract
- **Polymarket** — deposits via Across

## Supported Chains

Ethereum, Arbitrum, Base, Optimism, Polygon, BNB Chain, zkSync Era, Linea, Mode, Lisk, World Chain, Blast, Scroll, Zora, Unichain, Ink, Soneium, HyperEVM, Lens

## Configuration

Optional environment variables (set in Vercel project settings):

- `ALLOWED_ORIGINS` — comma-separated list of origins permitted to call the API cross-origin. Leave unset to restrict to same-origin only.

## Deploy

```bash
vercel
```

Static files served from `public/`, serverless functions from `api/`. No build step required. Security headers (CSP, HSTS, X-Frame-Options, etc.) are configured in `vercel.json`.
