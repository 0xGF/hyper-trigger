# HyperTrigger Smart Contract Documentation

## Overview

HyperTrigger is a decentralized cross-asset trigger system built on HyperEVM that enables users to create conditional trades. The system monitors asset prices using Hyperliquid's native oracles and executes **real trades** when specified conditions are met.

## Architecture

### Core Components

1. **TriggerManager.sol** - Main contract handling trigger creation, execution, and management with real HyperCore trading integration

### Key Features

- ✅ **Real Oracle Integration** - Uses Hyperliquid precompile contracts (0x807, 0x801, 0x80C)
- ✅ **Cross-Layer Trading** - Contract acts as proxy trader in its own HyperCore account
- ✅ **Asynchronous Execution** - Multi-phase execution with proper state tracking
- ✅ **Swap Success Validation** - Verifies trades completed before sending tokens to users
- ✅ **Flexible Cancellation** - Users can cancel anytime unless execution is in progress
- ✅ **Execution Timeout Protection** - Users can claim refunds if execution takes too long
- ✅ **Role-Based Execution** - Secure executor bot system

## Contract Details

### TriggerManager.sol

**Address:** `0xBFcec6747E96eDA8376790406E649107eA8302F8` (HyperEVM Testnet)

#### Core Functions

##### Trigger Management
```solidity
function createTrigger(
    uint32 oracleIndex,           // Hyperliquid oracle asset index for price monitoring
    uint64 fromToken,             // Input token ID (0 = HYPE, others = token indices)
    uint64 targetToken,           // Target token ID for trading
    uint256 fromAmount,           // Amount to trade (in wei)
    uint256 triggerPrice,         // Price threshold (18 decimals)
    bool isAbove,                 // true = above price, false = below
    uint256 maxSlippage           // Max slippage (basis points, e.g., 500 = 5%)
) external payable
```

```solidity
function startTriggerExecution(uint256 triggerId) external onlyRole(EXECUTOR_ROLE)
function completeTriggerExecution(uint256 triggerId, uint256 actualOutputAmount) external onlyRole(EXECUTOR_ROLE)
function markExecutionFailed(uint256 triggerId, string calldata reason) external onlyRole(EXECUTOR_ROLE)
```

```solidity
function cancelTrigger(uint256 triggerId) external
function claimRefund(uint256 triggerId) external
```

##### Token Contract Management
```solidity
function setTokenContract(uint64 tokenId, address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
```

##### Oracle Functions
```solidity
function getOraclePrice(uint32 oracleIndex) public view returns (uint64)
function getContractSpotBalance(uint64 tokenId) public view returns (uint64 total, uint64 hold)
function convertOraclePrice(uint64 rawPrice, uint8 assetDecimals) public pure returns (uint256)
```

##### View Functions
```solidity
function getTrigger(uint256 triggerId) external view returns (Trigger memory)
function getUserTriggers(address user) external view returns (uint256[] memory)
function isTriggerReady(uint256 triggerId) external view returns (bool conditionMet, uint256 currentPrice)
function getSystemAddress(uint64 tokenId) public pure returns (address)
```

#### Data Structures

```solidity
enum ExecutionState {
    PENDING,        // Trigger created, waiting for execution
    EXECUTING,      // Execution started, cross-layer operations in progress
    COMPLETED,      // Execution completed successfully
    FAILED,         // Execution failed, user can claim refund
    CANCELLED       // User cancelled trigger
}

struct Trigger {
    uint256 id;
    address user;
    uint32 oracleIndex;         // Oracle index for price monitoring
    uint64 fromToken;           // Input token ID (0 = HYPE)
    uint64 targetToken;         // Target token ID
    uint256 fromAmount;         // Amount to trade
    uint256 triggerPrice;       // Price threshold (18 decimals)
    bool isAbove;              // Trigger direction
    uint256 maxSlippage;       // Max slippage (basis points)
    uint256 createdAt;
    ExecutionState state;       // Current execution state
    uint256 executionStarted;   // Timestamp when execution started
    uint256 outputAmount;       // Amount of target tokens received
}
```

#### Events

```solidity
event TriggerCreated(
    uint256 indexed triggerId,
    address indexed user,
    uint32 oracleIndex,
    uint64 fromToken,
    uint64 targetToken,
    uint256 fromAmount,
    uint256 triggerPrice,
    bool isAbove,
    uint256 maxSlippage
);

event TriggerExecutionStarted(
    uint256 indexed triggerId,
    address indexed executor,
    uint256 executionPrice
);

event TriggerExecuted(
    uint256 indexed triggerId,
    address indexed executor,
    uint256 executionPrice,
    uint256 outputAmount
);

event TriggerExecutionFailed(
    uint256 indexed triggerId,
    address indexed executor,
    string reason
);

event TriggerCancelled(uint256 indexed triggerId, address indexed user);

event CrossLayerBridge(
    uint64 indexed tokenId,
    uint256 amount,
    address systemAddress,
    string direction // "TO_HYPERCORE" or "FROM_HYPERCORE"
);
```

