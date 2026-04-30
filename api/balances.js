import { applyCors } from './_cors.js';
import { isValidAddress } from './_eth-utils.js';
import { RPC_LIST, CHAIN_TOKENS as TOKENS } from './_chains.js';

// ERC-20 balanceOf selector: keccak256("balanceOf(address)")[0:4] = 0x70a08231
function encodeBalanceOf(address) {
  const addr = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0x70a08231' + addr;
}

async function rpc(urls, method, params) {
  // Try each RPC until one works
  if (typeof urls === 'string') urls = [urls];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json();
      if (json.result !== undefined) return json.result;
      if (json.error) console.warn(`RPC error from ${url}:`, json.error.message);
    } catch (e) {
      console.warn(`RPC failed ${url}:`, e.message);
    }
  }
  return null;
}

function fromHex(hex, decimals) {
  if (!hex || hex === '0x' || hex === '0x0' || hex === null) return 0;
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

  await Promise.all(
    Object.entries(RPC_LIST).map(async ([chainIdStr, rpcUrls]) => {
      const chainId = Number(chainIdStr);
      const tokens = TOKENS[chainId] || [];
      const chainBalances = {};

      await Promise.all(tokens.map(async (token) => {
        try {
          let raw;
          if (!token.address) {
            raw = await rpc(rpcUrls, 'eth_getBalance', [address, 'latest']);
          } else {
            raw = await rpc(rpcUrls, 'eth_call', [
              { to: token.address, data: encodeBalanceOf(address) },
              'latest',
            ]);
          }
          const amount = fromHex(raw, token.decimals);
          if (amount > 0) chainBalances[token.symbol] = amount;
        } catch (e) {
          console.warn(`Balance check failed for ${token.symbol} on chain ${chainId}:`, e.message);
        }
      }));

      if (Object.keys(chainBalances).length > 0) {
        results[chainId] = chainBalances;
      }
    })
  );

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.json(results);
}
