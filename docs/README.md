# 📚 HyperTrigger Documentation

## 📋 Documentation Index

### 🚀 **Getting Started**
- [Main README](../README.md) - Quick start and overview
- [Contract Setup](./contract-documentation.md) - Detailed contract configuration

### 🔐 **Security**
- [Security Architecture](./security-architecture.md) - Complete security model
- [Security Audit](./security-audit.md) - Audit findings and fixes

### 🛠️ **Technical**
- [Technical Documentation](./technical-docs.md) - In-depth technical details

## 🏗️ **Project Structure**

```
hyper-trigger/
├── apps/
│   ├── frontend/          # Next.js UI application
│   ├── backend/           # Express.js API server
│   ├── worker/            # Executor bot service
│   └── contracts/         # Smart contract deployment
├── docs/                  # Documentation (this folder)
├── scripts/               # Setup and deployment scripts
└── README.md              # Main project overview
```

## 🚀 **Quick Commands**

```bash
# Start all services
pnpm dev

# Individual services
pnpm dev:backend           # API server
pnpm dev:frontend          # UI application
pnpm dev:worker            # Executor bot
pnpm dev:db-studio         # Database admin

# Smart contracts
pnpm contracts:compile     # Compile contracts
pnpm contracts:deploy:testnet  # Deploy to testnet

# Database
pnpm db:migrate            # Run migrations
pnpm db:studio             # Open admin panel
```

## 🎯 **Current Status**

- ✅ Smart contracts deployed to HyperEVM testnet
- ✅ Backend API running with database
- ✅ Frontend application ready
- 🔄 Worker bot in development
- ✅ Unified development environment

## 📞 **Support**

For questions or issues, check the main [README](../README.md) or create an issue in the repository. 