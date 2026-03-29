import { AcrossClient } from "./client.js";
import type { SwapApprovalParams, SwapApprovalResponse, DepositStatus } from "./types.js";

/**
 * Execute a crosschain swap via Across Protocol.
 *
 * Flow:
 * 1. Get swap approval (quote + transaction data)
 * 2. Execute approval transactions (if any)
 * 3. Submit the swap transaction
 * 4. Poll deposit status until filled
 */
export async function executeSwap(
  client: AcrossClient,
  params: SwapApprovalParams,
  sendTransaction: (tx: { to: string; data: string; value: string; chainId: number }) => Promise<string>
): Promise<{ depositTxHash: string; status: DepositStatus }> {
  // 1. Get quote (never cache — changes every block)
  const approval: SwapApprovalResponse = await client.getSwapApproval(params);

  // 2. Execute approval txns sequentially
  for (const approvalTx of approval.approvalTxns) {
    await sendTransaction(approvalTx);
  }

  // 3. Submit the swap
  const depositTxHash = await sendTransaction(approval.swapTx);

  // 4. Poll for fill
  const status = await pollDepositStatus(client, params.originChainId, depositTxHash);

  return { depositTxHash, status };
}

async function pollDepositStatus(
  client: AcrossClient,
  originChainId: number,
  depositTxHash: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<DepositStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await client.getDepositStatus(originChainId, depositTxHash);
    if (status.status === "filled") return status;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Deposit ${depositTxHash} not filled after ${maxAttempts} attempts`);
}
