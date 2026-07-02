/**
 * Proxies Across Protocol available-routes, swap/chains, and swap/tokens.
 * GET /api/routes → { chains, tokens, routes }
 */
import { z } from 'zod';
import { applyCors } from './_cors.js';
import { fetchWithRetry } from './_fetch.js';
import { AcrossChain, AcrossToken, parseArr } from './_across-schemas.js';

const AcrossRoute = z.object({
  originChainId:          z.number(),
  destinationChainId:     z.number(),
  originToken:            z.string(),
  destinationToken:       z.string().optional(),
  originTokenSymbol:      z.string().optional(),
  destinationTokenSymbol: z.string().optional(),
}).passthrough();

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  try {
    // retries: 2 keeps the worst case inside the serverless duration budget.
    const [chainsRes, tokensRes, routesRes] = await Promise.all([
      fetchWithRetry('https://app.across.to/api/swap/chains', {}, { retries: 2, timeout: 4000 }),
      fetchWithRetry('https://app.across.to/api/swap/tokens', {}, { retries: 2, timeout: 4000 }),
      fetchWithRetry('https://app.across.to/api/available-routes', {}, { retries: 2, timeout: 8000 }),
    ]);

    const [chains, tokens, routes] = await Promise.all([
      chainsRes.ok ? chainsRes.json() : [],
      tokensRes.ok ? tokensRes.json() : [],
      routesRes.ok ? routesRes.json() : [],
    ]);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.json({
      chains: parseArr(AcrossChain, chains, 'routes:chain'),
      tokens: parseArr(AcrossToken, tokens, 'routes:token'),
      routes: parseArr(AcrossRoute, routes, 'routes:route'),
    });
  } catch (e) {
    console.error('routes error:', e.message);
    return res.status(502).json({ error: 'Failed to fetch Across routes' });
  }
}
