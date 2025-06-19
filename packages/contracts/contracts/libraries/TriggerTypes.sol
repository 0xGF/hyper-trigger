// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TriggerTypes - HyperEVM Trigger Data Structures
 * @dev Simplified data structures for HyperCore order book integration
 * @notice Optimized for HyperEVM's direct price access and future order execution
 */
library TriggerTypes {
    
    /**
     * @dev Comparison operators for trigger conditions
     */
    enum ComparisonOperator {
        GreaterThan,         // >
        LessThan,            // <
        GreaterThanOrEqual,  // >=
        LessThanOrEqual      // <=
    }

    /**
     * @dev Action types for trigger execution
     */
    enum ActionType {
        BUY,    // Buy target asset when condition is met
        SELL    // Sell target asset when condition is met
    }

    /**
     * @dev Main trigger structure optimized for HyperEVM
     */
    struct Trigger {
        uint256 id;                          // Unique trigger identifier
        address user;                        // Trigger creator
        string baseAsset;                    // Asset to monitor (e.g., "BTC")
        string targetAsset;                  // Asset to trade (e.g., "ETH")
        ComparisonOperator operator;         // Trigger condition operator
        uint256 triggerPrice;               // Price threshold (in appropriate decimals)
        ActionType action;                   // Buy or sell action
        uint256 amount;                     // Amount to trade
        uint256 slippageTolerance;          // Max slippage in basis points (e.g., 100 = 1%)
        uint256 expiration;                 // Expiration timestamp (0 = no expiration)
        uint256 executionReward;            // Reward for executor (in native token)
        bool isActive;                      // Whether trigger is active
        uint256 createdAt;                  // Creation timestamp
    }

    /**
     * @dev Event data for trigger execution
     */
    struct ExecutionData {
        uint256 executionPrice;             // Price at execution
        uint256 amountExecuted;             // Actual amount traded
        uint256 executorReward;             // Reward paid to executor
        address executor;                   // Address that executed the trigger
        uint256 executedAt;                 // Execution timestamp
        bytes32 txHash;                     // Execution transaction hash
    }

    /**
     * @dev Trigger statistics for analytics
     */
    struct TriggerStats {
        uint256 totalTriggers;              // Total triggers created
        uint256 activeTriggers;             // Currently active triggers
        uint256 executedTriggers;           // Successfully executed triggers
        uint256 cancelledTriggers;          // Cancelled triggers
        uint256 expiredTriggers;            // Expired triggers
    }

    /**
     * @dev Asset configuration for HyperCore integration
     */
    struct AssetConfig {
        string symbol;                      // Asset symbol (e.g., "BTC")
        bool isSupported;                   // Whether asset is supported
        uint256 minTradeAmount;             // Minimum trade amount
        uint256 maxTradeAmount;             // Maximum trade amount
        uint256 pricePrecision;             // Price precision (decimals)
        bool requiresApproval;              // Whether ERC20 approval is needed
    }

    // Custom errors
    error InvalidOperator();
    error InvalidAction();
    error ZeroAmount();
    error ExcessiveSlippage();
    error TriggerExpired();
    error TriggerNotActive();
    error UnauthorizedUser();

    /**
     * @dev Validate trigger parameters
     */
    function validateTrigger(Trigger memory trigger) internal pure {
        if (trigger.triggerPrice == 0) revert ZeroAmount();
        if (trigger.amount == 0) revert ZeroAmount();
        if (trigger.slippageTolerance > 10000) revert ExcessiveSlippage(); // Max 100%
        if (trigger.expiration != 0 && trigger.expiration <= block.timestamp) revert TriggerExpired();
    }

    /**
     * @dev Check if trigger condition is met
     */
    function checkCondition(
        uint256 currentPrice,
        uint256 triggerPrice,
        ComparisonOperator operator
    ) internal pure returns (bool) {
        if (operator == ComparisonOperator.GreaterThan) {
            return currentPrice > triggerPrice;
        } else if (operator == ComparisonOperator.LessThan) {
            return currentPrice < triggerPrice;
        } else if (operator == ComparisonOperator.GreaterThanOrEqual) {
            return currentPrice >= triggerPrice;
        } else if (operator == ComparisonOperator.LessThanOrEqual) {
            return currentPrice <= triggerPrice;
        }
        return false;
    }

    /**
     * @dev Check if trigger is still valid (not expired)
     */
    function isValid(Trigger memory trigger) internal view returns (bool) {
        return trigger.isActive && 
               (trigger.expiration == 0 || block.timestamp <= trigger.expiration);
    }

    /**
     * @dev Calculate execution reward based on gas and base reward
     */
    function calculateReward(
        uint256 baseReward,
        uint256 gasUsed,
        uint256 gasPrice
    ) internal pure returns (uint256) {
        uint256 gasCost = gasUsed * gasPrice;
        return baseReward + gasCost;
    }
} 