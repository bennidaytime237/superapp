/**
 * Proxies Across Protocol available-routes, swap/chains, and swap/tokens.
 * GET /api/routes → { chains, tokens, routes }
 */
import { z } from 'zod';
import { applyCors } from './_cors.js';

const AcrossChain = z.object({
  chainId:  z.number(),
  name:     z.string().optional(),
  logoURI:  z.string().nullish(),
}).passthrough();

const AcrossToken = z.object({
  symbol:   z.string(),
  chainId:  z.number().optional(),
  address:  z.string().optional(),
  decimals: z.number().optional(),
  logoURI:  z.string().nullish(),
}).passthrough();

const AcrossRoute = z.object({
  originChainId:          z.number(),
  destinationChainId:     z.number(),
  originToken:            z.string(),
  destinationToken:       z.string().optional(),
  originTokenSymbol:      z.string().optional(),
  destinationTokenSymbol: z.string().optional(),
}).passthrough();

function parseArr(schema, data) {
  if (!Array.isArray(data)) return [];
  return data.reduce((acc, item) => {
    const r = schema.safeParse(item);
    if (r.success) acc.push(r.data);
    return acc;
  }, []);
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const opts = { signal: controller.signal };

    const [chainsRes, tokensRes, routesRes] = await Promise.all([
      fetch('https://app.across.to/api/swap/chains', opts),
      fetch('https://app.across.to/api/swap/tokens', opts),
      fetch('https://app.across.to/api/available-routes', opts),
    ]);
    clearTimeout(timeout);

    const [chains, tokens, routes] = await Promise.all([
      chainsRes.ok ? chainsRes.json() : [],
      tokensRes.ok ? tokensRes.json() : [],
      routesRes.ok ? routesRes.json() : [],
    ]);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.json({
      chains: parseArr(AcrossChain, chains),
      tokens: parseArr(AcrossToken, tokens),
      routes: parseArr(AcrossRoute, routes),
    });
  } catch (e) {
    console.error('routes error:', e.message);
    return res.status(502).json({ error: 'Failed to fetch Across routes' });
  }
}
