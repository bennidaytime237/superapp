import { z } from 'zod';
import { applyCors } from './_cors.js';

const AcrossChain = z.object({
  chainId:     z.number(),
  name:        z.string().optional(),
  logoURI:     z.string().nullish(),
  explorerUrl: z.string().nullish(),
}).passthrough();

const AcrossToken = z.object({
  symbol:   z.string(),
  chainId:  z.number().optional(),
  address:  z.string().optional(),
  decimals: z.number().optional(),
  logoURI:  z.string().nullish(),
}).passthrough();

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

function parseArr(schema, data, label) {
  if (!Array.isArray(data)) return [];
  return data.reduce((acc, item) => {
    const r = schema.safeParse(item);
    if (r.success) acc.push(r.data);
    else console.warn(`[radar] Malformed ${label}:`, r.error.issues?.[0]?.message);
    return acc;
  }, []);
}

const BASE_URL = 'https://app.across.to/api';

let cache = { chains: null, tokens: null, deposits: null, ts: 0 };
const CACHE_TTL = 30000; // 30s

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  const now = Date.now();
  if (cache.deposits && now - cache.ts < CACHE_TTL) {
    return res.json(cache);
  }

  try {
    const [chainsRes, tokensRes, depositsRes] = await Promise.all([
      fetch(`${BASE_URL}/swap/chains`, { next: { revalidate: 300 } }),
      fetch(`${BASE_URL}/swap/tokens`, { next: { revalidate: 300 } }),
      fetch(`${BASE_URL}/deposits?limit=200`, { next: { revalidate: 30 } }),
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
    const validChains   = parseArr(AcrossChain,   chains,      'chain');
    const validTokens   = parseArr(AcrossToken,   tokens,      'token');
    const validDeposits = parseArr(AcrossDeposit, rawDeposits, 'deposit');
    cache = { chains: validChains, tokens: validTokens, deposits: validDeposits, ts: now };
    return res.json({ chains: validChains, tokens: validTokens, deposits: validDeposits });
  } catch (e) {
    console.error('Radar API error:', e.message);
    // Return stale cache if available
    if (cache.deposits) return res.json(cache);
    return res.status(502).json({ error: 'Upstream fetch failed' });
  }
}