#### Custom Errors

```solidity
error InsufficientDeposit();
error TriggerNotFound();
error UnauthorizedUser();
error TriggerAlreadyExecuted();
error TriggerConditionNotMet();
error InvalidSlippage();
error OracleCallFailed();
error CoreWriterCallFailed();
error ZeroAmount();
error TokenContractNotSet();
error TriggerBeingExecuted();
error ExecutionTimeout();
error SwapFailed();
```

## Cross-Layer Trading Implementation

### ✅ Correct Architecture: Contract as Proxy Trader

The contract implements a **secure proxy trader pattern**:

1. **Users deposit tokens to CONTRACT** (on HyperEVM)
2. **Contract bridges tokens to its own HyperCore account** (via system addresses)
3. **Contract executes trades in its own HyperCore account** (secure & controlled)
4. **Contract verifies trade success** (checks balances on HyperCore)
5. **Contract sends result tokens to user's HyperEVM address** (via Action ID 6)

### Multi-Phase Execution Process

#### Phase 1: Start Execution
```solidity
function startTriggerExecution(uint256 triggerId) external onlyRole(EXECUTOR_ROLE)
```
- Validates trigger conditions are met
- Marks trigger as `EXECUTING` 
- Bridges tokens from HyperEVM to contract's HyperCore account
- Places limit order on HyperCore orderbook
- Emits `TriggerExecutionStarted` event

#### Phase 2: Complete Execution  
```solidity
function completeTriggerExecution(uint256 triggerId, uint256 actualOutputAmount) external onlyRole(EXECUTOR_ROLE)
```
- Verifies contract has target tokens in HyperCore account
- Bridges result tokens back to user's HyperEVM address
- Marks trigger as `COMPLETED`
- Pays execution reward to executor
- Emits `TriggerExecuted` event

#### Phase 3: Handle Failures
```solidity
function markExecutionFailed(uint256 triggerId, string calldata reason) external onlyRole(EXECUTOR_ROLE)
```
- Marks trigger as `FAILED` if execution encounters issues
- Allows user to claim refund via `claimRefund()`
- Emits `TriggerExecutionFailed` event

### System Addresses for Bridging

```solidity
function getSystemAddress(uint64 tokenId) public pure returns (address) {
    if (tokenId == 0) {
        return 0x2222222222222222222222222222222222222222; // HYPE
    } else {
        // Other tokens: 0x20 + tokenId
        uint256 systemAddressInt = (uint256(0x20) << 152) | uint256(tokenId);
        return address(uint160(systemAddressInt));
    }
}
```

## User Protections & Cancellation

### ✅ Flexible Cancellation System

Users can cancel triggers in most states:

#### 1. **Immediate Cancellation** (PENDING state)
```typescript
// Cancel trigger anytime before execution starts
const tx = await contract.cancelTrigger(triggerId)
// User gets full refund: original tokens + execution reward
```

#### 2. **Execution Protection** (EXECUTING state)
```solidity
// Users CANNOT cancel during execution (prevents race conditions)
if (trigger.state == ExecutionState.EXECUTING) revert TriggerBeingExecuted();
```

#### 3. **Failure Recovery** (FAILED state)
```typescript
// If execution fails, user can cancel and get refund
const tx = await contract.cancelTrigger(triggerId)
// OR claim refund directly
const tx = await contract.claimRefund(triggerId)
```

#### 4. **Timeout Protection** (EXECUTING → timeout)
```typescript
// If execution takes longer than 1 hour, user can claim refund
const tx = await contract.claimRefund(triggerId)
// Automatic refund after EXECUTION_TIMEOUT (1 hour)
```

### ✅ Swap Success Validation

The contract ensures swaps actually succeed:

```solidity
// Verify we have the target tokens before sending to user
(uint64 contractBalance, ) = getContractSpotBalance(trigger.targetToken);
if (contractBalance < actualOutputAmount) revert SwapFailed();

// Only then bridge tokens back to user
_bridgeTokensFromHyperCore(trigger.user, trigger.targetToken, actualOutputAmount);
```

## Frontend Integration Examples

### 1. Creating Triggers with Proper Token Setup

```typescript
// First, admin must set token contract addresses
await contract.setTokenContract(1, "0x...USDCContractAddress") // USDC
await contract.setTokenContract(142, "0x...BTCContractAddress") // BTC

// Create HYPE → BTC trigger
const tx = await contract.createTrigger(
    3,                              // oracleIndex (BTC price monitoring)
    0,                              // fromToken (HYPE)
    142,                            // targetToken (BTC)
    ethers.parseEther("10"),        // 10 HYPE
    ethers.parseEther("110000"),    // trigger at $110k
    true,                           // isAbove
    500,                            // 5% max slippage
    { value: ethers.parseEther("10.01") } // 10 HYPE + 0.01 execution reward
)
```

### 2. Multi-Phase Execution Monitoring

