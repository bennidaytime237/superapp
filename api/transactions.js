import { z } from 'zod';
import { applyCors } from './_cors.js';
import { isValidAddress } from './_eth-utils.js';
import { CHAIN_NAMES, TOKEN_MAP } from './_chains.js';

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
  // Try TOKEN_MAP first for precise symbol + decimals
  if (address) {
    if (TOKEN_MAP[address]) return TOKEN_MAP[address];
    const lower = address.toLowerCase();
    for (const [k, v] of Object.entries(TOKEN_MAP)) {
      if (k.toLowerCase() === lower) return v;
    }
  }
  // Use symbol from API response if available, with best-guess decimals
  if (symbolHint) {
    const upper = symbolHint.toUpperCase();
    const dec6 = ['USDC', 'USDT', 'USDC.E', 'USDC.e', 'USDS'];
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
  let lastErr = null;

  // Retry with backoff on 429
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const response = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(t);
      if (response.status === 429) {
        lastErr = `429 rate limited (attempt ${attempt + 1})`;
        continue;
      }
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        lastErr = `${response.status}: ${errBody.slice(0, 200)}`;
        break;
      }
      data = await response.json();
      break;
    } catch (e) {
      lastErr = e.message;
    }
  }

  if (!data) {
    console.error('All Across endpoints failed. Last error:', lastErr);
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
    let toChain = CHAIN_NAMES[toChainId] || `Chain ${toChainId}`;
    if (recipient === BRIDGE2) toChain = 'Hyperliquid';

    const inputAmt = formatAmount(d.inputAmount || d.amount, inToken.decimals);
    const outputAmt = formatAmount(d.outputAmount, outToken.decimals);
    const inputNum = parseFloat((inputAmt || '0').replace(/,/g, ''));
    const outputNum = parseFloat((outputAmt || '0').replace(/,/g, ''));

    const depositMs = toMs(d.depositBlockTimestamp) || toMs(d.quoteTimestamp) || toMs(d.depositDate) || 0;
    const fillMs = toMs(d.fillBlockTimestamp) || 0;
    const fillDuration = (fillMs && depositMs && fillMs > depositMs) ? Math.round((fillMs - depositMs) / 1000) : null;

    // Detect Sage transactions via depositor metadata or known patterns
    const isSage = !!(d.message && d.message !== '0x') || false;

    return {
      type: 'bridge',
      depositTxHash: d.depositTxHash || null,
      fillTxHash: d.fillTx || d.fillTxHash || null,
      fromToken: inToken.symbol,
      toToken: outToken.symbol,
      amount: inputAmt,
      outputAmount: outputAmt,
      fromChain: CHAIN_NAMES[fromChainId] || `Chain ${fromChainId}`,
      toChain,
      fromChainId,
      toChainId,
      depositor: d.depositor || null,
      recipient: d.recipient || null,
      timestamp: depositMs,
      fillDuration,
      status: d.status || 'filled',
      bridgeFeeUsd: d.bridgeFeeUsd || null,
      swapFeeUsd: d.swapFeeUsd || null,
      totalFeeUsd: ((parseFloat(d.bridgeFeeUsd)||0) + (parseFloat(d.swapFeeUsd)||0)) || null,
      isSage,
    };
  });

  deposits.sort((a, b) => b.timestamp - a.timestamp);

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.json({ deposits });
}
