# SuperApp - Unified Crypto Mega-App

A unified crypto super-app powered by **Across Protocol** (crosschain bridging/swapping) and **MoonPay** (agent wallets, fiat ramps, trading) — designed for AI-native crypto users.

## Vision

One interface. Every chain. Every action. AI-powered.

SuperApp combines crosschain liquidity (Across Protocol) with agent-native wallet infrastructure (MoonPay) to deliver a single surface for all crypto operations:

- **Bridge** tokens across 10+ chains in ~2 seconds
- **Swap** any token to any token, crosschain, in one transaction
- **Hold** crypto in non-custodial AI-agent wallets
- **Buy/Sell** crypto with fiat on/off ramps
- **Trade** with DCA, limit orders, and stop losses
- **Research** tokens, markets, and alpha opportunities
- **Execute** embedded crosschain actions (stake, mint, deposit post-bridge)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SuperApp Frontend                  │
│              (CLI / Web / MCP / Chat)                │
├─────────────────────────────────────────────────────┤
│                  Unified Router Layer                │
│         Intent Resolution & Route Optimization       │
├──────────────────────┬──────────────────────────────┤
│   Across Protocol    │        MoonPay Agent          │
│                      │        Infrastructure         │
│  - Crosschain swap  │  - Non-custodial wallets     │
│  - Bridge (2s fills) │  - Fiat on/off ramps         │
│  - Embedded actions  │  - DCA / Limit orders        │
│  - Fee optimization  │  - Token discovery           │
│  - Route discovery   │  - Portfolio tracking        │
│  - Deposit tracking  │  - Market data / Research    │
├──────────────────────┴──────────────────────────────┤
│              Supported Chains                        │
│  Ethereum · Optimism · Arbitrum · Base · Polygon    │
│  zkSync Era · Linea · Solana · BNB · Avalanche     │
│  TRON · Bitcoin                                      │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

```bash
# Install MoonPay CLI
npm i -g @moonpay/cli

# Accept terms and authenticate
mp consent accept
mp login --email you@example.com

# Create your first wallet
mp wallet create --name "main"
```

### Install Skills (for AI agents)

```bash
# Install Across Protocol skills
npx skills add across-protocol/skills

# Install MoonPay skills
npx skills add moonpay/skills

# Or install globally for all projects
npx skills add moonpay/skills --global
npx skills add across-protocol/skills --global
```

### MCP Server Setup (for Claude Code / Claude Desktop)

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "moonpay": {
      "command": "mp",
      "args": ["mcp"]
    }
  }
}
```

## Integration Points

### Across Protocol APIs

| Endpoint | Purpose |
|---|---|
| `GET /swap/approval` | Get crosschain swap transaction data |
| `POST /swap/approval` | Swap + embedded destination actions |
| `GET /swap/chains` | List supported chains |
| `GET /swap/tokens` | List whitelisted tokens |
| `GET /swap/sources` | Available liquidity sources |
| `GET /available-routes` | Bridgeable token pairs |
| `GET /suggested-fees` | Fee quotes (for custom swap infra) |
| `GET /limits` | Min/max transfer amounts |
| `GET /deposit/status` | Track deposit/fill status |

**Base URLs:**
- Mainnet: `https://app.across.to/api`
- Testnet: `https://testnet.across.to/api`

### MoonPay CLI Commands

| Command | Purpose |
|---|---|
| `mp wallet create` | Create non-custodial wallet |
| `mp wallet list` | List wallets |
| `mp swap` | Swap tokens |
| `mp bridge` | Bridge across chains |
| `mp buy` | Buy crypto with fiat |
| `mp sell` | Off-ramp to fiat |
| `mp send` | Transfer tokens |
| `mp balance` | Check balances |
| `mp deposit` | Create deposit address |
| `mp dca` | Dollar-cost averaging |
| `mp mcp` | Start MCP server |

## Project Structure

```
superapp/
├── README.md                  # This file
├── ARCHITECTURE.md            # Detailed architecture & design decisions
├── src/
│   ├── router/                # Unified intent router
│   │   ├── index.ts           # Route resolution engine
│   │   └── types.ts           # Core types
│   ├── across/                # Across Protocol integration
│   │   ├── client.ts          # API client
│   │   ├── swap.ts            # Swap/bridge operations
│   │   ├── actions.ts         # Embedded crosschain actions
│   │   └── types.ts           # Across-specific types
│   ├── moonpay/               # MoonPay integration
│   │   ├── wallet.ts          # Wallet management
│   │   ├── trading.ts         # Swap, DCA, limit orders
│   │   ├── fiat.ts            # On/off ramp operations
│   │   └── types.ts           # MoonPay-specific types
│   └── shared/                # Shared utilities
│       ├── chains.ts          # Chain registry
│       ├── tokens.ts          # Token registry
│       └── constants.ts       # Shared constants
├── skills/                    # AI agent skill definitions
│   └── superapp/
│       └── SKILL.md           # Unified skill for AI agents
├── package.json
└── tsconfig.json
```

## Security

- **Non-custodial**: Private keys encrypted in OS keychain, never leave your machine
- **Exact approvals**: Default to exact-amount token approvals (not unlimited)
- **Quote freshness**: Never cache swap quotes — they expire per-block
- **Refund safety**: Explicit refund addresses and chain configuration
- **Validated targets**: All embedded action targets are sanitized
- **Integrator ID**: Register a 2-byte hex ID before production launch

## License

MIT
