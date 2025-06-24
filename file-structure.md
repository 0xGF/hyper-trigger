# 🎯 HyperTrigger Project Structure

## Project Overview
Cross-chain triggered trading platform built on HyperEVM with unified token configuration.

## 📁 Root Structure
```
hyper-trigger/
├── apps/
│   ├── frontend/                 # Next.js frontend application ✅ WORKING
│   └── worker/                   # Background worker for trigger execution ✅ WORKING
├── packages/
│   └── shared/                   # Shared token configuration ✅ WORKING
├── contracts/                    # Smart contracts (Hardhat project) ⚠️ BUILD ISSUES
├── pnpm-workspace.yaml          # pnpm workspace configuration
└── file-structure.md            # This file
```

## 🎯 Frontend Application (`apps/frontend/`)
```
apps/frontend/
├── .env                         # ✅ Environment variables (contract addresses)
├── .env.example                 # ✅ Environment template
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ✅ Root layout with providers
│   │   ├── page.tsx            # ✅ Home page with swap interface
│   │   ├── providers.tsx       # ✅ Wagmi and RainbowKit providers
│   │   └── triggers/
│   │       └── page.tsx        # ✅ Triggers management page
│   ├── components/
│   │   ├── swap/
│   │   │   └── SwapForm.tsx    # ✅ Token swap interface
│   │   └── triggers/
│   │       ├── TriggerForm.tsx # ✅ Create trigger form (USDC-only)
│   │       ├── TriggerList.tsx # ✅ List user triggers
│   │       ├── TransactionTracker.tsx # ✅ Track trigger events
│   │       └── constants.ts    # ✅ Contract addresses & ABIs
│   ├── hooks/
│   │   ├── useTriggerContract.ts # ✅ Contract interaction hooks
│   │   ├── useUserTriggers.ts  # ✅ User triggers management
│   │   └── useSwapContract.ts  # ✅ Swap contract hooks
│   └── lib/
│       ├── contracts.ts        # ✅ Contract configurations
│       └── networks.ts         # ✅ Network configurations
├── next.config.js              # ✅ Next.js configuration
├── tailwind.config.ts          # ✅ Tailwind CSS configuration
└── package.json                # ✅ Dependencies
```

## 🤖 Worker Service (`apps/worker/`)
```
apps/worker/
├── .env                        # ✅ Environment variables (private key)
├── .env.example                # ✅ Environment template
├── src/
│   └── index.ts               # ✅ Main worker logic with trigger monitoring
├── package.json               # ✅ Dependencies
└── tsconfig.json              # ✅ TypeScript configuration
```

## 📦 Shared Package (`packages/shared/`)
```
packages/shared/
├── src/
│   ├── index.ts               # ✅ Main exports
│   ├── tokens.ts              # ✅ Unified token definitions
│   └── types.ts               # ✅ Shared type definitions
├── package.json               # ✅ Package configuration
└── tsconfig.json              # ✅ TypeScript configuration
```

## 🏗️ Smart Contracts (`contracts/`)
```
contracts/
├── contracts/
│   ├── SwapContract.sol       # ✅ DEPLOYED: 0x3a1fbD8b62ADE45ED9100F3a14295963eAF6a880
│   └── TriggerContract.sol    # ✅ DEPLOYED: 0xc2E9F304a365fc85A007805C6D569FB900817102
├── scripts/
│   └── deploy.ts              # ✅ Deployment script
├── src/
│   └── types/                 # ⚠️ Generated types with build issues
├── hardhat.config.ts          # ✅ Hardhat configuration
└── package.json               # ⚠️ Build fails due to old type references
```

## 🚀 Deployment Status

### ✅ **HyperEVM Testnet Contracts**
- **SwapContract**: `0x3a1fbD8b62ADE45ED9100F3a14295963eAF6a880`
- **TriggerContract**: `0xc2E9F304a365fc85A007805C6D569FB900817102`

### ✅ **Environment Configuration**
- **Frontend**: Uses contract addresses from `.env`
- **Worker**: Uses contract addresses and private key from `.env`
- **Shared**: Provides unified token configuration

### ⚠️ **Known Issues**
- **Contracts Package**: Build fails due to old TypeScript type references
- **Solution**: Frontend and worker use direct contract addresses/ABIs instead

## 🔧 Development Commands

### **Frontend**
```bash
cd apps/frontend
pnpm dev     # Start development server
pnpm build   # ✅ Production build
```

### **Worker**
```bash
cd apps/worker
pnpm dev     # Start worker in development
pnpm build   # ✅ Production build
pnpm start   # Start production worker
```

### **Root**
```bash
pnpm dev                    # Start all apps in parallel
pnpm build                  # ⚠️ Fails on contracts package
pnpm dev:frontend          # Start only frontend
pnpm dev:worker            # Start only worker
```

## 📝 Contract Updates Applied

✅ **All contract addresses updated to new deployments**
✅ **Frontend uses new TriggerContract for USDC-only triggers**
✅ **Worker updated with new contract addresses and ABIs**
✅ **Environment variables properly configured per app**
✅ **Shared token configuration working across all apps**

The system is now ready for production with the new contract addresses!