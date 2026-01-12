# HyperTrigger

Cross-asset price-triggered trading platform for Hyperliquid spot markets.

**Set a trigger → When price hits your target → Trade executes automatically**

## What is HyperTrigger?

HyperTrigger lets you create conditional trades on Hyperliquid spot markets. Watch any asset's price and automatically buy or sell when your conditions are met.

**Example Use Cases:**
- Buy FARTCOIN when BTC drops below $90,000
- Sell HYPE when ETH crosses above $4,000
- Accumulate SOL when it dips 10%

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   API Server    │────▶│    Database     │
│   (Next.js)     │     │   (NestJS)      │     │  (PostgreSQL)   │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  TriggerContract│     │     Worker      │
│   (HyperEVM)    │◀────│  (Node.js)      │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Hyperliquid   │
                        │   Spot Markets  │
                        └─────────────────┘
```

## Features

- **Cross-Asset Triggers**: Watch BTC, execute trades on HYPE
- **Spot Trading**: Buy and sell on Hyperliquid spot markets
- **On-Chain Intents**: Triggers stored on HyperEVM for transparency
- **Agent Authorization**: Secure delegation via Hyperliquid's agent system
- **Real-Time Execution**: Worker monitors prices every 5 seconds
- **Full Refunds**: Cancel anytime, get your fee back

## Project Structure

```
hyper-trigger/
├── apps/
│   ├── frontend/     # Next.js web application
│   ├── api/          # NestJS REST API
│   └── worker/       # Trigger execution service
├── contracts/        # Solidity smart contracts
└── packages/
    ├── shared/       # Shared token config & utilities
    └── api-client/   # Generated API client
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database
- HyperEVM wallet with HYPE for fees

### Installation

```bash
# Clone the repository
git clone https://github.com/hyper-trigger/hyper-trigger.git
cd hyper-trigger

# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env.local
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/worker/.env.example apps/worker/.env.local

# Run database migrations
pnpm --filter @hyper-trigger/api prisma migrate dev

# Start development
pnpm dev
```

### Environment Variables

**API (`apps/api/.env.local`)**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/hypertrigger
WORKER_API_KEY=your-secure-api-key
HYPEREVM_RPC_URL=https://rpc.hyperliquid.xyz/evm
NETWORK=mainnet
```

**Frontend (`apps/frontend/.env.local`)**
```env
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_TRIGGER_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WORKER_ADDRESS=0x...
NEXT_PUBLIC_BUILDER_ADDRESS=0x...   # Optional: defaults to worker address
```

**Worker (`apps/worker/.env.local`)**
```env
PRIVATE_KEY=your-executor-private-key
NETWORK=mainnet
API_URL=http://localhost:4000
WORKER_API_KEY=your-secure-api-key
TRIGGER_CONTRACT_ADDRESS=0x...
BUILDER_ADDRESS=0x...              # Optional: address to receive builder fees
```

## Smart Contracts

### TriggerContract

Stores price-based trigger orders on HyperEVM. No funds are held - this is intent storage only.

**Key Functions:**
- `createTrigger()` - Create a new price trigger (requires small HYPE fee)
- `cancelTrigger()` - Cancel and get full fee refund
- `updateTriggerPrice()` - Modify trigger price atomically

### SwapContract

Direct spot swaps for HyperEVM users via HyperCore integration.

**Key Functions:**
- `executeSwap()` - Initiate a spot swap
- `requestRefund()` - Claim refund for failed/expired swaps

## How It Works

1. **User authorizes worker** as a Hyperliquid agent (one-time, off-chain)
2. **User creates trigger** on TriggerContract (stores intent, pays small fee)
3. **Worker monitors** all active triggers every 5 seconds
4. **Price condition met** → Worker executes trade on Hyperliquid via agent API
5. **Worker marks trigger** as executed on-chain

## Fees

| Fee Type | Amount | Notes |
|----------|--------|-------|
| Trigger Creation | 0.001 HYPE | Refunded on cancel |
| Trade Execution | 0.04% | Via Hyperliquid builder codes |

### Builder Codes

Trade fees are collected via [Hyperliquid's builder code system](https://hyperliquid.gitbook.io/hyperliquid-docs/builder-tools). The "Enable Trading" button in the UI handles both:

1. **Agent Authorization**: Allows the worker to execute trades on your behalf
2. **Builder Fee Approval**: Approves the 0.04% fee for trades

Once enabled:
- Hyperliquid automatically deducts the fee on each trade and pays the builder
- If a trigger is cancelled, no trade happens, so no fee is charged

To configure the builder address, set `BUILDER_ADDRESS` in the worker and `NEXT_PUBLIC_BUILDER_ADDRESS` in the frontend.

## Security

- **ReentrancyGuard** on all state-changing functions
- **AccessControl** for executor-only operations
- **Circuit Breaker** in worker to handle API failures
- **Oracle Verification** (optional) for execution price validation
- **Constant-Time Comparison** for API key authentication

## Development

```bash
# Run all services
pnpm dev

# Run specific service
pnpm dev:frontend
pnpm dev:api
pnpm dev:worker

# Run tests
pnpm test

# Lint
pnpm lint

# Build
pnpm build

# Type check
pnpm type-check
```

## Contract Deployment

```bash
# Deploy to testnet
pnpm --filter @hyper-trigger/contracts deploy:testnet

# Deploy to mainnet
pnpm --filter @hyper-trigger/contracts deploy:mainnet

# Grant executor role to worker
pnpm --filter @hyper-trigger/contracts ts-node scripts/grantExecutor.ts
```

## API Documentation

When running the API, OpenAPI docs are available at:
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/docs-json`

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, wagmi, viem
- **Backend**: NestJS, Prisma, PostgreSQL
- **Worker**: Node.js, viem, @nktkas/hyperliquid SDK
- **Contracts**: Solidity 0.8.19, Hardhat, OpenZeppelin
- **Monorepo**: Turborepo, pnpm workspaces

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---

Built for the Hyperliquid ecosystem 🚀

