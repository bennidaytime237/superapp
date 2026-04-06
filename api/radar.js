const BASE_URL = 'https://app.across.to/api';

let cache = { chains: null, tokens: null, deposits: null, ts: 0 };
const CACHE_TTL = 30000; // 30s

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

    cache = { chains, tokens, deposits, ts: now };
    return res.json({ chains, tokens, deposits });
  } catch (e) {
    console.error('Radar API error:', e.message);
    // Return stale cache if available
    if (cache.deposits) return res.json(cache);
    return res.status(502).json({ error: e.message });
  }
}
