import { applyCors } from './_cors.js';
import { fetchWithRetry } from './_fetch.js';

const BASE = 'https://app.across.to/api/suggested-fees';

// Representative routes for each category
const ROUTES = [
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
  if (applyCors(req, res)) return;
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
      const r = await fetchWithRetry(`${BASE}?${params}`, {}, { retries: 2, timeout: 4000 });
      if (!r.ok) { result[route.label] = null; return; }
      const data = await r.json();
      // Try known field names for estimated fill time. Coerce to Number so
      // both numeric and numeric-string payloads work; a legitimate 0 must
      // not be dropped, and non-numeric values must not leak to clients.
      const fields = ['estimatedFillTimeSec', 'estimatedFillTime', 'expectedFillTimeSec', 'expectedFillTime', 'fillTime', 'estimatedTime'];
      const secs = fields
        .map(k => data[k])
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(Number)
        .find(Number.isFinite);
      result[route.label] = secs ?? null;
    } catch (e) {
      result[route.label] = null;
    }
  }));

  return res.json(result);
}
