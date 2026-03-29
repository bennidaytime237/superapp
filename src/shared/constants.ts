export const ACROSS_MAINNET_API = "https://app.across.to/api";
export const ACROSS_TESTNET_API = "https://testnet.across.to/api";

export const ERC7683_CONTRACTS = {
  base: "0x4afb570AC68BfFc26Bb02FdA3D801728B0f93C9E",
  arbitrum: "0xB0B07055F214Ce59ccB968663d3435B9f3294998",
} as const;

export type TradeType = "exactInput" | "minOutput" | "exactOutput";

export type CrossSwapType = "B2B" | "A2B" | "B2A" | "A2A";
