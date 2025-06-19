// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/TriggerTypes.sol";

/**
 * @title TriggerManager - HyperEVM Native Trigger System
 * @dev Leverages HyperCore precompiles for direct order book price access
 * @notice This contract uses HyperEVM's unique architecture to read prices directly from HyperCore
 * 
 * HyperEVM Integration:
 * - Uses precompiles to read real-time prices from HyperCore order books
 * - Future: Direct order execution via system contracts (when available)
 * - No bridging risk - unified state between HyperCore and HyperEVM
 */
contract TriggerManager is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using TriggerTypes for TriggerTypes.Trigger;

    // HyperCore Precompile Addresses (direct order book access)
    address private constant ORACLE_PX_PRECOMPILE = 0x0000000000000000000000000000000000000807;
    address private constant MARK_PX_PRECOMPILE = 0x0000000000000000000000000000000000000806;
    address private constant SPOT_PX_PRECOMPILE = 0x0000000000000000000000000000000000000808;

    // Roles
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // State
    mapping(uint256 => TriggerTypes.Trigger) public triggers;
    mapping(address => uint256[]) public userTriggers;
    uint256 public nextTriggerId;
    uint256 public totalActiveTriggers;

    // Configuration
    uint256 public minExecutionReward;
    uint256 public maxSlippageBps;
    uint256 public maxTriggerDuration;

    // Events
    event TriggerCreated(
        uint256 indexed triggerId,
        address indexed user,
        string baseAsset,
        string targetAsset,
        TriggerTypes.ComparisonOperator operator,
        uint256 triggerPrice,
        TriggerTypes.ActionType action,
        uint256 amount
    );

    event TriggerExecuted(
        uint256 indexed triggerId,
        address indexed executor,
        uint256 executionPrice,
        uint256 amountExecuted,
        uint256 executorReward
    );

    event TriggerCancelled(uint256 indexed triggerId, address indexed user);

    // Custom errors
    error InvalidTriggerParameters();
    error TriggerNotFound();
    error UnauthorizedAccess();
    error TriggerExpired();
    error InsufficientFunds();
    error ExecutionFailed();
    error PriceOracleError();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        uint256 _minExecutionReward,
        uint256 _maxSlippageBps,
        uint256 _maxTriggerDuration
    ) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        minExecutionReward = _minExecutionReward;
        maxSlippageBps = _maxSlippageBps;
        maxTriggerDuration = _maxTriggerDuration;
        nextTriggerId = 1;
    }

    /**
     * @dev Create a new trigger using HyperCore price feeds
     * @param baseAsset Asset symbol to monitor (e.g., "BTC")
     * @param targetAsset Asset symbol to trade (e.g., "ETH")
     * @param operator Comparison operator (>, <, >=, <=)
     * @param triggerPrice Price threshold in wei (scaled appropriately)
     * @param action Buy or sell action
     * @param amount Amount to trade in target asset units
     * @param slippageTolerance Maximum acceptable slippage in basis points
     * @param expiration Optional expiration timestamp (0 for no expiration)
     */
    function createTrigger(
        string memory baseAsset,
        string memory targetAsset,
        TriggerTypes.ComparisonOperator operator,
        uint256 triggerPrice,
        TriggerTypes.ActionType action,
        uint256 amount,
        uint256 slippageTolerance,
        uint256 expiration
    ) external payable nonReentrant whenNotPaused {
        if (triggerPrice == 0 || amount == 0) revert InvalidTriggerParameters();
        if (slippageTolerance > maxSlippageBps) revert InvalidTriggerParameters();
        if (expiration != 0 && expiration <= block.timestamp) revert InvalidTriggerParameters();
        if (expiration != 0 && expiration > block.timestamp + maxTriggerDuration) revert InvalidTriggerParameters();

        uint256 triggerId = nextTriggerId++;

        triggers[triggerId] = TriggerTypes.Trigger({
            id: triggerId,
            user: msg.sender,
            baseAsset: baseAsset,
            targetAsset: targetAsset,
            operator: operator,
            triggerPrice: triggerPrice,
            action: action,
            amount: amount,
            slippageTolerance: slippageTolerance,
            expiration: expiration,
            executionReward: msg.value,
            isActive: true,
            createdAt: block.timestamp
        });

        userTriggers[msg.sender].push(triggerId);
        totalActiveTriggers++;

        emit TriggerCreated(
            triggerId,
            msg.sender,
            baseAsset,
            targetAsset,
            operator,
            triggerPrice,
            action,
            amount
        );
    }

    /**
     * @dev Execute a trigger by reading price from HyperCore precompiles
     * @param triggerId The ID of the trigger to execute
     */
    function executeTrigger(uint256 triggerId) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        TriggerTypes.Trigger storage trigger = triggers[triggerId];
        
        if (!trigger.isActive) revert TriggerNotFound();
        if (trigger.expiration != 0 && block.timestamp > trigger.expiration) {
            trigger.isActive = false;
            totalActiveTriggers--;
            revert TriggerExpired();
        }

        // Read current price from HyperCore order books via precompiles
        uint256 currentPrice = _getHyperCorePrice(trigger.baseAsset);
        
        // Check if trigger condition is met
        bool conditionMet = _checkTriggerCondition(
            currentPrice,
            trigger.triggerPrice,
            trigger.operator
        );

        if (!conditionMet) revert ExecutionFailed();

        // Execute the trade (placeholder for now - will use system contracts when available)
        uint256 executedAmount = _executeTrade(trigger, currentPrice);

        // Pay executor reward
        uint256 executorReward = trigger.executionReward;
        if (executorReward > 0) {
            (bool success, ) = payable(msg.sender).call{value: executorReward}("");
            require(success, "Reward transfer failed");
        }

        // Deactivate trigger
        trigger.isActive = false;
        totalActiveTriggers--;

        emit TriggerExecuted(
            triggerId,
            msg.sender,
            currentPrice,
            executedAmount,
            executorReward
        );
    }

    /**
     * @dev Get current price from HyperCore order books using precompiles
     * @param asset Asset symbol to get price for
     * @return price Current price from order book
     */
    function _getHyperCorePrice(string memory asset) internal view returns (uint256 price) {
        // Call HyperCore precompile to get real-time price from order books
        // This is a direct read from HyperCore's native order book - no external oracles needed!
        
        bytes memory data = abi.encodeWithSignature("getPrice(string)", asset);
        
        // Try spot price precompile first
        (bool success, bytes memory result) = SPOT_PX_PRECOMPILE.staticcall(data);
        
        if (success && result.length > 0) {
            price = abi.decode(result, (uint256));
            if (price > 0) return price;
        }
        
        // Fallback to oracle price precompile
        (success, result) = ORACLE_PX_PRECOMPILE.staticcall(data);
        
        if (success && result.length > 0) {
            price = abi.decode(result, (uint256));
            if (price > 0) return price;
        }
        
        revert PriceOracleError();
    }

    /**
     * @dev Check if trigger condition is satisfied
     */
    function _checkTriggerCondition(
        uint256 currentPrice,
        uint256 triggerPrice,
        TriggerTypes.ComparisonOperator operator
    ) internal pure returns (bool) {
        if (operator == TriggerTypes.ComparisonOperator.GreaterThan) {
            return currentPrice > triggerPrice;
        } else if (operator == TriggerTypes.ComparisonOperator.LessThan) {
            return currentPrice < triggerPrice;
        } else if (operator == TriggerTypes.ComparisonOperator.GreaterThanOrEqual) {
            return currentPrice >= triggerPrice;
        } else if (operator == TriggerTypes.ComparisonOperator.LessThanOrEqual) {
            return currentPrice <= triggerPrice;
        }
        return false;
    }

    /**
     * @dev Execute trade - placeholder for system contract integration
     * @dev Will use HyperCore system contracts for direct order book execution when available
     */
    function _executeTrade(
        TriggerTypes.Trigger memory trigger,
        uint256 currentPrice
    ) internal returns (uint256 executedAmount) {
        // TODO: Implement direct order book execution via HyperCore system contracts
        // This will allow direct trading on HyperCore's native order books
        // For now, return the intended trade amount
        return trigger.amount;
    }

    /**
     * @dev Cancel a trigger and refund execution reward
     */
    function cancelTrigger(uint256 triggerId) external nonReentrant {
        TriggerTypes.Trigger storage trigger = triggers[triggerId];
        
        if (trigger.user != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        if (!trigger.isActive) revert TriggerNotFound();

        trigger.isActive = false;
        totalActiveTriggers--;

        // Refund execution reward to user
        if (trigger.executionReward > 0) {
            (bool success, ) = payable(trigger.user).call{value: trigger.executionReward}("");
            require(success, "Refund failed");
        }

        emit TriggerCancelled(triggerId, trigger.user);
    }

    /**
     * @dev Get trigger details
     */
    function getTrigger(uint256 triggerId) external view returns (TriggerTypes.Trigger memory) {
        return triggers[triggerId];
    }

    /**
     * @dev Get user's trigger IDs
     */
    function getUserTriggers(address user) external view returns (uint256[] memory) {
        return userTriggers[user];
    }

    /**
     * @dev Check if trigger condition would be met at current price
     */
    function checkTriggerCondition(uint256 triggerId) external view returns (bool, uint256) {
        TriggerTypes.Trigger memory trigger = triggers[triggerId];
        if (!trigger.isActive) return (false, 0);
        
        try this._getHyperCorePrice(trigger.baseAsset) returns (uint256 currentPrice) {
            bool conditionMet = _checkTriggerCondition(
                currentPrice,
                trigger.triggerPrice,
                trigger.operator
            );
            return (conditionMet, currentPrice);
        } catch {
            return (false, 0);
        }
    }

    // Admin functions
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function updateConfiguration(
        uint256 _minExecutionReward,
        uint256 _maxSlippageBps,
        uint256 _maxTriggerDuration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minExecutionReward = _minExecutionReward;
        maxSlippageBps = _maxSlippageBps;
        maxTriggerDuration = _maxTriggerDuration;
    }

    // Emergency withdrawal for stuck funds
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
} 