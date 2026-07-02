import { z } from 'zod';
import { applyCors } from './_cors.js';
import { fetchWithRetry } from './_fetch.js';
import { isValidAddress } from './_eth-utils.js';
import { CHAIN_NAMES, TOKEN_MAP } from './_chains.js';

// Lowercase-keyed, prototype-free copy of TOKEN_MAP: O(1) case-insensitive
// lookups, and upstream-supplied strings like "__proto__" can't hit inherited
// Object members.
const TOKEN_MAP_LOWER = Object.create(null);
for (const [addr, meta] of Object.entries(TOKEN_MAP)) {
  TOKEN_MAP_LOWER[addr.toLowerCase()] = meta;
}

const DepositRaw = z.object({
  depositTxHash:         z.string().nullish(),
  fillTx:                z.string().nullish(),
  fillTxHash:            z.string().nullish(),
  inputToken:            z.string().nullish(),
  sourceToken:           z.string().nullish(),
  outputToken:           z.string().nullish(),
  destinationToken:      z.string().nullish(),
  inputTokenSymbol:      z.string().nullish(),
  outputTokenSymbol:     z.string().nullish(),
  originChainId:         z.number().nullish(),
  sourceChainId:         z.number().nullish(),
  destinationChainId:    z.number().nullish(),
  destChainId:           z.number().nullish(),
  depositor:             z.string().nullish(),
  recipient:             z.string().nullish(),
  inputAmount:           z.string().nullish(),
  amount:                z.string().nullish(),
  outputAmount:          z.string().nullish(),
  depositBlockTimestamp: z.union([z.string(), z.number()]).nullish(),
  quoteTimestamp:        z.union([z.string(), z.number()]).nullish(),
  depositDate:           z.union([z.string(), z.number()]).nullish(),
  fillBlockTimestamp:    z.union([z.string(), z.number()]).nullish(),
  message:               z.string().nullish(),
  status:                z.string().nullish(),
  bridgeFeeUsd:          z.union([z.string(), z.number()]).nullish(),
  swapFeeUsd:            z.union([z.string(), z.number()]).nullish(),
}).passthrough();

const BRIDGE2 = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7'.toLowerCase();

function resolveToken(address, symbolHint) {
  // Try the token map first for precise symbol + decimals
  if (address) {
    const known = TOKEN_MAP_LOWER[address.toLowerCase()];
    if (known) return known;
  }
  // Use symbol from API response if available, with best-guess decimals
  if (symbolHint) {
    const upper = symbolHint.toUpperCase();
    const dec6 = ['USDC', 'USDT', 'USDC.E', 'USDS'];
    const dec8 = ['WBTC', 'TBTC'];
    return { symbol: symbolHint, decimals: dec6.includes(upper) ? 6 : dec8.includes(upper) ? 8 : 18 };
  }
  if (!address) return { symbol: 'ETH', decimals: 18 };
  return { symbol: address.slice(0, 6) + '…', decimals: 18 };
}

function formatAmount(raw, decimals) {
  if (!raw) return '0';
  try {
    const n = Number(BigInt(raw)) / 10 ** decimals;
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } catch {
    return '0';
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  const { address } = req.query;
  if (!address || !isValidAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  const url = `https://app.across.to/api/deposits?address=${address.toLowerCase()}&limit=25&status=filled`;
  let data = null;

  try {
    const response = await fetchWithRetry(url, { headers: { 'Accept': 'application/json' } }, { retries: 3, timeout: 8000 });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`${response.status}: ${errBody.slice(0, 200)}`);
    }
    data = await response.json();
  } catch (e) {
    console.error('Across deposits fetch failed:', e.message);
    return res.status(502).json({ error: 'Could not reach Across API', deposits: [] });
  }

  const rawItems = Array.isArray(data) ? data : (data.deposits || data.results || []);
  const rawDeposits = Array.isArray(rawItems) ? rawItems.reduce((acc, item) => {
    const r = DepositRaw.safeParse(item);
    if (r.success) acc.push(r.data);
    else console.warn('[transactions] Skipping malformed deposit:', r.error.issues?.[0]?.message);
    return acc;
  }, []) : [];

  function toMs(v) {
    if (!v) return 0;
    if (typeof v === 'string') { const t = new Date(v).getTime(); return isNaN(t) ? 0 : t; }
    return v > 1e12 ? v : v * 1000;
  }

  const deposits = rawDeposits.map(d => {
    const inToken = resolveToken(d.inputToken || d.sourceToken, d.inputTokenSymbol);
    const outToken = resolveToken(d.outputToken || d.destinationToken, d.outputTokenSymbol);
    const fromChainId = d.originChainId || d.sourceChainId;
    const toChainId = d.destinationChainId || d.destChainId;
    const recipient = (d.recipient || '').toLowerCase();
    let toChain = toChainId == null ? 'Unknown chain' : (CHAIN_NAMES[toChainId] || `Chain ${toChainId}`);
    if (recipient === BRIDGE2) toChain = 'Hyperliquid';

    const inputAmt = formatAmount(d.inputAmount || d.amount, inToken.decimals);
    const outputAmt = formatAmount(d.outputAmount, outToken.decimals);

    const depositMs = toMs(d.depositBlockTimestamp) || toMs(d.quoteTimestamp) || toMs(d.depositDate) || 0;
    const fillMs = toMs(d.fillBlockTimestamp) || 0;
    const fillDuration = (fillMs && depositMs && fillMs > depositMs) ? Math.round((fillMs - depositMs) / 1000) : null;

    // Detect Sage transactions via deposit message metadata
    const isSage = !!(d.message && d.message !== '0x');

    const bridgeFee = parseFloat(d.bridgeFeeUsd);
    const swapFee = parseFloat(d.swapFeeUsd);
    const hasFeeData = Number.isFinite(bridgeFee) || Number.isFinite(swapFee);

    return {
      type: 'bridge',
      depositTxHash: d.depositTxHash || null,
      fillTxHash: d.fillTx || d.fillTxHash || null,
      fromToken: inToken.symbol,
      toToken: outToken.symbol,
      amount: inputAmt,
      outputAmount: outputAmt,
      fromChain: fromChainId == null ? 'Unknown chain' : (CHAIN_NAMES[fromChainId] || `Chain ${fromChainId}`),
      toChain,
      fromChainId,
      toChainId,
      depositor: d.depositor || null,
      recipient: d.recipient || null,
      timestamp: depositMs,
      fillDuration,
      status: d.status || 'filled',
      bridgeFeeUsd: d.bridgeFeeUsd ?? null,
      swapFeeUsd: d.swapFeeUsd ?? null,
      totalFeeUsd: hasFeeData ? (Number.isFinite(bridgeFee) ? bridgeFee : 0) + (Number.isFinite(swapFee) ? swapFee : 0) : null,
      isSage,
    };
  });

  deposits.sort((a, b) => b.timestamp - a.timestamp);

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.json({ deposits });
}
