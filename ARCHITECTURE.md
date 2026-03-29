# SuperApp Architecture

## Design Philosophy

SuperApp is built on the principle that **cross-chain should be invisible**. Users express intent ("swap 100 USDC on Ethereum to WETH on Arbitrum") and the app figures out the optimal route, combining Across Protocol's cross-chain infrastructure with MoonPay's wallet and fiat layer.

## Core Components

### 1. Unified Router Layer

The router is the brain of SuperApp. It receives user intents and resolves them to concrete execution plans.

**Intent Resolution Flow:**

```
User Intent
    │
    ▼
┌─────────────────┐
│  Parse Intent    │  "swap 100 USDC to ETH on Arbitrum"
│  (NLP / struct)  │  → { inputToken, outputToken, chains, amount }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Discovery │  Query Across /swap/tokens, /available-routes
│                  │  Classify: B2B, A2B, B2A, or A2A
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Quote & Compare │  Across /swap/approval vs MoonPay swap
│                  │  Factor: speed, fees, slippage, route type
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Execute         │  Approvals → Swap Tx → Track via /deposit/status
│                  │  OR MoonPay CLI execution
└─────────────────┘
```

**Route Classification (Across Protocol):**

| Type | Origin Token | Destination Token | Strategy |
|------|-------------|-------------------|----------|
| B2B  | Bridgeable  | Bridgeable        | Direct bridge |
| A2B  | Non-bridgeable | Bridgeable     | Origin swap → bridge |
| B2A  | Bridgeable  | Non-bridgeable    | Bridge → destination swap |
| A2A  | Non-bridgeable | Non-bridgeable | Origin swap → bridge → destination swap |

### 2. Across Protocol Integration

Handles all cross-chain movement with ~2 second fill times on mainnet.

**Key Design Decisions:**

- **Use Swap API for everything**: The `/swap/approval` endpoint handles origin swaps, bridging, and destination swaps in one call. Only fall back to `/suggested-fees` if you control your own swap infrastructure.
- **`exactInput` by default**: User specifies how much to send; API calculates expected output.
- **`slippage=auto`**: Let the API split slippage optimally across swap legs.
- **Never cache quotes**: Quotes derive from on-chain state and change every block.
- **Refund defaults**: B2B/A2B refund on origin; B2A/A2A refund on destination. Override with `refundOnOrigin` parameter.

**Embedded Actions (POST /swap/approval):**

Post-bridge actions execute sequentially on the destination chain:

```json
{
  "actions": [
    {
      "target": "0xStakingContract",
      "callData": "0x...",
      "value": "0",
      "update": {
        "updatableArgs": [{ "paramIndex": 0, "populateDynamically": true, "balanceSourceToken": "0xTokenAddr" }]
      }
    }
  ]
}
```

- Actions execute atomically in order
- If action N reverts, actions N+1+ are skipped
- Failed actions leave tokens in the multicall handler (recoverable)
- Use `populateDynamically` to consume full swapped balance

### 3. MoonPay Wallet & Trading Layer

Provides the wallet infrastructure and fiat connectivity that Across Protocol doesn't cover.

**Wallet Architecture:**
- Non-custodial: keys encrypted in OS keychain
- Multi-chain: Ethereum, Solana, Bitcoin, and 7+ more
- AI-native: accessible via CLI (`mp`), MCP server (`mp mcp`), or SDK

**Trading Capabilities:**
- Instant swaps (same-chain)
- DCA (dollar-cost averaging) schedules
- Limit orders and stop losses
- Prediction market trading (Polymarket/Kalshi)
- Market data and token research via Messari API

**Fiat Integration:**
- On-ramp: buy crypto with card/bank transfer
- Off-ramp: sell crypto to fiat
- Virtual accounts for recurring deposits

### 4. Chain & Token Registry

Unified registry sourced from both protocols:

**Across-supported chains (bridging):**
- Ethereum (1), Optimism (10), Polygon (137), zkSync Era (324), Base (8453), Arbitrum (42161), Linea (59144)
- Testnets: Ethereum Sepolia, Arbitrum Sepolia, Base Sepolia, Optimism Sepolia

**MoonPay-supported chains (wallets/fiat):**
- All Across chains + Solana, BNB Chain, Avalanche, TRON, Bitcoin

**Common tokens with known addresses:**
- USDC, WETH, USDT, DAI, WBTC across all major chains
- Always verify via `GET /swap/tokens` or `GET /available-routes` before use

## Security Architecture

### Token Approvals
- Default to exact-amount approvals
- Only enable unlimited with explicit user consent
- Verify spender matches API-returned contract address

### Quote Handling
- Never cache `/swap/approval` responses
- Validate `quoteExpiryTimestamp` before submission
- Numeric slippage: 0.1–5% range, expressed as ratio (0.001–0.05)

### Embedded Actions
- Validate all target addresses — no unsanitized user-controlled targets
- Actions execute sequentially; design for atomic failure
- Failed tokens recoverable from multicall handler

### Cross-Chain Messages
- Malformed calldata causes destination reversions
- EOA recipients cannot accept message parameters
- Test on Sepolia testnets before mainnet deployment

### Refund Safety
- Priority: `refundAddress` > `recipient` > `depositor`
- Set explicit `refundAddress` when depositor ≠ recipient
- Document refund chain for every route type

## Development Workflow

1. **Testnet first**: Use `https://testnet.across.to/api` with small amounts
2. **Register integrator ID**: Get 2-byte hex ID before production
3. **Incremental rollout**: Bridge-only → swap → embedded actions
4. **Monitor**: Poll `/deposit/status` for fill tracking

## API Reference

### Across Protocol
- Docs: https://docs.across.to
- App SDK: `@across-protocol/app-sdk`
- Mainnet API: `https://app.across.to/api`
- Testnet API: `https://testnet.across.to/api`

### MoonPay
- CLI: `@moonpay/cli` (npm)
- Skills: https://github.com/moonpay/skills
- MCP: `mp mcp` (local server)

### ERC-7683 Contracts (Across)
- Base AcrossOriginSettler: `0x4afb570AC68BfFc26Bb02FdA3D801728B0f93C9E`
- Arbitrum AcrossOriginSettler: `0xB0B07055F214Ce59ccB968663d3435B9f3294998`
