export interface Token {
  symbol: string;
  decimals: number;
  addresses: Record<number, string>;
}

/**
 * Common tokens with known addresses across major chains.
 * Always verify against GET /swap/tokens or GET /available-routes before production use.
 */
export const COMMON_TOKENS: Token[] = [
  {
    symbol: "USDC",
    decimals: 6,
    addresses: {
      1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
  },
  {
    symbol: "WETH",
    decimals: 18,
    addresses: {
      1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      10: "0x4200000000000000000000000000000000000006",
      8453: "0x4200000000000000000000000000000000000006",
      42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
  },
  {
    symbol: "USDT",
    decimals: 6,
    addresses: {
      1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
  },
  {
    symbol: "WBTC",
    decimals: 8,
    addresses: {
      1: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      10: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
      137: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    },
  },
];

export function getTokenAddress(symbol: string, chainId: number): string | undefined {
  const token = COMMON_TOKENS.find((t) => t.symbol === symbol);
  return token?.addresses[chainId];
}
