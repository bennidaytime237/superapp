const TOKEN_MAP = {
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'ETH', decimals: 18 },
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': { symbol: 'ETH', decimals: 18 },
  '0x4200000000000000000000000000000000000006': { symbol: 'ETH', decimals: 18 },
  '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91': { symbol: 'ETH', decimals: 18 },
  '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f': { symbol: 'ETH', decimals: 18 },
  '0x4300000000000000000000000000000000000004': { symbol: 'ETH', decimals: 18 },
  '0x5300000000000000000000000000000000000004': { symbol: 'ETH', decimals: 18 },
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', decimals: 6 },
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': { symbol: 'USDC', decimals: 6 },
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', decimals: 6 },
  '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': { symbol: 'USDC', decimals: 6 },
  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': { symbol: 'USDC', decimals: 6 },
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', decimals: 6 },
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { symbol: 'USDT', decimals: 6 },
  '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58': { symbol: 'USDT', decimals: 6 },
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI', decimals: 18 },
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1': { symbol: 'DAI', decimals: 18 },
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { symbol: 'WBTC', decimals: 8 },
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': { symbol: 'WBTC', decimals: 8 },
  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { symbol: 'POL', decimals: 18 },
};

const CHAIN_NAMES = {
  1: 'Ethereum', 42161: 'Arbitrum', 8453: 'Base', 10: 'Optimism',
  137: 'Polygon', 324: 'zkSync', 59144: 'Linea', 34443: 'Mode',
  81457: 'Blast', 534352: 'Scroll', 7777777: 'Zora', 480: 'World Chain',
  1135: 'Lisk', 57073: 'Ink', 1868: 'Soneium', 130: 'Unichain',
};

const BRIDGE2 = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7'.toLowerCase();

function resolveToken(address) {
  if (!address) return { symbol: 'ETH', decimals: 18 };
  // Check exact match first, then case-insensitive
  if (TOKEN_MAP[address]) return TOKEN_MAP[address];
  const lower = address.toLowerCase();
  for (const [k, v] of Object.entries(TOKEN_MAP)) {
    if (k.toLowerCase() === lower) return v;
  }
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { address } = req.query;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  const ENDPOINTS = [
    `https://public.api.across.to/deposits/tx-page?depositorOrRecipientAddress=${address}&limit=50&offset=0`,
    `https://public.api.across.to/deposits?address=${address}&limit=50&offset=0`,
    `https://app.across.to/api/deposits/tx-page?depositorOrRecipientAddress=${address}&limit=50&offset=0`,
  ];

  let data = null;
  let lastErr = null;

  for (const url of ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const response = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(t);
      if (!response.ok) { lastErr = `${url} → ${response.status}`; continue; }
      data = await response.json();
      break;
    } catch (e) {
      lastErr = `${url} → ${e.message}`;
    }
  }

  if (!data) {
    console.error('All Across endpoints failed. Last error:', lastErr);
    return res.status(502).json({ error: 'Could not reach Across API', deposits: [] });
  }

  const rawDeposits = Array.isArray(data) ? data : (data.deposits || data.results || []);

  const deposits = rawDeposits.map(d => {
    const inToken = resolveToken(d.inputToken || d.sourceToken);
    const outToken = resolveToken(d.outputToken || d.destinationToken);
    const fromChainId = d.originChainId || d.sourceChainId;
    const toChainId = d.destinationChainId || d.destChainId;
    const recipient = (d.recipient || '').toLowerCase();
    let toChain = CHAIN_NAMES[toChainId] || `Chain ${toChainId}`;
    if (recipient === BRIDGE2) toChain = 'Hyperliquid';

    return {
      type: 'bridge',
      depositTxHash: d.depositTxHash || d.transactionHash || d.txHash || null,
      fillTxHash: d.fillTxHash || null,
      fromToken: inToken.symbol,
      toToken: outToken.symbol,
      amount: formatAmount(d.inputAmount || d.amount, inToken.decimals),
      outputAmount: formatAmount(d.outputAmount, outToken.decimals),
      fromChain: CHAIN_NAMES[fromChainId] || `Chain ${fromChainId}`,
      toChain,
      fromChainId,
      toChainId,
      timestamp: d.depositTime ? d.depositTime * 1000
        : d.depositDate ? new Date(d.depositDate).getTime()
        : d.quoteTimestamp ? d.quoteTimestamp * 1000
        : d.timestamp || 0,
      fillTime: d.fillTime || d.fillDeadline || null,
      status: d.status || 'filled',
    };
  });

  deposits.sort((a, b) => b.timestamp - a.timestamp);

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
  return res.json({ deposits });
}
