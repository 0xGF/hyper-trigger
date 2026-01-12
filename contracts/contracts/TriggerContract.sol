// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title L1Read Interface
 * @dev Interface for HyperCore oracle precompile - provides real-time price data
 */
interface IL1Read {
    // Get oracle price for perp asset (returns price * 10^6 / 10^szDecimals)
    function oraclePx(uint32 index) external view returns (uint64);
    
    // Get oracle price for spot asset (returns price * 10^8 / 10^baseAssetSzDecimals)
    function spotOraclePx(uint32 index) external view returns (uint64);
}

/**
 * @title TriggerContract
 * @dev Stores price-based trigger orders for HyperCore spot trading
 * 
 * ARCHITECTURE:
 * - This contract ONLY stores trigger parameters (no funds held)
 * - User's actual funds remain in their HyperCore spot balance
 * - User must authorize the worker as an "agent" on Hyperliquid
 * - When trigger conditions are met, worker executes trade via Hyperliquid API
 * - Oracle prices are verified on-chain via HyperCore precompile
 * 
 * FLOW:
 * 1. User authorizes worker as agent on Hyperliquid (one-time, off-chain)
 * 2. User creates trigger here (stores intent on-chain)
 * 3. Worker monitors triggers + prices
 * 4. Condition met → Worker executes trade via HL API on user's behalf
 * 5. Worker marks trigger as executed here, price verified via oracle
 */
