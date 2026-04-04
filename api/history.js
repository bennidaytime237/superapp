/**
 * GET /api/history?address=0x...
 *
 * Queries block explorer APIs for transactions from the user's address
 * to known Across SpokePool and Uniswap Router contracts.
 * Returns unified tx history across all chains — works crossdevice.
 */

const EXPLORERS = {
  1:     { url: 'https://api.etherscan.io/api', name: 'Ethereum' },
  42161: { url: 'https://api.arbiscan.io/api', name: 'Arbitrum' },
  8453:  { url: 'https://api.basescan.org/api', name: 'Base' },
  10:    { url: 'https://api-optimistic.etherscan.io/api', name: 'Optimism' },
  137:   { url: 'https://api.polygonscan.com/api', name: 'Polygon' },
};

// Contracts we interact with (Across SpokePools + Uniswap Routers)
const KNOWN_CONTRACTS = {
  // Across SpokePools
  '0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5': { type: 'bridge', label: 'Across', chain: 1 },
  '0x6f26bf09b1c792e3228e5467807a900a503c0281': { type: 'bridge', label: 'Across', chain: 10 },
  '0x09aea4b2242abc8bb4bb78d537a67a245a7bec64': { type: 'bridge', label: 'Across', chain: 8453 },
  '0xe35e9842fceaca96570b734083f4a58e8f7c5f2a': { type: 'bridge', label: 'Across', chain: 42161 },
  '0x9295ee1d8c5b022be115a2ad3c30c72e34e7f096': { type: 'bridge', label: 'Across', chain: 137 },
  // Uniswap Universal Router v2
  '0x66a9893cc07d91d95644aedd05d03f95e1dba8af': { type: 'swap', label: 'Uniswap', chain: 1 },
  '0x6ff5693b99212da76ad316178a184ab56d299b43': { type: 'swap', label: 'Uniswap', chain: 8453 },
  '0xa51afafe0263b40edaef0df8781ea9aa03e381a3': { type: 'swap', label: 'Uniswap', chain: 42161 },
  '0x851116d9223fabed8e56c0e6b8ad0c31d98b3507': { type: 'swap', label: 'Uniswap', chain: 10 },
  '0x1095692a6237d83c6a72f3f5efedb9a670c49223': { type: 'swap', label: 'Uniswap', chain: 137 },
  // SwapRouter02 fallback
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { type: 'swap', label: 'Uniswap', chain: 0 },
};

const CHAIN_NAMES = { 1:'Ethereum', 42161:'Arbitrum', 8453:'Base', 10:'Optimism', 137:'Polygon' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { address } = req.query;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  const addr = address.toLowerCase();
  const allTxs = [];

  // Query each explorer in parallel
  await Promise.all(
    Object.entries(EXPLORERS).map(async ([chainIdStr, explorer]) => {
      const chainId = Number(chainIdStr);
      try {
        const url = `${explorer.url}?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&sort=desc&page=1&offset=50`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await resp.json();

        if (data.status !== '1' || !Array.isArray(data.result)) return;

        for (const tx of data.result) {
          if (tx.isError === '1') continue;
          const to = (tx.to || '').toLowerCase();
          const contract = KNOWN_CONTRACTS[to];
          if (!contract) continue;

          allTxs.push({
            type: contract.type,
            label: contract.label,
            txHash: tx.hash,
            chainId,
            chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
            timestamp: Number(tx.timeStamp) * 1000,
            value: tx.value,
            gasUsed: tx.gasUsed,
          });
        }
      } catch (e) {
        // Skip failed explorers
      }
    })
  );

  // Sort by timestamp descending
  allTxs.sort((a, b) => b.timestamp - a.timestamp);

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.json(allTxs.slice(0, 50));
}
