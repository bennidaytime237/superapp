export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const ids = 'ethereum,bitcoin,usd-coin,dai,wrapped-bitcoin';
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.json(data);
  } catch (e) {
    // Fallback prices if CoinGecko is down
    return res.json({
      ethereum:        { usd: 2842.12, usd_24h_change: 4.2 },
      bitcoin:         { usd: 94212.45, usd_24h_change: 1.8 },
      'usd-coin':      { usd: 1.00,  usd_24h_change: 0.01 },
      dai:             { usd: 1.00,  usd_24h_change: 0.00 },
      'wrapped-bitcoin':{ usd: 94212.45, usd_24h_change: 1.8 },
    });
  }
}
