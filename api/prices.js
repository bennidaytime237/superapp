export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const ids = 'ethereum,bitcoin,usd-coin,dai,wrapped-bitcoin,matic-network,binancecoin,uma,across-protocol,pooltogether-v2,havven';
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.json(data);
  } catch (e) {
    console.error('CoinGecko error:', e.message);
    // Fallback — returned with 503 so frontend knows it's stale
    res.status(503);
    return res.json({
      ethereum:           { usd: 2500, usd_24h_change: 0 },
      bitcoin:            { usd: 90000, usd_24h_change: 0 },
      'usd-coin':         { usd: 1.00, usd_24h_change: 0 },
      dai:                { usd: 1.00, usd_24h_change: 0 },
      'wrapped-bitcoin':  { usd: 90000, usd_24h_change: 0 },
      'matic-network':    { usd: 0.40, usd_24h_change: 0 },
      binancecoin:        { usd: 600, usd_24h_change: 0 },
      uma:                { usd: 2.50, usd_24h_change: 0 },
      'across-protocol':  { usd: 0.30, usd_24h_change: 0 },
      'pooltogether-v2':  { usd: 1.00, usd_24h_change: 0 },
      havven:             { usd: 2.00, usd_24h_change: 0 },
    });
  }
}
