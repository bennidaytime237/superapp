import type { UserIntent, ExecutionPlan, Provider } from "./types.js";
import { getBridgeableChains } from "../shared/chains.js";

/**
 * Unified Router — resolves user intents to execution plans.
 *
 * Decision logic:
 * - Crosschain operations → Across Protocol (fastest, ~2s fills)
 * - Same-chain swaps → MoonPay CLI
 * - Fiat on/off ramps → MoonPay CLI
 * - Wallet operations → MoonPay CLI
 * - Crosschain + post-bridge action → Across embedded actions
 */
export function resolveIntent(intent: UserIntent): ExecutionPlan {
  const isCrossChain =
    intent.originChainId !== undefined &&
    intent.destinationChainId !== undefined &&
    intent.originChainId !== intent.destinationChainId;

  switch (intent.action) {
    case "bridge":
    case "crosschain-swap":
      return planCrossChainSwap(intent);

    case "swap":
      if (isCrossChain) return planCrossChainSwap(intent);
      return planSameChainSwap(intent);

    case "buy":
      return planFiatBuy(intent);

    case "sell":
      return planFiatSell(intent);

    case "send":
      return planTransfer(intent);

    case "dca":
      return planDCA(intent);

    case "balance":
      return planBalanceCheck(intent);

    case "stake-after-bridge":
      return planBridgeWithAction(intent);

    default:
      throw new Error(`Unknown action: ${intent.action}`);
  }
}

function planCrossChainSwap(intent: UserIntent): ExecutionPlan {
  const bridgeableChainIds = new Set(getBridgeableChains().map((c) => c.id));
  const originSupported = intent.originChainId && bridgeableChainIds.has(intent.originChainId);
  const destSupported = intent.destinationChainId && bridgeableChainIds.has(intent.destinationChainId);

  if (!originSupported || !destSupported) {
    throw new Error(
      `Crosschain swap requires Across-supported chains. ` +
      `Origin: ${intent.originChainId}, Destination: ${intent.destinationChainId}`
    );
  }

  return {
    provider: "across",
    steps: [
      {
        description: `Get swap quote for ${intent.amount} ${intent.inputToken} → ${intent.outputToken}`,
        provider: "across",
        action: "getSwapApproval",
        params: {
          tradeType: "exactInput",
          amount: intent.amount,
          inputToken: intent.inputToken,
          outputToken: intent.outputToken,
          originChainId: intent.originChainId,
          destinationChainId: intent.destinationChainId,
          slippage: "auto",
        },
      },
      {
        description: "Execute approval transactions",
        provider: "across",
        action: "executeApprovals",
        params: {},
      },
      {
        description: "Submit swap transaction",
        provider: "across",
        action: "submitSwap",
        params: {},
      },
      {
        description: "Poll deposit status until filled",
        provider: "across",
        action: "pollStatus",
        params: {},
      },
    ],
  };
}

function planSameChainSwap(intent: UserIntent): ExecutionPlan {
  return {
    provider: "moonpay",
    steps: [
      {
        description: `Swap ${intent.amount} ${intent.inputToken} → ${intent.outputToken}`,
        provider: "moonpay",
        action: "swap",
        params: {
          from: intent.inputToken,
          to: intent.outputToken,
          amount: intent.amount,
          chain: intent.originChainId,
        },
      },
    ],
  };
}

function planFiatBuy(intent: UserIntent): ExecutionPlan {
  return {
    provider: "moonpay",
    steps: [
      {
        description: `Buy ${intent.amount} ${intent.fiatCurrency} of ${intent.outputToken}`,
        provider: "moonpay",
        action: "buy",
        params: {
          token: intent.outputToken,
          amount: intent.amount,
          currency: intent.fiatCurrency,
          chain: intent.destinationChainId,
        },
      },
    ],
  };
}

function planFiatSell(intent: UserIntent): ExecutionPlan {
  return {
    provider: "moonpay",
    steps: [
      {
        description: `Sell ${intent.amount} ${intent.inputToken} to ${intent.fiatCurrency}`,
        provider: "moonpay",
        action: "sell",
        params: {
          token: intent.inputToken,
          amount: intent.amount,
          currency: intent.fiatCurrency,
        },
      },
    ],
  };
}

function planTransfer(intent: UserIntent): ExecutionPlan {
  if (intent.originChainId !== intent.destinationChainId && intent.destinationChainId) {
    return planCrossChainSwap({ ...intent, action: "crosschain-swap" });
  }
  return {
    provider: "moonpay",
    steps: [
      {
        description: `Send ${intent.amount} ${intent.inputToken} to ${intent.recipient}`,
        provider: "moonpay",
        action: "send",
        params: {
          token: intent.inputToken,
          amount: intent.amount,
          to: intent.recipient,
          chain: intent.originChainId,
        },
      },
    ],
  };
}

function planDCA(intent: UserIntent): ExecutionPlan {
  return {
    provider: "moonpay",
    steps: [
      {
        description: `Set up ${intent.dcaFrequency} DCA for ${intent.amount} into ${intent.outputToken}`,
        provider: "moonpay",
        action: "dca",
        params: {
          token: intent.outputToken,
          amount: intent.amount,
          frequency: intent.dcaFrequency,
          chain: intent.destinationChainId,
        },
      },
    ],
  };
}

function planBalanceCheck(intent: UserIntent): ExecutionPlan {
  return {
    provider: "moonpay",
    steps: [
      {
        description: "Check wallet balances",
        provider: "moonpay",
        action: "balance",
        params: {},
      },
    ],
  };
}

function planBridgeWithAction(intent: UserIntent): ExecutionPlan {
  return {
    provider: "across",
    steps: [
      {
        description: `Bridge ${intent.amount} ${intent.inputToken} and stake on destination`,
        provider: "across",
        action: "swapWithActions",
        params: {
          tradeType: "exactInput",
          amount: intent.amount,
          inputToken: intent.inputToken,
          outputToken: intent.outputToken,
          originChainId: intent.originChainId,
          destinationChainId: intent.destinationChainId,
          slippage: "auto",
        },
      },
    ],
  };
}

export { resolveIntent as default };
