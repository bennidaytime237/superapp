import { z } from 'zod';
import { applyCors } from './_cors.js';
import { fetchWithRetry } from './_fetch.js';
import { AcrossChain, AcrossToken, parseArr } from './_across-schemas.js';

const AcrossDeposit = z.object({
  depositId:             z.union([z.string(), z.number()]).nullish(),
  depositTxHash:         z.string().nullish(),
  fillTxHash:            z.string().nullish(),
  status:                z.string().nullish(),
  originChainId:         z.number().nullish(),
  destinationChainId:    z.number().nullish(),
  inputToken:            z.string().nullish(),
  outputToken:           z.string().nullish(),
  inputAmount:           z.string().nullish(),
  outputAmount:          z.string().nullish(),
  depositor:             z.string().nullish(),
  recipient:             z.string().nullish(),
  depositBlockTimestamp: z.union([z.string(), z.number()]).nullish(),
  fillBlockTimestamp:    z.union([z.string(), z.number()]).nullish(),
}).passthrough();

const BASE_URL = 'https://app.across.to/api';

let cache = { chains: null, tokens: null, deposits: null, ts: 0 };
const CACHE_TTL = 30000; // 30s

// Same shape for fresh, warm-cache, and stale-fallback responses.
function payload() {
  return { chains: cache.chains, tokens: cache.tokens, deposits: cache.deposits };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  const now = Date.now();
  if (cache.deposits && now - cache.ts < CACHE_TTL) {
    return res.json(payload());
  }

  try {
    // retries: 2 keeps the worst case inside the serverless duration budget.
    const [chainsRes, tokensRes, depositsRes] = await Promise.all([
      fetchWithRetry(`${BASE_URL}/swap/chains`, {}, { retries: 2, timeout: 4000 }),
      fetchWithRetry(`${BASE_URL}/swap/tokens`, {}, { retries: 2, timeout: 4000 }),
      fetchWithRetry(`${BASE_URL}/deposits?limit=200`, {}, { retries: 2, timeout: 8000 }),
    ]);

    if (!chainsRes.ok || !tokensRes.ok || !depositsRes.ok) {
      throw new Error(`API error: chains=${chainsRes.status} tokens=${tokensRes.status} deposits=${depositsRes.status}`);
    }

    const [chains, tokens, deposits] = await Promise.all([
      chainsRes.json(),
      tokensRes.json(),
      depositsRes.json(),
    ]);

    const rawDeposits = Array.isArray(deposits) ? deposits : (deposits?.deposits || []);
    cache = {
      chains:   parseArr(AcrossChain,   chains,      'radar:chain'),
      tokens:   parseArr(AcrossToken,   tokens,      'radar:token'),
      deposits: parseArr(AcrossDeposit, rawDeposits, 'radar:deposit'),
      ts: now,
    };
    return res.json(payload());
  } catch (e) {
    console.error('Radar API error:', e.message);
    // Return stale cache if available
    if (cache.deposits) return res.json(payload());
    return res.status(502).json({ error: 'Upstream fetch failed' });
  }
}
