export type IntentAction =
  | "bridge"
  | "swap"
  | "crosschain-swap"
  | "buy"
  | "sell"
  | "send"
  | "dca"
  | "balance"
  | "stake-after-bridge";

export interface UserIntent {
  action: IntentAction;
  inputToken?: string;
  outputToken?: string;
  amount?: string;
  originChainId?: number;
  destinationChainId?: number;
  recipient?: string;
  fiatCurrency?: string;
  dcaFrequency?: "daily" | "weekly" | "monthly";
}

export type Provider = "across" | "moonpay";

export interface ExecutionPlan {
  provider: Provider;
  steps: ExecutionStep[];
  estimatedOutput?: string;
  estimatedFees?: string;
}

export interface ExecutionStep {
  description: string;
  provider: Provider;
  action: string;
  params: Record<string, unknown>;
}
