// Shared config: chain metadata, icon helpers, token icon map.
// Loaded by all pages before their own inline scripts.

const TW = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';

// Chain icons keyed by chain ID, self-hosted under public/icons/chains so they
// never depend on a third-party CDN at runtime. Includes virtual HL keys used
// by gas.html. Source artwork: TrustWallet assets, Uniswap assets, web3icons.
const CHAIN_ICONS = {
  1:         '/icons/chains/1.png',
  42161:     '/icons/chains/42161.png',
  8453:      '/icons/chains/8453.png',
  10:        '/icons/chains/10.png',
  137:       '/icons/chains/137.png',
  56:        '/icons/chains/56.png',
  324:       '/icons/chains/324.png',
  59144:     '/icons/chains/59144.png',
  34443:     '/icons/chains/34443.svg',
  1135:      '/icons/chains/1135.svg',
  480:       '/icons/chains/480.svg',
  81457:     '/icons/chains/81457.png',
  534352:    '/icons/chains/534352.png',
  7777777:   '/icons/chains/7777777.svg',
  130:       '/icons/chains/130.png',
  57073:     '/icons/chains/57073.svg',
  1868:      '/icons/chains/1868.svg',
  999:       '/icons/chains/999.png',
  232:       '/icons/chains/232.svg',
  1012:      '/icons/chains/1012.svg',
  143:       '/icons/chains/143.svg',
  6342:      '/icons/chains/6342.svg',
  'hl-spot': '/icons/chains/999.png',
  'hl-perp': '/icons/chains/999.png',
};

/**
 * @param {number | string} chainId - Numeric chain ID or virtual key like "hl-spot".
 * @returns {string} Icon URL, or empty string if unknown.
 */
function chainIcon(chainId) {
  return CHAIN_ICONS[chainId] || '';
}

// LlamaFi-style slug → chain ID, for legacy callers that key chains by slug.
const CHAIN_SLUG_IDS = {
  'ethereum': 1, 'arbitrum': 42161, 'base': 8453, 'optimism': 10,
  'polygon': 137, 'bsc': 56, 'zksync': 324, 'zksync era': 324,
  'linea': 59144, 'mode': 34443, 'lisk': 1135, 'world chain': 480,
  'blast': 81457, 'scroll': 534352, 'zora': 7777777, 'unichain': 130,
  'ink': 57073, 'soneium': 1868, 'hyperliquid': 999, 'hyperliquid evm': 999,
  'lens': 232, 'lens network': 232, 'plasma': 1012, 'monad': 143, 'megaeth': 6342,
};

/**
 * @param {string} slug - Chain slug, e.g. "ethereum" or "zksync%20era".
 * @returns {string} Icon URL, or empty string if unknown.
 */
function chainIconBySlug(slug) {
  const key = decodeURIComponent(String(slug || '')).toLowerCase();
  return chainIcon(CHAIN_SLUG_IDS[key]);
}

// Token icons keyed by symbol, self-hosted under public/icons/tokens.
// Superset of all per-page TOKEN_ICONS dicts.
const TOKEN_ICON_MAP = {
  'ETH':    '/icons/tokens/eth.png',
  'WETH':   '/icons/tokens/eth.png',
  'USDC':   '/icons/tokens/usdc.png',
  'USDC.e': '/icons/tokens/usdc.png',
  'USDT':   '/icons/tokens/usdt.png',
  'USDT0':  '/icons/tokens/usdt.png',
  'DAI':    '/icons/tokens/dai.png',
  'WBTC':   '/icons/tokens/wbtc.png',
  'MATIC':  '/icons/tokens/pol.png',
  'POL':    '/icons/tokens/pol.png',
  'BNB':    '/icons/tokens/bnb.png',
  'UMA':    '/icons/tokens/uma.png',
  'ACX':    '/icons/tokens/acx.png',
  'POOL':   '/icons/tokens/pool.png',
  'SNX':    '/icons/tokens/snx.png',
  'wstETH': '/icons/tokens/wsteth.png',
  'rETH':   '/icons/tokens/reth.svg',
  'cbETH':  '/icons/tokens/cbeth.png',
  'LINK':   '/icons/tokens/link.png',
  'BAL':    '/icons/tokens/bal.png',
  'OP':     '/icons/tokens/op.png',
  'ARB':    '/icons/tokens/arb.png',
  'USDB':   '/icons/tokens/usdb.png',
};

// Alias used by pages that reference TOKEN_ICONS directly.
const TOKEN_ICONS = TOKEN_ICON_MAP;

// Case-insensitive lookup index for API-supplied symbols ("usdc", "WstETH"…).
const TOKEN_ICON_MAP_UPPER = Object.keys(TOKEN_ICON_MAP).reduce((acc, k) => {
  acc[k.toUpperCase()] = TOKEN_ICON_MAP[k];
  return acc;
}, {});

/**
 * @param {string} symbol - Token symbol in any casing.
 * @returns {string} Icon URL, or empty string if unknown.
 */
function tokenIconBySymbol(symbol) {
  if (!symbol) return '';
  return TOKEN_ICON_MAP[symbol] || TOKEN_ICON_MAP_UPPER[String(symbol).toUpperCase()] || '';
}

// Block-explorer tx-URL prefixes keyed by chain ID. Single source of truth —
// index.js and transactions.js both link activity rows through this map.
const EXPLORER_TX = {
  1:       'https://etherscan.io/tx/',
  42161:   'https://arbiscan.io/tx/',
  8453:    'https://basescan.org/tx/',
  10:      'https://optimistic.etherscan.io/tx/',
  137:     'https://polygonscan.com/tx/',
  56:      'https://bscscan.com/tx/',
  324:     'https://explorer.zksync.io/tx/',
  59144:   'https://lineascan.build/tx/',
  34443:   'https://explorer.mode.network/tx/',
  81457:   'https://blastscan.io/tx/',
  534352:  'https://scrollscan.com/tx/',
  7777777: 'https://explorer.zora.energy/tx/',
  130:     'https://uniscan.xyz/tx/',
  57073:   'https://explorer.inkonchain.com/tx/',
  1868:    'https://soneium.blockscout.com/tx/',
  480:     'https://worldscan.org/tx/',
  1135:    'https://blockscout.lisk.com/tx/',
};

/**
 * @param {number | string} chainId
 * @param {string} txHash
 * @returns {string} Explorer URL for the transaction (etherscan as last resort).
 */
function explorerTxUrl(chainId, txHash) {
  return (EXPLORER_TX[chainId] || 'https://etherscan.io/tx/') + txHash;
}

/**
 * Converts a decimal amount (number or string) to base units without going
 * through IEEE-754 multiplication. `amount * 10 ** 18` rounds for any value
 * above ~9 ETH (2^53 in wei) — sometimes UP, which makes "Max" sends revert.
 * @param {number | string} amount
 * @param {number} decimals
 * @returns {string} Integer string in base units (floor of the exact value).
 */
function toUnits(amount, decimals) {
  let s = String(amount).trim();
  // Normalize exponential notation (String(1e-7) === "1e-7") to plain decimal —
  // rejecting it here would silently turn dust amounts into 0-value transfers.
  if (/e/i.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return '0';
    // 'fullwide' avoids exponential output for values >= 1e21 too
    s = n.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 20 });
  }
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return '0';
  const [whole = '0', frac = ''] = s.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const combined = (whole + fracPadded).replace(/^0+(?=\d)/, '');
  return BigInt(combined).toString();
}
