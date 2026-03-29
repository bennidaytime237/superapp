export interface Wallet {
  name: string;
  address: string;
  chains: number[];
}

export interface SwapParams {
  from: string;
  to: string;
  amount: string;
  chain?: number;
}

export interface BridgeParams {
  token: string;
  amount: string;
  fromChain: number;
  toChain: number;
}

export interface BuyParams {
  token: string;
  amount: string;
  currency: string;
  chain?: number;
}

export interface DCAParams {
  token: string;
  amount: string;
  frequency: "daily" | "weekly" | "monthly";
  chain?: number;
}

export interface TransferParams {
  token: string;
  amount: string;
  to: string;
  chain?: number;
}