contract TriggerContract is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    
    // HyperCore oracle precompile for price verification (0x807)
    IL1Read constant ORACLE = IL1Read(0x0000000000000000000000000000000000000807);
    
    // Configuration
    uint256 public triggerFee = 0.001 ether; // Small fee to prevent spam
    uint256 public constant MAX_TRIGGER_DURATION = 30 days;
    uint256 public constant MIN_TRIGGER_DURATION = 1 hours;
    
    // Maximum price deviation allowed between worker price and oracle price (in basis points)
    // 200 = 2% max deviation
    uint256 public maxPriceDeviation = 200;
    
    enum TriggerStatus { Active, Executed, Cancelled, Expired, Failed }
    
    /**
     * @dev Trigger order parameters
     * NOTE: No funds are held by contract - this is just the order intent
     */
    struct Trigger {
        uint256 id;
        address user;              // User who created the trigger
        
        // Price monitoring
        string watchAsset;         // Asset to watch for price (e.g., "BTC")
        uint256 targetPrice;       // Price level to trigger at (6 decimals, like Hyperliquid)
        bool isAbove;              // true = trigger when >= price, false = when <= price
        
        // Trade to execute when triggered
        string tradeAsset;         // Asset to buy/sell (e.g., "FARTCOIN")
        bool isBuy;                // true = buy with USDC, false = sell for USDC
        uint256 amount;            // Amount in asset's native decimals (for buy: USDC amount, for sell: token amount)
        uint256 maxSlippage;       // Max slippage in basis points (e.g., 100 = 1%)
        
        // Metadata
        uint256 createdAt;
        uint256 expiresAt;
        TriggerStatus status;
        uint256 feePaid;           // Fee paid at creation (for accurate refunds)
        
        // Execution details (filled when executed)
        uint256 executedAt;
        uint256 executionPrice;
        bytes32 executionTxHash;   // Hyperliquid order ID or tx hash
    }
    
    // Storage
    mapping(uint256 => Trigger) public triggers;
    mapping(address => uint256[]) public userTriggers;
    uint256 public nextTriggerId = 1;
    uint256 public activeTriggerCount;  // Counter for active triggers (O(1) lookup)
    
    // Asset symbol to oracle index mapping (e.g., "HYPE" => 1035 for testnet spot)
    // Use spotOraclePx for spot assets
    mapping(string => uint32) public assetToSpotIndex;
    
    // Events
    event TriggerCreated(
        uint256 indexed triggerId,
        address indexed user,
        string watchAsset,
        uint256 targetPrice,
        bool isAbove,
        string tradeAsset,
        bool isBuy,
        uint256 amount
    );
    
    event TriggerExecuted(
        uint256 indexed triggerId,
        address indexed executor,
        uint256 executionPrice,
        bytes32 executionTxHash
    );
    
    event TriggerCancelled(uint256 indexed triggerId, address indexed user);
    event TriggerExpired(uint256 indexed triggerId);
    event TriggerFailed(uint256 indexed triggerId, string reason);
    event FeeUpdated(uint256 newFee);
    event AssetIndexSet(string asset, uint32 spotIndex);
    event PriceDeviationUpdated(uint256 newMaxDeviation);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }
    
    /**
     * @dev Create a new price-based trigger order
     * @param watchAsset Asset to monitor for price (e.g., "BTC", "ETH")
     * @param targetPrice Target price in 6 decimals (Hyperliquid format)
     * @param isAbove true = trigger when price >= target, false = when <= target
     * @param tradeAsset Asset to trade when triggered (e.g., "FARTCOIN", "HYPE")
     * @param isBuy true = buy tradeAsset with USDC, false = sell tradeAsset for USDC
     * @param amount Amount to trade (USDC amount for buy, token amount for sell)
     * @param maxSlippage Maximum slippage in basis points (100 = 1%)
     * @param durationHours How long the trigger is valid
     */
    function createTrigger(
        string calldata watchAsset,
        uint256 targetPrice,
        bool isAbove,
        string calldata tradeAsset,
        bool isBuy,
        uint256 amount,
        uint256 maxSlippage,
        uint256 durationHours
    ) external payable whenNotPaused nonReentrant returns (uint256 triggerId) {
        require(bytes(watchAsset).length > 0, "Watch asset required");
        require(bytes(tradeAsset).length > 0, "Trade asset required");
        require(targetPrice > 0, "Target price must be > 0");
        require(amount > 0, "Amount must be > 0");
        require(maxSlippage <= 5000, "Max slippage too high"); // Max 50%
        require(durationHours >= MIN_TRIGGER_DURATION / 1 hours, "Duration too short");
        require(durationHours <= MAX_TRIGGER_DURATION / 1 hours, "Duration too long");
        require(msg.value >= triggerFee, "Insufficient trigger fee");
        
        triggerId = nextTriggerId++;
        uint256 expiresAt = block.timestamp + (durationHours * 1 hours);
        
        triggers[triggerId] = Trigger({
            id: triggerId,
            user: msg.sender,
            watchAsset: watchAsset,
            targetPrice: targetPrice,
            isAbove: isAbove,
            tradeAsset: tradeAsset,
            isBuy: isBuy,
            amount: amount,
            maxSlippage: maxSlippage,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            status: TriggerStatus.Active,
            feePaid: msg.value,  // Store actual fee paid for accurate refunds
            executedAt: 0,
            executionPrice: 0,
            executionTxHash: bytes32(0)
        });
        
        userTriggers[msg.sender].push(triggerId);
        activeTriggerCount++;  // Increment counter
        
        emit TriggerCreated(
            triggerId,
            msg.sender,
            watchAsset,
            targetPrice,
            isAbove,
            tradeAsset,
            isBuy,
            amount
        );
    }
    
    /**
     * @dev Get oracle price for an asset
     * @param asset Asset symbol (e.g., "HYPE")
     * @return price Oracle price (8 decimals for spot)
     * @return valid Whether the oracle returned a valid price
     */
    function getOraclePrice(string memory asset) public view returns (uint64 price, bool valid) {
        uint32 spotIndex = assetToSpotIndex[asset];
        if (spotIndex == 0) {
            return (0, false);
        }
        
        try ORACLE.spotOraclePx(spotIndex) returns (uint64 oraclePrice) {
            return (oraclePrice, oraclePrice > 0);
        } catch {
            return (0, false);
        }
    }
    
    /**
     * @dev Verify execution price against oracle within acceptable deviation
     * @param asset Asset to verify
     * @param executionPrice Price reported by worker (6 decimals)
     * @return valid Whether the price is within acceptable bounds
     */
    function verifyPriceWithOracle(string memory asset, uint256 executionPrice) public view returns (bool valid) {
        (uint64 oraclePrice, bool oracleValid) = getOraclePrice(asset);
        
        // If no oracle mapping, skip verification (allow execution)
        if (!oracleValid) {
            return true;
        }
        
        // Convert oracle price (8 decimals) to 6 decimals for comparison
        uint256 normalizedOraclePrice = uint256(oraclePrice) / 100;
        
        // Calculate deviation: |executionPrice - oraclePrice| / oraclePrice * 10000
        uint256 deviation;
        if (executionPrice > normalizedOraclePrice) {
            deviation = ((executionPrice - normalizedOraclePrice) * 10000) / normalizedOraclePrice;
        } else {
            deviation = ((normalizedOraclePrice - executionPrice) * 10000) / normalizedOraclePrice;
        }
        
        return deviation <= maxPriceDeviation;
    }
    
    /**
     * @dev Mark trigger as executed (called by worker after executing trade on Hyperliquid)
     * Verifies execution price against on-chain oracle
     * @param triggerId The trigger to mark executed
     * @param executionPrice The price at which the trade was executed
     * @param executionTxHash The Hyperliquid order ID or transaction reference
     */
    function markExecuted(
        uint256 triggerId,
        uint256 executionPrice,
        bytes32 executionTxHash
    ) external onlyRole(EXECUTOR_ROLE) {
        Trigger storage trigger = triggers[triggerId];
        require(trigger.status == TriggerStatus.Active, "Trigger not active");
        
        // Verify execution price against oracle (for the trade asset)
        require(
            verifyPriceWithOracle(trigger.tradeAsset, executionPrice),
            "Execution price deviates too much from oracle"
        );
        
        trigger.status = TriggerStatus.Executed;
        trigger.executedAt = block.timestamp;
        trigger.executionPrice = executionPrice;
        trigger.executionTxHash = executionTxHash;
        activeTriggerCount--;  // Decrement counter
        
        emit TriggerExecuted(triggerId, msg.sender, executionPrice, executionTxHash);
    }
    
    /**
     * @dev Mark trigger as failed (called by worker if trade fails)
     * @param triggerId The trigger that failed
     * @param reason Why it failed
     */
    function markFailed(uint256 triggerId, string calldata reason) external onlyRole(EXECUTOR_ROLE) {
        Trigger storage trigger = triggers[triggerId];
        require(trigger.status == TriggerStatus.Active, "Trigger not active");
        
        trigger.status = TriggerStatus.Failed;
        activeTriggerCount--;  // Decrement counter
        
        emit TriggerFailed(triggerId, reason);
    }
    
    /**
     * @dev Cancel an active trigger (user only)
     */
    function cancelTrigger(uint256 triggerId) external nonReentrant {
        Trigger storage trigger = triggers[triggerId];
        require(trigger.user == msg.sender, "Not trigger owner");
        require(trigger.status == TriggerStatus.Active, "Trigger not active");
        
        // Store fee before state changes (CEI pattern)
        uint256 refundAmount = trigger.feePaid;
        
        // Update state first
        trigger.status = TriggerStatus.Cancelled;
        activeTriggerCount--;  // Decrement counter
        
        // Refund the actual fee paid (not current triggerFee)
        if (refundAmount > 0) {
            (bool success,) = msg.sender.call{value: refundAmount}("");
            require(success, "Fee refund failed");
        }
        
        emit TriggerCancelled(triggerId, msg.sender);
    }
    
    /**
     * @dev Update a trigger's price in a single atomic transaction
     * Cancels the old trigger and creates a new one with updated price
     * @param oldTriggerId The trigger to update
     * @param newTargetPrice New target price (6 decimals)
     * @param newIsAbove New direction (true = above, false = below)
     */
    function updateTriggerPrice(
        uint256 oldTriggerId,
        uint256 newTargetPrice,
        bool newIsAbove
    ) external payable whenNotPaused nonReentrant returns (uint256 newTriggerId) {
        Trigger storage oldTrigger = triggers[oldTriggerId];
        require(oldTrigger.user == msg.sender, "Not trigger owner");
        require(oldTrigger.status == TriggerStatus.Active, "Trigger not active");
        require(newTargetPrice > 0, "Target price must be > 0");
        
        // Store old trigger data before cancellation
        string memory watchAsset = oldTrigger.watchAsset;
        string memory tradeAsset = oldTrigger.tradeAsset;
        bool isBuy = oldTrigger.isBuy;
        uint256 amount = oldTrigger.amount;
        uint256 maxSlippage = oldTrigger.maxSlippage;
        uint256 oldFeePaid = oldTrigger.feePaid;
        
        // Cancel old trigger (update state)
        oldTrigger.status = TriggerStatus.Cancelled;
        activeTriggerCount--;
        
        emit TriggerCancelled(oldTriggerId, msg.sender);
        
        // Calculate total fee available (refund + any additional payment)
        uint256 totalFee = oldFeePaid + msg.value;
        require(totalFee >= triggerFee, "Insufficient trigger fee");
        
        // Create new trigger with same duration (24 hours from now)
        newTriggerId = nextTriggerId++;
        uint256 expiresAt = block.timestamp + (24 hours);
        
        triggers[newTriggerId] = Trigger({
            id: newTriggerId,
            user: msg.sender,
            watchAsset: watchAsset,
            targetPrice: newTargetPrice,
            isAbove: newIsAbove,
            tradeAsset: tradeAsset,
            isBuy: isBuy,
            amount: amount,
            maxSlippage: maxSlippage,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            status: TriggerStatus.Active,
            feePaid: totalFee,
            executedAt: 0,
            executionPrice: 0,
            executionTxHash: bytes32(0)
        });
        
        userTriggers[msg.sender].push(newTriggerId);
        activeTriggerCount++;
        
        emit TriggerCreated(
            newTriggerId,
            msg.sender,
            watchAsset,
            newTargetPrice,
            newIsAbove,
            tradeAsset,
            isBuy,
            amount
        );
    }
    
    /**
     * @dev Check if trigger conditions are met
     * @param triggerId The trigger to check
     * @param currentPrice Current price of the watch asset (6 decimals)
     */
    function checkTrigger(uint256 triggerId, uint256 currentPrice) 
        external 
        view 
        returns (bool shouldExecute, string memory reason) 
    {
        Trigger storage trigger = triggers[triggerId];
        
        if (trigger.status != TriggerStatus.Active) {
            return (false, "Trigger not active");
        }
        
        if (block.timestamp > trigger.expiresAt) {
            return (false, "Trigger expired");
        }
        
        if (currentPrice == 0) {
            return (false, "Invalid price");
        }
        
        bool conditionMet = trigger.isAbove ? 
            currentPrice >= trigger.targetPrice : 
            currentPrice <= trigger.targetPrice;
        
        if (!conditionMet) {
            return (false, "Price condition not met");
        }
        
        return (true, "Ready to execute");
    }
    
    /**
     * @dev Clean up expired triggers
     */
    function markExpired(uint256[] calldata triggerIds) external {
        for (uint256 i = 0; i < triggerIds.length; i++) {
            Trigger storage trigger = triggers[triggerIds[i]];
            
            if (trigger.status == TriggerStatus.Active && block.timestamp > trigger.expiresAt) {
                trigger.status = TriggerStatus.Expired;
                activeTriggerCount--;  // Decrement counter
                emit TriggerExpired(triggerIds[i]);
            }
        }
    }
    
    // ============================================
    // View Functions
    // ============================================
    
    function getTrigger(uint256 triggerId) external view returns (Trigger memory) {
        return triggers[triggerId];
    }
    
    function getUserTriggers(address user) external view returns (uint256[] memory) {
        return userTriggers[user];
    }
    
    function getUserActiveTriggers(address user) external view returns (Trigger[] memory) {
        uint256[] memory ids = userTriggers[user];
        uint256 activeCount = 0;
        
        // Count active triggers
        for (uint256 i = 0; i < ids.length; i++) {
            if (triggers[ids[i]].status == TriggerStatus.Active) {
                activeCount++;
            }
        }
        
        // Build result array
        Trigger[] memory result = new Trigger[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (triggers[ids[i]].status == TriggerStatus.Active) {
                result[j++] = triggers[ids[i]];
            }
        }
        
        return result;
    }
    
    function getActiveTriggerCount() external view returns (uint256) {
        return activeTriggerCount;  // O(1) lookup using counter
    }
    
    // ============================================
    // Admin Functions
    // ============================================
    
    function updateTriggerFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        triggerFee = newFee;
        emit FeeUpdated(newFee);
    }
    
    /**
     * @dev Set oracle index for an asset (for price verification)
     * @param asset Asset symbol (e.g., "HYPE")
     * @param spotIndex Spot oracle index from HyperCore
     */
    function setAssetIndex(string calldata asset, uint32 spotIndex) external onlyRole(DEFAULT_ADMIN_ROLE) {
        assetToSpotIndex[asset] = spotIndex;
        emit AssetIndexSet(asset, spotIndex);
    }
    
    /**
     * @dev Batch set oracle indexes for multiple assets
     */
    function setAssetIndexes(string[] calldata assets, uint32[] calldata spotIndexes) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(assets.length == spotIndexes.length, "Array length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            assetToSpotIndex[assets[i]] = spotIndexes[i];
            emit AssetIndexSet(assets[i], spotIndexes[i]);
        }
    }
    
    /**
     * @dev Update max price deviation allowed (in basis points)
     */
    function updateMaxPriceDeviation(uint256 newMaxDeviation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMaxDeviation <= 1000, "Deviation too high"); // Max 10%
        maxPriceDeviation = newMaxDeviation;
        emit PriceDeviationUpdated(newMaxDeviation);
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success,) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    receive() external payable {}
}
