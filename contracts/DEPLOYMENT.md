# HyperTrigger Smart Contract Deployment

## Prerequisites

1. **Generate a Deployment Wallet**
   - Create a new wallet specifically for deployment
   - You can use: https://vanity-eth.tk/ or any wallet generator
   - **NEVER use your main wallet for deployment**

2. **Fund the Deployment Wallet**
   - **Testnet**: Get testnet HYPE tokens from faucet
   - **Mainnet**: Transfer HYPE tokens for gas fees

3. **Configure Environment**
   ```bash
   cp .env .env.local
   # Edit .env.local and add your private key (without 0x prefix)
   ```

## Deployment Commands

### Deploy to Testnet (Recommended First)
```bash
npx hardhat run scripts/deploy.ts --network hyperevm-testnet
```

### Deploy to Mainnet
```bash
npx hardhat run scripts/deploy.ts --network hyperevm-mainnet
```

## Verify Contracts (Optional)
```bash
# After deployment, verify on explorer
npx hardhat verify --network hyperevm-testnet <CONTRACT_ADDRESS>
```

## Post-Deployment Steps

1. **Update Backend Configuration**
   - Copy deployed contract addresses
   - Update `packages/backend/src/config/index.ts` with contract addresses

2. **Update Frontend Configuration**
   - Update contract addresses in frontend configuration
   - Test trigger creation and management

3. **Deploy Executor Bots**
   - Set up executor bot with EXECUTOR_ROLE
   - Fund bot wallet with HYPE for execution gas

## Contract Addresses

### Testnet (Chain ID: 998)
- TriggerManager: `<DEPLOY_AND_UPDATE_HERE>`

### Mainnet (Chain ID: 999)
- TriggerManager: `<DEPLOY_AND_UPDATE_HERE>`

## Security Notes

- The deployment wallet only needs enough HYPE for deployment gas
- After deployment, the admin role can be transferred to a multisig
- Executor roles should be granted to trusted bot addresses only
- Always test on testnet before mainnet deployment 