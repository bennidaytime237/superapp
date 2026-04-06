const COINGECKO_IDS = 'ethereum,bitcoin,usd-coin,dai,wrapped-bitcoin,matic-network,binancecoin,uma,across-protocol,pooltogether-v2,havven';

async function fetchCoinGecko(signal) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function fetchDeFiLlama(signal) {
  // DeFi Llama has no rate limits and returns current prices
  const coins = [
    'coingecko:ethereum',
    'coingecko:bitcoin',
    'coingecko:matic-network',
    'coingecko:wrapped-bitcoin',
    'coingecko:binancecoin',
    'coingecko:uma',
    'coingecko:across-protocol',
  ].join(',');
  const res = await fetch(`https://coins.llama.fi/prices/current/${coins}`, { signal });
  if (!res.ok) throw new Error(`DeFiLlama ${res.status}`);
  const data = await res.json();
  // Normalize to CoinGecko format
  const out = {
    'usd-coin': { usd: 1, usd_24h_change: 0 },
    dai: { usd: 1, usd_24h_change: 0 },
  };
  const map = {
    'coingecko:ethereum': 'ethereum',
    'coingecko:bitcoin': 'bitcoin',
    'coingecko:matic-network': 'matic-network',
    'coingecko:wrapped-bitcoin': 'wrapped-bitcoin',
    'coingecko:binancecoin': 'binancecoin',
    'coingecko:uma': 'uma',
    'coingecko:across-protocol': 'across-protocol',
  };
  for (const [key, id] of Object.entries(map)) {
    const coin = data.coins?.[key];
    if (coin) {
      out[id] = { usd: coin.price || 0, usd_24h_change: coin.confidence ? 0 : 0 };
    }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  // Try CoinGecko first, fall back to DeFi Llama
  try {
    const data = await fetchCoinGecko(ctrl.signal);
    clearTimeout(t);
    return res.json(data);
  } catch (e) {
    console.warn('CoinGecko failed:', e.message, '— trying DeFi Llama');
  }

  try {
    const data = await fetchDeFiLlama(ctrl.signal);
    clearTimeout(t);
    return res.json(data);
  } catch (e) {
    console.warn('DeFi Llama failed:', e.message, '— using hardcoded fallback');
  }

  clearTimeout(t);
  // Last resort hardcoded fallback
  return res.status(503).json({
    ethereum:           { usd: 2500, usd_24h_change: 0 },
    bitcoin:            { usd: 90000, usd_24h_change: 0 },
    'usd-coin':         { usd: 1.00, usd_24h_change: 0 },
    dai:                { usd: 1.00, usd_24h_change: 0 },
    'wrapped-bitcoin':  { usd: 90000, usd_24h_change: 0 },
    'matic-network':    { usd: 0.40, usd_24h_change: 0 },
    binancecoin:        { usd: 600, usd_24h_change: 0 },
    uma:                { usd: 2.50, usd_24h_change: 0 },
    'across-protocol':  { usd: 0.30, usd_24h_change: 0 },
  });
}
