# HyperTrigger Smart Contracts

> Decentralized cross-asset trigger system for HyperEVM

## Quick Start

```bash
# Install dependencies
npm install

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network hyperevm-testnet

# Test oracle functionality
npx hardhat run scripts/test-oracle-indices.ts --network hyperevm-testnet
```

## Architecture

### Core Contracts

| Contract | Purpose | Status |
|----------|---------|--------|
| `TriggerManager.sol` | Main trigger system | ✅ Production Ready |
| `L1Read.sol` | HyperCore data reader | ✅ Utility |
| `MockToken.sol` | Testing token | 🧪 Testing Only |

### Key Features

- **Real Oracle Integration** - Hyperliquid precompile contracts
- **Cross-Asset Triggers** - Conditional trading across any assets
- **Immediate Swaps** - Execute trades at current market price
- **Secure Execution** - Role-based bot system with rewards
- **Emergency Controls** - User cancellation and admin pause

## Contract Status

### ✅ What Works
- Trigger creation and storage
- Oracle price monitoring via Hyperliquid precompiles
- Condition checking and event emission
- User fund management and refunds
- Role-based access control

### ⚠️ Current Limitations
- **No Real Trading Yet** - `_performRealSwap()` reverts with `RealTradingNotAvailable()`
- Asset swapping via HyperCore needs implementation
- Cross-layer token transfers not implemented

## Documentation

📖 **[Complete Contract Documentation](./CONTRACT-DOCUMENTATION.md)**
- Full API reference
- Integration examples
- Security features
- Frontend/Worker integration guides

## Scripts

| Script | Purpose |
|--------|---------|
| `deploy.ts` | Deploy TriggerManager contract |
| `test-oracle-indices.ts` | Test oracle functionality |
| `grant-executor-role.ts` | Grant executor permissions |
| `emergency-withdraw.ts` | Emergency fund recovery |

## Network Configuration

### HyperEVM Testnet
- **Chain ID:** 998
- **RPC:** `https://api.hyperliquid-testnet.xyz/evm`
- **Current Deployment:** `0xD902BBCaE751a098AFAf4735027ea33b08f7Ff68`

## Integration

### Frontend
```typescript
import { CONTRACTS, TRIGGER_MANAGER_ABI } from './constants'

const contract = new ethers.Contract(
  CONTRACTS.TRIGGER_MANAGER.ADDRESS,
  TRIGGER_MANAGER_ABI,
  signer
)
```

### Worker Bot
```typescript
// Monitor prices and execute triggers
const [price, coin] = await contract.getCurrentPrice(assetIndex)
const tx = await contract.executeTrigger(triggerId)
```

## Security

- **Access Control** - Role-based permissions
- **Reentrancy Protection** - OpenZeppelin ReentrancyGuard
- **Emergency Controls** - Pausable and emergency withdrawal
- **Input Validation** - Comprehensive parameter checking

## Development

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy locally
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**For detailed integration guides and API documentation, see [CONTRACT-DOCUMENTATION.md](./CONTRACT-DOCUMENTATION.md)** 