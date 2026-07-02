# Sage

Unified crypto superapp combining crosschain bridging, payments, and gas distribution — all in one interface.

## Architecture

```
public/               Static frontend (deployed to Vercel)
  index.html          Dashboard — balances, assets, activity feed
  bridge.html         Bridge (Across) interface with optional gas top-up
  transfer.html       Combined Bridge / Send / Receive / Deposit page
  send.html           Send a token to another wallet / ENS (bridge-first optional)
  request.html        Generate a shareable payment request link
  payments.html       Pay a request link or create one
  gas.html            Gas top-up — distribute gas across chains
  sweep.html          Batch-bridge all dust balances to one chain
  transactions.html   Full transaction history with explorer links
  radar.html          Network-wide Across activity feed
  hyperliquid.html    Deposit to Hyperliquid (temporarily disabled)
  polymarket.html     Deposit to Polymarket
  info.html           How it works / FAQ
  brand.html          Brand assets and downloadable brand kit
  config.js           Shared chain/token/explorer metadata + helpers
  wallet.js           Shared wallet connection, click delegation, caching
  safe-dom.js         XSS-safe HTML templating (window.Safe)
  eth-utils.js        Keccak-256 + EIP-55 address validation (browser copy)
  theme.css / theme.js  Shared theme tokens + dark/light toggle

api/                  Vercel serverless functions
  _cors.js            Shared CORS + OPTIONS helper (allowlist via ALLOWED_ORIGINS)
  _fetch.js           Shared fetch with timeout + retry
  _chains.js          Chain/RPC/token metadata (single source of truth)
  _eth-utils.js       Keccak-256 + EIP-55 address validation (ESM copy)
  _across-schemas.js  Shared Zod schemas for Across API payloads
  balances.js         Multi-chain balance fetcher (17 chains, batched JSON-RPC, fallback RPCs)
  bridge-times.js     Representative bridge-time estimates via Across
  ens.js              ENS / Hyperliquid-name forward & reverse resolution
  prices.js           CoinGecko price proxy with DeFi Llama fallback
  radar.js            Network-wide Across deposit feed
  routes.js           Across Protocol route/chain/token proxy
  transactions.js     User transaction history via Across deposits API
```

## Integrations

- **Across Protocol** — crosschain bridging via `/swap/approval` API, ~2s fills
- **Polymarket** — deposits via Across to a user-supplied Polymarket deposit address
- **Hyperliquid** — name resolution (`.hl`); deposits are disabled pending a proper
  embedded-actions integration (a plain bridge to Bridge2 does not credit the user)

## Supported Chains

Ethereum, Arbitrum, Base, Optimism, Polygon, BNB Chain, zkSync Era, Linea, Mode, Lisk, World Chain, Blast, Scroll, Zora, Unichain, Ink, Soneium, HyperEVM, Lens

## Development

```bash
npm install
npm run build   # rebuilds public/tailwind.output.css
npm test        # node --test tests/*.test.js
```

## Configuration

Optional environment variables (set in Vercel project settings):

- `ALLOWED_ORIGINS` — comma-separated list of origins permitted to call the API cross-origin. Leave unset to restrict to same-origin only.

## Deploy

```bash
vercel
```

Static files served from `public/`, serverless functions from `api/`. The Tailwind CSS is rebuilt on deploy via `npm run build` (see `vercel.json`). Security headers (CSP, HSTS, X-Frame-Options, etc.) are configured in `vercel.json`.
