export interface TokenPrice {
  symbol: string;
  address: string;
  chain: string;
  priceUsd: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  volume24h?: number;
  marketCap?: number;
  liquidity?: number;
}

export interface TokenSafety {
  address: string;
  verdict: "trusted" | "proceed" | "caution" | "avoid";
  trustScore: number;
  riskFlags: string[];
  summary: string;
}

export interface PriceAlert {
  id: string;
  token: string;
  chain: string;
  condition: "above" | "below";
  threshold: number;
  recurring: boolean;
  enabled: boolean;
}

export interface ResearchBrief {
  symbol: string;
  summary: string;
  price: number;
  marketCap: number;
  allTimeHigh: number;
  sentiment: { mindshare: number; socialVolume: number };
  bullishFactors: string[];
  bearishFactors: string[];
  riskAssessment: string;
}

export interface TrendingToken {
  symbol: string;
  name: string;
  address: string;
  chain: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
}
