// Single source of truth for chain and token metadata used across API handlers.
// Adding a new chain: add to CHAIN_NAMES, RPC_LIST, and CHAIN_TOKENS (and TOKEN_MAP if needed).

/** @type {Record<number, string>} */
export const CHAIN_NAMES = {
  1: 'Ethereum', 42161: 'Arbitrum', 8453: 'Base', 10: 'Optimism',
  137: 'Polygon', 56: 'BSC', 324: 'zkSync', 59144: 'Linea', 34443: 'Mode',
  81457: 'Blast', 534352: 'Scroll', 7777777: 'Zora', 480: 'World Chain',
  1135: 'Lisk', 57073: 'Ink', 1868: 'Soneium', 130: 'Unichain',
};

/** @type {Record<number, string[]>} */
export const RPC_LIST = {
  1:       ['https://eth.drpc.org', 'https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'],
  42161:   ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
  8453:    ['https://mainnet.base.org', 'https://base.drpc.org'],
  10:      ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  137:     ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon', 'https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'],
  56:      ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
  324:     ['https://mainnet.era.zksync.io'],
  59144:   ['https://rpc.linea.build'],
  34443:   ['https://mainnet.mode.network'],
  534352:  ['https://rpc.scroll.io'],
  81457:   ['https://rpc.blast.io'],
  130:     ['https://mainnet.unichain.org'],
  57073:   ['https://rpc-gel.inkonchain.com'],
  1868:    ['https://rpc.soneium.org'],
  480:     ['https://worldchain-mainnet.g.alchemy.com/public'],
  1135:    ['https://rpc.api.lisk.com'],
  7777777: ['https://rpc.zora.energy'],
};

/**
 * Per-chain token lists used by balances.js for eth_getBalance / eth_call queries.
 * @type {Record<number, Array<{symbol: string, decimals: number, address: string|null}>>}
 */
export const CHAIN_TOKENS = {
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
  130:     [{ symbol: 'ETH', decimals: 18, address: null }],
  57073:   [{ symbol: 'ETH', decimals: 18, address: null }],
  1868:    [{ symbol: 'ETH', decimals: 18, address: null }],
  480: [
    { symbol: 'ETH',  decimals: 18, address: null },
    { symbol: 'USDC', decimals: 6,  address: '0x79A02482A880bCE3B13e2E16aE16AEd94bEA1fad' },
  ],
  1135:    [{ symbol: 'ETH', decimals: 18, address: null }],
  7777777: [{ symbol: 'ETH', decimals: 18, address: null }],
};

/**
 * Token address → {symbol, decimals} map used by transactions.js to resolve
 * Across deposit token addresses into human-readable symbols.
 * @type {Record<string, {symbol: string, decimals: number}>}
 */
export const TOKEN_MAP = {
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'ETH',  decimals: 18 },
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': { symbol: 'ETH',  decimals: 18 },
  '0x4200000000000000000000000000000000000006': { symbol: 'ETH',  decimals: 18 },
  '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91': { symbol: 'ETH',  decimals: 18 },
  '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f': { symbol: 'ETH',  decimals: 18 },
  '0x4300000000000000000000000000000000000004': { symbol: 'ETH',  decimals: 18 },
  '0x5300000000000000000000000000000000000004': { symbol: 'ETH',  decimals: 18 },
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', decimals: 6 },
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': { symbol: 'USDC', decimals: 6 },
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', decimals: 6 },
  '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': { symbol: 'USDC', decimals: 6 },
  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': { symbol: 'USDC', decimals: 6 },
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', decimals: 6 },
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { symbol: 'USDT', decimals: 6 },
  '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58': { symbol: 'USDT', decimals: 6 },
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI',  decimals: 18 },
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1': { symbol: 'DAI',  decimals: 18 },
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { symbol: 'WBTC', decimals: 8 },
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': { symbol: 'WBTC', decimals: 8 },
  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { symbol: 'POL',  decimals: 18 },
};
