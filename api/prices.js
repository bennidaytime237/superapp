import { z } from 'zod';
import { applyCors } from './_cors.js';
import { fetchWithRetry } from './_fetch.js';

const CoinEntry = z.object({
  usd: z.number(),
  usd_24h_change: z.number().optional(),
}).passthrough();

const LlamaCoin = z.object({
  price:      z.number(),
  confidence: z.number().optional(),
  timestamp:  z.number().optional(),
}).passthrough();

// Single canonical id list — CoinGecko, the DeFi Llama fallback, and the
// hardcoded last resort must all serve the same keys so clients never see a
// key vanish just because a different source answered.
const COIN_IDS = [
  'ethereum', 'bitcoin', 'usd-coin', 'dai', 'wrapped-bitcoin', 'matic-network',
  'polygon-ecosystem-token', 'binancecoin', 'uma', 'across-protocol',
  'pooltogether-v2', 'havven',
];

// Last-resort prices, deliberately conservative. Stables are exact; everything
// else is only shown if both live sources are down (served with 503).
const FALLBACK_PRICES = {
  ethereum:                  { usd: 2500, usd_24h_change: 0 },
  bitcoin:                   { usd: 90000, usd_24h_change: 0 },
  'usd-coin':                { usd: 1.00, usd_24h_change: 0 },
  dai:                       { usd: 1.00, usd_24h_change: 0 },
  'wrapped-bitcoin':         { usd: 90000, usd_24h_change: 0 },
  'matic-network':           { usd: 0.40, usd_24h_change: 0 },
  'polygon-ecosystem-token': { usd: 0.40, usd_24h_change: 0 },
  binancecoin:               { usd: 600, usd_24h_change: 0 },
  uma:                       { usd: 2.50, usd_24h_change: 0 },
  'across-protocol':         { usd: 0.30, usd_24h_change: 0 },
  'pooltogether-v2':         { usd: 0.50, usd_24h_change: 0 },
  havven:                    { usd: 1.00, usd_24h_change: 0 },
};

async function fetchCoinGecko() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_IDS.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetchWithRetry(url, {}, { retries: 1, timeout: 4000 });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const raw = await res.json();
  if (!raw || typeof raw !== 'object') throw new Error('CoinGecko returned non-object');
  const out = {};
  for (const [id, val] of Object.entries(raw)) {
    const r = CoinEntry.safeParse(val);
    if (r.success) out[id] = r.data;
    else console.warn('[prices] Skipping malformed CoinGecko entry:', id);
  }
  if (Object.keys(out).length === 0) throw new Error('CoinGecko response had no valid entries');
  return out;
}

async function fetchDeFiLlama() {
  // DeFi Llama has no rate limits and returns current prices (no 24h change).
  const coins = COIN_IDS.map(id => `coingecko:${id}`).join(',');
  const res = await fetchWithRetry(`https://coins.llama.fi/prices/current/${coins}`, {}, { retries: 1, timeout: 4000 });
  if (!res.ok) throw new Error(`DeFiLlama ${res.status}`);
  const data = await res.json();
  const rawCoins = data?.coins;
  if (!rawCoins || typeof rawCoins !== 'object') throw new Error('DeFiLlama missing coins object');
  // Normalize to CoinGecko format.
  const out = {};
  let parsed = 0;
  for (const id of COIN_IDS) {
    const r = LlamaCoin.safeParse(rawCoins[`coingecko:${id}`]);
    if (r.success) { out[id] = { usd: r.data.price, usd_24h_change: 0 }; parsed++; }
  }
  if (parsed === 0) throw new Error('DeFiLlama response had no valid entries');
  // Every canonical id must be present in every response shape — fill gaps
  // from the conservative fallback so clients never see a key vanish.
  for (const id of COIN_IDS) {
    if (!out[id]) out[id] = FALLBACK_PRICES[id];
  }
  return out;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  // Try CoinGecko first, fall back to DeFi Llama. Each source gets its own
  // timeout budget — a stalled CoinGecko must not poison the fallback attempt.
  try {
    return res.json(await fetchCoinGecko());
  } catch (e) {
    console.warn('CoinGecko failed:', e.message, '— trying DeFi Llama');
  }

  try {
    return res.json(await fetchDeFiLlama());
  } catch (e) {
    console.warn('DeFi Llama failed:', e.message, '— using hardcoded fallback');
  }

  return res.status(503).json(FALLBACK_PRICES);
}
