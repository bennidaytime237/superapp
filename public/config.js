// Shared config: chain metadata, icon helpers, token icon map.
// Loaded by all pages before their own inline scripts.

const TW = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';

// Chain icon URLs keyed by chain ID. Includes virtual HL keys used by gas.html.
const CHAIN_ICONS = {
  1:         'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
  42161:     'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
  8453:      'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
  10:        'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
  137:       'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
  56:        'https://icons.llamao.fi/icons/chains/rsz_bsc.jpg',
  324:       'https://icons.llamao.fi/icons/chains/rsz_zksync%20era.jpg',
  59144:     'https://icons.llamao.fi/icons/chains/rsz_linea.jpg',
  34443:     'https://icons.llamao.fi/icons/chains/rsz_mode.jpg',
  1135:      'https://icons.llamao.fi/icons/chains/rsz_lisk.jpg',
  480:       'https://icons.llamao.fi/icons/chains/rsz_world%20chain.jpg',
  81457:     'https://icons.llamao.fi/icons/chains/rsz_blast.jpg',
  534352:    'https://icons.llamao.fi/icons/chains/rsz_scroll.jpg',
  7777777:   'https://icons.llamao.fi/icons/chains/rsz_zora.jpg',
  130:       'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/unichain/info/logo.png',
  57073:     'https://icons.llamao.fi/icons/chains/rsz_ink.jpg',
  1868:      'https://icons.llamao.fi/icons/chains/rsz_soneium.jpg',
  999:       'https://icons.llamao.fi/icons/chains/rsz_hyperliquid.jpg',
  232:       'https://icons.llamao.fi/icons/chains/rsz_lens%20network.jpg',
  'hl-spot': 'https://icons.llamao.fi/icons/chains/rsz_hyperliquid.jpg',
  'hl-perp': 'https://icons.llamao.fi/icons/chains/rsz_hyperliquid.jpg',
};

/**
 * @param {number | string} chainId - Numeric chain ID or virtual key like "hl-spot".
 * @returns {string} Icon URL, or empty string if unknown.
 */
function chainIcon(chainId) {
  return CHAIN_ICONS[chainId] || '';
}

/**
 * @param {string} slug - LlamaFi chain slug, e.g. "ethereum", "arbitrum".
 * @returns {string} Icon URL.
 */
function chainIconBySlug(slug) {
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

// Token icon map keyed by symbol. Superset of all per-page TOKEN_ICONS dicts.
const TOKEN_ICON_MAP = {
  'ETH':    `${TW}/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png`,
  'WETH':   `${TW}/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png`,
  'USDC':   `${TW}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
  'USDC.e': `${TW}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
  'USDT':   `${TW}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  'DAI':    `${TW}/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png`,
  'WBTC':   `${TW}/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png`,
  'MATIC':  `${TW}/polygon/info/logo.png`,
  'POL':    `${TW}/polygon/info/logo.png`,
  'BNB':    `${TW}/binance/info/logo.png`,
  'UMA':    `${TW}/ethereum/assets/0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828/logo.png`,
  'ACX':    `${TW}/ethereum/assets/0x44108f0223A3C3028F5Fe7AEC7f9bb2E66beF82F/logo.png`,
  'POOL':   `${TW}/ethereum/assets/0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e/logo.png`,
  'SNX':    `${TW}/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png`,
};

// Alias used by pages that reference TOKEN_ICONS directly.
const TOKEN_ICONS = TOKEN_ICON_MAP;

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
