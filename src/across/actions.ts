import { AcrossClient } from "./client.js";
import type { SwapApprovalParams, EmbeddedAction } from "./types.js";

/**
 * Build an ERC-20 transfer action that sends the full swapped balance
 * to a recipient on the destination chain.
 */
export function buildTokenTransferAction(
  tokenAddress: string,
  recipient: string
): EmbeddedAction {
  return {
    target: tokenAddress,
    callData: "", // Populated by API based on transfer function signature
    value: "0",
    update: {
      updatableArgs: [
        {
          paramIndex: 0,
          populateDynamically: true,
          balanceSourceToken: tokenAddress,
        },
      ],
    },
  };
}

/**
 * Build a native transfer action (e.g., send ETH after bridge).
 */
export function buildNativeTransferAction(
  recipient: string,
  valueWei: string
): EmbeddedAction {
  return {
    target: recipient,
    callData: "0x",
    value: valueWei,
  };
}

/**
 * Execute a swap with embedded destination-chain actions.
 * Actions execute atomically in order — if action N reverts, N+1+ are skipped.
 * Failed actions leave tokens in the multicall handler (recoverable).
 */
export async function executeSwapWithActions(
  client: AcrossClient,
  params: SwapApprovalParams,
  actions: EmbeddedAction[],
  sendTransaction: (tx: { to: string; data: string; value: string; chainId: number }) => Promise<string>
): Promise<string> {
  const approval = await client.getSwapApprovalWithActions(params, actions);

  for (const approvalTx of approval.approvalTxns) {
    await sendTransaction(approvalTx);
  }

  return sendTransaction(approval.swapTx);
}
