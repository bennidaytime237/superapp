/**
 * Proxies Across Protocol available-routes, swap/chains, and swap/tokens.
 * GET /api/routes → { chains, tokens, routes }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const [chainsRes, tokensRes, routesRes] = await Promise.all([
      fetch('https://app.across.to/api/swap/chains'),
      fetch('https://app.across.to/api/swap/tokens'),
      fetch('https://app.across.to/api/available-routes'),
    ]);

    const [chains, tokens, routes] = await Promise.all([
      chainsRes.ok ? chainsRes.json() : [],
      tokensRes.ok ? tokensRes.json() : [],
      routesRes.ok ? routesRes.json() : [],
    ]);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.json({ chains, tokens, routes });
  } catch (e) {
    console.error('routes error:', e);
    return res.status(500).json({ error: 'Failed to fetch Across routes' });
  }
}