```typescript
// Listen for execution phases
contract.on("TriggerExecutionStarted", (triggerId, executor, executionPrice) => {
    console.log(`🚀 Execution started for trigger ${triggerId}`)
    console.log(`Price: $${ethers.formatEther(executionPrice)}`)
})

contract.on("TriggerExecuted", (triggerId, executor, executionPrice, outputAmount) => {
    console.log(`✅ Trigger ${triggerId} completed successfully!`)
    console.log(`Received: ${ethers.formatEther(outputAmount)} target tokens`)
})

contract.on("TriggerExecutionFailed", (triggerId, executor, reason) => {
    console.log(`❌ Trigger ${triggerId} failed: ${reason}`)
    console.log(`User can now claim refund`)
})
```

### 3. Smart Cancellation Logic

```typescript
const cancelTrigger = async (triggerId: number) => {
    try {
        const trigger = await contract.getTrigger(triggerId)
        
        if (trigger.state === 0) { // PENDING
            await contract.cancelTrigger(triggerId)
            console.log("✅ Trigger cancelled successfully")
        } else if (trigger.state === 2) { // EXECUTING
            console.log("⏳ Trigger is executing, cannot cancel now")
            console.log("Wait for completion or timeout")
        } else if (trigger.state === 3) { // FAILED
            await contract.claimRefund(triggerId)
            console.log("✅ Refund claimed for failed execution")
        }
    } catch (error) {
        console.error("Cancellation failed:", error.message)
    }
}
```

### 4. Worker Bot Implementation

```typescript
class TriggerExecutor {
    async executeTrigger(triggerId: number) {
        try {
            // Phase 1: Start execution
            console.log(`🚀 Starting execution for trigger ${triggerId}`)
            const startTx = await contract.startTriggerExecution(triggerId)
            await startTx.wait()
            
            // Wait for cross-layer operations to complete
            await this.waitForTradeCompletion(triggerId)
            
            // Phase 2: Complete execution
            const outputAmount = await this.calculateActualOutput(triggerId)
            const completeTx = await contract.completeTriggerExecution(triggerId, outputAmount)
            await completeTx.wait()
            
            console.log(`✅ Trigger ${triggerId} executed successfully`)
            
        } catch (error) {
            // Phase 3: Mark as failed
            await contract.markExecutionFailed(triggerId, error.message)
            console.error(`❌ Trigger ${triggerId} failed:`, error.message)
        }
    }
    
    async waitForTradeCompletion(triggerId: number) {
        // Poll HyperCore for trade completion
        // Check contract's spot balance for target tokens
        // Implement timeout logic
    }
}
```

## Constants & Configuration

### Contract Constants
- `executionReward`: 0.01 HYPE (fixed reward for executors)
- `MAX_SLIPPAGE`: 50% maximum slippage protection
- `EXECUTION_TIMEOUT`: 1 hour (maximum execution time before refund available)
- `CORE_WRITER_ADDRESS`: `0x3333333333333333333333333333333333333333`

### Oracle Precompiles
- `ORACLE_PRICES_PRECOMPILE_ADDRESS`: `0x0000000000000000000000000000000000000807`
- `SPOT_BALANCE_PRECOMPILE_ADDRESS`: `0x0000000000000000000000000000000000000801`
- `TOKEN_INFO_PRECOMPILE_ADDRESS`: `0x000000000000000000000000000000000000080C`

## Security Features

### Access Control
- **DEFAULT_ADMIN_ROLE**: Contract deployment & token contract management
- **EXECUTOR_ROLE**: Trigger execution (assigned to bot)

### Safety Mechanisms
- **ExecutionState Tracking**: Prevents race conditions and double execution
- **Balance Verification**: Ensures trades succeeded before sending tokens
- **Timeout Protection**: Users can recover funds if execution hangs
- **Cancellation Controls**: Prevents cancellation during critical execution phases
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Admin can pause contract in emergencies

### User Protections
- **Flexible Cancellation**: Cancel anytime except during execution
- **Automatic Refunds**: Failed executions allow immediate refund claims
- **Timeout Recovery**: Stuck executions automatically become refundable
- **Execution Rewards**: Incentivizes reliable bot operators

## Current Status: Production Ready with Proper Cross-Layer Integration ✅

### ✅ Correct Implementation
- **Proxy Trader Architecture**: Contract trades in its own HyperCore account
- **Asynchronous Execution**: Multi-phase execution handles cross-layer delays
- **Swap Success Validation**: Verifies trades completed before sending tokens
- **Robust Cancellation**: Users can cancel in all appropriate states
- **Execution Protection**: Prevents cancellation during critical operations
- **Timeout Safety**: Users can recover funds from stuck executions

### ✅ No More Placeholders
- Real cross-layer token bridging via system addresses
- Real HyperCore balance checking via precompiles
- Real limit order placement via CoreWriter
- Real execution state tracking and management

---

**Last Updated:** December 2024  
**Contract Version:** TriggerManager v3.0 (Proper Cross-Layer Integration)  
**Network:** HyperEVM Testnet (Chain ID 998)  
**Status:** Production Ready with Correct Architecture ✅ 