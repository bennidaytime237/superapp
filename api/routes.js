/**
 * Proxies Across Protocol available-routes, swap/chains, and swap/tokens.
 * GET /api/routes → { chains, tokens, routes }
 */
import { applyCors } from './_cors.js';

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
    return res.json({ chains, tokens, routes });
  } catch (e) {
    console.error('routes error:', e.message);
    return res.status(502).json({ error: 'Failed to fetch Across routes' });
  }
}
