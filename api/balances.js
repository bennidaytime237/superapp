// ERC-20 balanceOf selector: keccak256("balanceOf(address)")[0:4] = 0x70a08231
function encodeBalanceOf(address) {
  const addr = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0x70a08231' + addr;
}

// Multiple RPCs per chain for reliability
const RPC_LIST = {
  1:     ['https://eth.drpc.org', 'https://rpc.ankr.com/eth', 'https://eth.llamarpc.com', 'https://cloudflare-eth.com'],
  42161: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
  8453:  ['https://mainnet.base.org', 'https://base.drpc.org'],
  10:    ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  137:   ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
};

const TOKENS = {
  1: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { symbol: 'USDT', decimals: 6,  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { symbol: 'WBTC', decimals: 8,  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    { symbol: 'DAI',  decimals: 18, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
    { symbol: 'WETH', decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  ],
  42161: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    { symbol: 'DAI',  decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
    { symbol: 'WBTC', decimals: 8,  address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  ],
  8453: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  ],
  10: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  ],
  137: [
    { symbol: 'MATIC', decimals: 18, address: null },
    { symbol: 'USDC',  decimals: 6,  address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  ],
};

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
    } catch {}
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { address } = req.query;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
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
        } catch {
          // skip failed token
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
