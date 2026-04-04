// ERC-20 balanceOf selector: keccak256("balanceOf(address)")[0:4] = 0x70a08231
function encodeBalanceOf(address) {
  const addr = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0x70a08231' + addr;
}

// Multiple RPCs per chain for reliability
const RPC_LIST = {
  1:     ['https://eth.drpc.org', 'https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'],
  42161: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
  8453:  ['https://mainnet.base.org', 'https://base.drpc.org'],
  10:    ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  137:   ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon', 'https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'],
  56:    ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
  324:   ['https://mainnet.era.zksync.io'],
  59144: ['https://rpc.linea.build'],
  34443: ['https://mainnet.mode.network'],
  534352:['https://rpc.scroll.io'],
  81457: ['https://rpc.blast.io'],
  130:   ['https://mainnet.unichain.org'],
  57073: ['https://rpc-gel.inkonchain.com'],
  1868:  ['https://rpc.soneium.org'],
  480:   ['https://worldchain-mainnet.g.alchemy.com/public'],
  1135:  ['https://rpc.api.lisk.com'],
  7777777:['https://rpc.zora.energy'],
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
    { symbol: 'USDT', decimals: 6,  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    { symbol: 'DAI',  decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
    { symbol: 'WBTC', decimals: 8,  address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  ],
  8453: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    { symbol: 'DAI',  decimals: 18, address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' },
  ],
  10: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
    { symbol: 'USDT', decimals: 6,  address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' },
    { symbol: 'DAI',  decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
  ],
  137: [
    { symbol: 'POL',   decimals: 18, address: null },
    { symbol: 'USDC',  decimals: 6,  address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
    { symbol: 'USDC.e',decimals: 6,  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
    { symbol: 'USDT',  decimals: 6,  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    { symbol: 'DAI',   decimals: 18, address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
  ],
  56: [
    { symbol: 'BNB',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 18, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
    { symbol: 'USDT', decimals: 18, address: '0x55d398326f99059fF775485246999027B3197955' },
  ],
  324: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4' },
  ],
  59144: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff' },
    { symbol: 'DAI',  decimals: 18, address: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5' },
  ],
  34443: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0xd988097fb8612cc24eeC14542bC03424c656005f' },
  ],
  534352: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4' },
  ],
  81457: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDB', decimals: 18, address: '0x4300000000000000000000000000000000000003' },
  ],
  130: [
    { symbol: 'ETH', decimals: 18, address: null },
  ],
  57073: [
    { symbol: 'ETH', decimals: 18, address: null },
  ],
  1868: [
    { symbol: 'ETH', decimals: 18, address: null },
  ],
  480: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x79A02482A880bCE3B13e2E16aE16AEd94bEA1fad' },
  ],
  1135: [
    { symbol: 'ETH', decimals: 18, address: null },
  ],
  7777777: [
    { symbol: 'ETH', decimals: 18, address: null },
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
