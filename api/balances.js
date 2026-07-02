import { applyCors } from './_cors.js';
import { isValidAddress } from './_eth-utils.js';
import { RPC_LIST, CHAIN_TOKENS as TOKENS } from './_chains.js';

// ERC-20 balanceOf selector: keccak256("balanceOf(address)")[0:4] = 0x70a08231
function encodeBalanceOf(address) {
  const addr = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0x70a08231' + addr;
}

/**
 * Sends one JSON-RPC batch (all token queries for a chain in a single POST),
 * trying each RPC URL in order. Results from multiple URLs are merged so a
 * primary RPC that answers only part of the batch (rate limits, disabled
 * methods) still gets its gaps filled by the fallback URLs — matching the
 * per-token fallback behavior of the previous implementation.
 * @param {string[]} urls
 * @param {Array<{jsonrpc: string, id: number, method: string, params: unknown[]}>} batch
 * @returns {Promise<Map<number, string> | null>} id → result hex, or null if every RPC failed
 */
async function rpcBatch(urls, batch) {
  const byId = new Map();
  for (const url of urls) {
    const missing = batch.filter(req => !byId.has(req.id));
    if (missing.length === 0) break;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missing),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!Array.isArray(json)) {
        console.warn(`RPC batch from ${url} returned non-array:`, json?.error?.message || typeof json);
        continue;
      }
      for (const entry of json) {
        if (entry && entry.result !== undefined) byId.set(entry.id, entry.result);
        else if (entry?.error) console.warn(`RPC error from ${url} (id ${entry?.id}):`, entry.error.message);
      }
    } catch (e) {
      console.warn(`RPC failed ${url}:`, e.message);
    } finally {
      clearTimeout(timeout);
    }
  }
  return byId.size > 0 ? byId : null;
}

function fromHex(hex, decimals) {
  if (!hex || hex === '0x' || hex === '0x0') return 0;
  const raw = BigInt(hex);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  return Number(whole) + Number(frac) / 10 ** decimals;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  const { address } = req.query;
  if (!address || !isValidAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  const results = {};
  let anyChainFailed = false;

  await Promise.all(
    Object.entries(RPC_LIST).map(async ([chainIdStr, rpcUrls]) => {
      const chainId = Number(chainIdStr);
      const tokens = TOKENS[chainId] || [];
      if (tokens.length === 0) return;

      const batch = tokens.map((token, i) => ({
        jsonrpc: '2.0',
        id: i,
        method: token.address ? 'eth_call' : 'eth_getBalance',
        params: token.address
          ? [{ to: token.address, data: encodeBalanceOf(address) }, 'latest']
          : [address, 'latest'],
      }));

      const byId = await rpcBatch(rpcUrls, batch);
      if (!byId) {
        // Every RPC for this chain failed — that is NOT a zero balance; flag it
        // so the response isn't edge-cached as if it were.
        anyChainFailed = true;
        return;
      }

      const chainBalances = {};
      tokens.forEach((token, i) => {
        try {
          const raw = byId.get(i);
          // A single token erroring on every RPC is skipped (like the previous
          // per-token implementation) — only a fully unreadable chain (byId
          // null above) disables caching.
          if (raw === undefined) return;
          const amount = fromHex(raw, token.decimals);
          if (amount > 0) chainBalances[token.symbol] = amount;
        } catch (e) {
          console.warn(`Balance parse failed for ${token.symbol} on chain ${chainId}:`, e.message);
        }
      });

      if (Object.keys(chainBalances).length > 0) {
        results[chainId] = chainBalances;
      }
    })
  );

  // Partial results (an entire chain unreadable) must not be served from cache
  // for 40s — a wallet showing $0 on transient RPC failure is a bad lie.
  res.setHeader(
    'Cache-Control',
    anyChainFailed ? 'no-store' : 's-maxage=10, stale-while-revalidate=30'
  );
  return res.json(results);
}
