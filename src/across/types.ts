import type { CrossSwapType, TradeType } from "../shared/constants.js";

export interface SwapApprovalParams {
  tradeType: TradeType;
  amount: string;
  inputToken: string;
  outputToken: string;
  originChainId: number;
  destinationChainId: number;
  depositor: string;
  recipient?: string;
  slippage?: number | "auto";
  integratorId?: string;
  refundAddress?: string;
  refundOnOrigin?: boolean;
}

export interface SwapApprovalResponse {
  crossSwapType: CrossSwapType;
  approvalTxns: Transaction[];
  swapTx: Transaction;
  fees: FeeBreakdown;
  expectedOutput: string;
  minimumOutput: string;
}

export interface Transaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

export interface FeeBreakdown {
  totalRelayFee: Fee;
  relayerCapitalFee: Fee;
  relayerGasFee: Fee;
  lpFee: Fee;
}

export interface Fee {
  pct: string;
  total: string;
}

export interface DepositStatus {
  status: "pending" | "filled";
  fillTx?: string;
  destinationChainId?: number;
  actionsSucceeded?: boolean;
}

export interface EmbeddedAction {
  target: string;
  callData: string;
  value: string;
  update?: {
    updatableArgs: Array<{
      paramIndex: number;
      populateDynamically: boolean;
      balanceSourceToken: string;
    }>;
  };
}
