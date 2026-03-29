import { ACROSS_MAINNET_API, ACROSS_TESTNET_API } from "../shared/constants.js";
import type {
  SwapApprovalParams,
  SwapApprovalResponse,
  DepositStatus,
  EmbeddedAction,
} from "./types.js";

export class AcrossClient {
  private baseUrl: string;

  constructor(options?: { testnet?: boolean }) {
    this.baseUrl = options?.testnet ? ACROSS_TESTNET_API : ACROSS_MAINNET_API;
  }

  /** Get swap approval transaction data (GET — simple swaps) */
  async getSwapApproval(params: SwapApprovalParams): Promise<SwapApprovalResponse> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const res = await fetch(`${this.baseUrl}/swap/approval?${query}`);
    if (!res.ok) throw new Error(`Across API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** Get swap approval with embedded actions (POST — destination chain execution) */
  async getSwapApprovalWithActions(
    params: SwapApprovalParams,
    actions: EmbeddedAction[]
  ): Promise<SwapApprovalResponse> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const res = await fetch(`${this.baseUrl}/swap/approval?${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    });
    if (!res.ok) throw new Error(`Across API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** Track deposit/fill status */
  async getDepositStatus(originChainId: number, depositTxHash: string): Promise<DepositStatus> {
    const query = new URLSearchParams({
      originChainId: String(originChainId),
      depositTxHash,
    });
    const res = await fetch(`${this.baseUrl}/deposit/status?${query}`);
    if (!res.ok) throw new Error(`Across API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** Get supported chains for swaps */
  async getChains(): Promise<unknown[]> {
    const res = await fetch(`${this.baseUrl}/swap/chains`);
    if (!res.ok) throw new Error(`Across API error: ${res.status}`);
    return res.json();
  }

  /** Get whitelisted tokens */
  async getTokens(): Promise<unknown[]> {
    const res = await fetch(`${this.baseUrl}/swap/tokens`);
    if (!res.ok) throw new Error(`Across API error: ${res.status}`);
    return res.json();
  }

  /** Get available routes between two chains */
  async getRoutes(originChainId: number, destinationChainId: number): Promise<unknown[]> {
    const query = new URLSearchParams({
      originChainId: String(originChainId),
      destinationChainId: String(destinationChainId),
    });
    const res = await fetch(`${this.baseUrl}/available-routes?${query}`);
    if (!res.ok) throw new Error(`Across API error: ${res.status}`);
    return res.json();
  }

  /** Get transfer limits */
  async getLimits(
    inputToken: string,
    outputToken: string,
    originChainId: number,
    destinationChainId: number
  ): Promise<{ minDeposit: string; maxDeposit: string; maxDepositInstant: string }> {
    const query = new URLSearchParams({
      inputToken,
      outputToken,
      originChainId: String(originChainId),
      destinationChainId: String(destinationChainId),
    });
    const res = await fetch(`${this.baseUrl}/limits?${query}`);
    if (!res.ok) throw new Error(`Across API error: ${res.status}`);
    return res.json();
  }
}
