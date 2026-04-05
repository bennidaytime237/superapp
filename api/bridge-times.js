const BASE = 'https://app.across.to/api/suggested-fees';

// Representative routes for each category
const ROUTES = [
  { label: 'L1 → L1', originChainId: 1, destinationChainId: 1,
    inputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    outputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1000000000' }, // 1000 USDC
  { label: 'L1 → L2', originChainId: 1, destinationChainId: 42161,
    inputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    outputToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: '1000000000' },
  { label: 'L2 → L1', originChainId: 42161, destinationChainId: 1,
    inputToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    outputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1000000000' },
  { label: 'L2 → L2', originChainId: 8453, destinationChainId: 42161,
    inputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    outputToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    amount: '1000000000' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  const result = {};

  await Promise.all(ROUTES.map(async (route) => {
    try {
      const params = new URLSearchParams({
        inputToken: route.inputToken,
        outputToken: route.outputToken,
        originChainId: route.originChainId,
        destinationChainId: route.destinationChainId,
        amount: route.amount,
      });
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`${BASE}?${params}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) { result[route.label] = null; return; }
      const data = await r.json();
      // Log first response to discover field names
      if (route.label === 'L1 → L2') {
        console.log('suggested-fees keys:', Object.keys(data));
        console.log('suggested-fees sample:', JSON.stringify(data).slice(0, 500));
      }
      // Try known field names for estimated fill time
      const secs = data.estimatedFillTimeSec
        || data.estimatedFillTime
        || data.expectedFillTimeSec
        || data.expectedFillTime
        || data.fillTime
        || data.estimatedTime
        || null;
      result[route.label] = secs;
    } catch (e) {
      result[route.label] = null;
    }
  }));

  return res.json(result);
}
