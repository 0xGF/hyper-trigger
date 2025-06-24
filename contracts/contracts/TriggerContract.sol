// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TriggerContract - USDC-Only Price Triggers
 * @dev Price-triggered swaps using USDC as stable input (safe refunds)
 */
contract TriggerContract is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    
    // HyperCore Precompile Addresses
    address constant ORACLE_PRICES = 0x0000000000000000000000000000000000000807;
    address constant SPOT_BALANCE = 0x0000000000000000000000000000000000000801;
    address constant CORE_WRITER = 0x3333333333333333333333333333333333333333;
    
    // USDC token ID (assuming USDC is token ID 1)
    uint64 public constant USDC_TOKEN_ID = 1;
    
    uint256 public constant MAX_SLIPPAGE = 50; // 50% max slippage
    uint256 public executionReward = 0.01 ether; // 0.01 HYPE reward for executors
    uint256 public nextTriggerId = 1;
    
    mapping(uint64 => address) public tokenContracts;
    
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
        uint32 targetOracleIndex;     // Oracle index for target token price monitoring
        uint64 targetToken;           // Target token ID for trading (BTC, ETH, etc.)
        uint256 usdcAmount;           // Amount of USDC to swap
        uint256 triggerPrice;         // Target price (18 decimals)
        bool isAbove;                 // true = trigger when price >= target, false = trigger when price <= target
        uint256 maxSlippage;          // Max slippage percentage (basis points, e.g., 500 = 5%)
        uint256 createdAt;
        ExecutionState state;         // Current execution state
        uint256 executionStarted;     // Timestamp when execution started
        uint256 outputAmount;         // Amount of target tokens received (set after execution)
    }
    
    mapping(uint256 => Trigger) public triggers;
    mapping(address => uint256[]) public userTriggers;
    mapping(address => uint256) public userUsdcDeposits; // user => total USDC deposited
    
    event TriggerCreated(
        uint256 indexed triggerId,
        address indexed user,
        uint32 targetOracleIndex,
        uint64 targetToken,
        uint256 usdcAmount,
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
    
    event RefundClaimed(uint256 indexed triggerId, address indexed user, uint256 usdcAmount);
    
    // Custom errors
    error InsufficientDeposit();
    error TriggerNotFound();
    error UnauthorizedUser();
    error TriggerAlreadyExecuted();
    error TriggerConditionNotMet();
    error InvalidSlippage();
    error OracleCallFailed();
    error ZeroAmount();
    error TokenContractNotSet();
    error TriggerBeingExecuted();
    error SwapFailed();
    error NotRefundable();
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }
    
    function setTokenContract(uint64 tokenId, address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenContracts[tokenId] = contractAddress;
    }
    
    function setExecutionReward(uint256 newReward) external onlyRole(DEFAULT_ADMIN_ROLE) {
        executionReward = newReward;
    }
    
    function getOraclePrice(uint32 oracleIndex) public view returns (uint64) {
        (bool success, bytes memory result) = ORACLE_PRICES.staticcall(abi.encode(oracleIndex));
        if (!success) revert OracleCallFailed();
        return abi.decode(result, (uint64));
    }
    
    function getContractSpotBalance(uint64 tokenId) public view returns (uint64 total, uint64 hold) {
        (bool success, bytes memory result) = SPOT_BALANCE.staticcall(abi.encode(address(this), tokenId));
        if (!success) revert OracleCallFailed();
        (total, hold, ) = abi.decode(result, (uint64, uint64, uint64));
    }
    
    function convertOraclePrice(uint64 rawPrice, uint8 assetDecimals) public pure returns (uint256) {
        if (assetDecimals >= 18) {
            return uint256(rawPrice) / (10 ** (assetDecimals - 18));
        } else {
            return uint256(rawPrice) * (10 ** (18 - assetDecimals));
        }
    }
    
    function getSystemAddress(uint64 tokenId) public pure returns (address) {
        if (tokenId == 0) {
            return 0x2222222222222222222222222222222222222222;
        }
        uint256 baseAddr = 0x2000000000000000000000000000000000000000000000000000000000000000;
        return address(uint160((baseAddr >> 96) | uint256(tokenId)));
    }
    
    /**
     * @dev Create a trigger using USDC as input
     * @param targetOracleIndex Oracle index for target token price
     * @param targetToken Target token ID (BTC, ETH, etc.)
     * @param usdcAmount Amount of USDC to swap
     * @param triggerPrice Target price (18 decimals)
     * @param isAbove true = trigger when price >= target, false = trigger when price <= target
     * @param maxSlippage Max slippage percentage (basis points)
     */
    function createTrigger(
        uint32 targetOracleIndex,
        uint64 targetToken,
        uint256 usdcAmount,
        uint256 triggerPrice,
        bool isAbove,
        uint256 maxSlippage
    ) external payable nonReentrant whenNotPaused {
        if (usdcAmount == 0) revert ZeroAmount();
        if (maxSlippage > MAX_SLIPPAGE * 100) revert InvalidSlippage(); // Max 50%
        if (msg.value < executionReward) revert InsufficientDeposit();
        
        // Validate oracle index exists by trying to get its price
        getOraclePrice(targetOracleIndex);
        
        // Transfer USDC from user
        address usdcContract = tokenContracts[USDC_TOKEN_ID];
        if (usdcContract == address(0)) revert TokenContractNotSet();
        IERC20(usdcContract).transferFrom(msg.sender, address(this), usdcAmount);
        
        uint256 triggerId = nextTriggerId++;
        
        triggers[triggerId] = Trigger({
            id: triggerId,
            user: msg.sender,
            targetOracleIndex: targetOracleIndex,
            targetToken: targetToken,
            usdcAmount: usdcAmount,
            triggerPrice: triggerPrice,
            isAbove: isAbove,
            maxSlippage: maxSlippage,
            createdAt: block.timestamp,
            state: ExecutionState.PENDING,
            executionStarted: 0,
            outputAmount: 0
        });
        
        userTriggers[msg.sender].push(triggerId);
        userUsdcDeposits[msg.sender] += usdcAmount;
        
        emit TriggerCreated(triggerId, msg.sender, targetOracleIndex, targetToken, usdcAmount, triggerPrice, isAbove, maxSlippage);
    }
    
    function startTriggerExecution(uint256 triggerId) external nonReentrant whenNotPaused onlyRole(EXECUTOR_ROLE) {
        Trigger storage trigger = triggers[triggerId];
        
        if (trigger.user == address(0)) revert TriggerNotFound();
        if (trigger.state != ExecutionState.PENDING) revert TriggerAlreadyExecuted();
        
        // Check trigger condition
        uint64 rawPrice = getOraclePrice(trigger.targetOracleIndex);
        uint256 currentPrice = convertOraclePrice(rawPrice, 6); // Assume 6 decimals
        
        bool conditionMet = trigger.isAbove ? 
            currentPrice >= trigger.triggerPrice : 
            currentPrice <= trigger.triggerPrice;
            
        if (!conditionMet) revert TriggerConditionNotMet();
        
        trigger.state = ExecutionState.EXECUTING;
        trigger.executionStarted = block.timestamp;
        
        // Bridge USDC to HyperCore
        _bridgeToHyperCore(USDC_TOKEN_ID, trigger.usdcAmount);
        
        emit TriggerExecutionStarted(triggerId, msg.sender, currentPrice);
    }
    
    function completeTriggerExecution(uint256 triggerId, uint256 actualOutputAmount) external nonReentrant whenNotPaused onlyRole(EXECUTOR_ROLE) {
        Trigger storage trigger = triggers[triggerId];
        
        if (trigger.user == address(0)) revert TriggerNotFound();
        if (trigger.state != ExecutionState.EXECUTING) revert TriggerAlreadyExecuted();
        
        // Verify we have the target tokens
        (uint64 contractBalance, ) = getContractSpotBalance(trigger.targetToken);
        if (contractBalance < actualOutputAmount) revert SwapFailed();
        
        // Bridge target tokens back to user
        _bridgeFromHyperCore(trigger.user, trigger.targetToken, actualOutputAmount);
        
        trigger.state = ExecutionState.COMPLETED;
        trigger.outputAmount = actualOutputAmount;
        
        // Pay executor reward
        payable(msg.sender).transfer(executionReward);
        
        // Update user deposits
        userUsdcDeposits[trigger.user] -= trigger.usdcAmount;
        
        uint64 rawPrice = getOraclePrice(trigger.targetOracleIndex);
        uint256 currentPrice = convertOraclePrice(rawPrice, 6);
        
        emit TriggerExecuted(triggerId, msg.sender, currentPrice, actualOutputAmount);
    }
    
    function markExecutionFailed(uint256 triggerId, string calldata reason) external nonReentrant onlyRole(EXECUTOR_ROLE) {
        Trigger storage trigger = triggers[triggerId];
        
        if (trigger.user == address(0)) revert TriggerNotFound();
        if (trigger.state != ExecutionState.EXECUTING) revert TriggerAlreadyExecuted();
        
        trigger.state = ExecutionState.FAILED;
        
        emit TriggerExecutionFailed(triggerId, msg.sender, reason);
    }
    
    /**
     * @dev Cancel a pending trigger and get refund
     */
    function cancelTrigger(uint256 triggerId) external nonReentrant {
        Trigger storage trigger = triggers[triggerId];
        
        if (trigger.user != msg.sender) revert UnauthorizedUser();
        if (trigger.state == ExecutionState.COMPLETED) revert TriggerAlreadyExecuted();
        if (trigger.state == ExecutionState.EXECUTING) revert TriggerBeingExecuted();
        
        trigger.state = ExecutionState.CANCELLED;
        
        // Refund USDC and execution reward
        address usdcContract = tokenContracts[USDC_TOKEN_ID];
        IERC20(usdcContract).transfer(msg.sender, trigger.usdcAmount);
        payable(msg.sender).transfer(executionReward);
        
        userUsdcDeposits[msg.sender] -= trigger.usdcAmount;
        
        emit TriggerCancelled(triggerId, msg.sender);
    }
    
    /**
     * @dev Claim refund for failed execution
     * Returns original USDC amount (no price volatility risk!)
     */
    function claimRefund(uint256 triggerId) external nonReentrant {
        Trigger storage trigger = triggers[triggerId];
        
        if (trigger.user != msg.sender) revert UnauthorizedUser();
        if (trigger.state != ExecutionState.FAILED) revert NotRefundable();
        
        trigger.state = ExecutionState.CANCELLED; // Mark as processed
        
        // Bridge USDC back from HyperCore if needed, or use contract balance
        // For failed executions, we return the original USDC amount
        address usdcContract = tokenContracts[USDC_TOKEN_ID];
        
        // Try to use contract USDC balance first
        uint256 contractUsdcBalance = IERC20(usdcContract).balanceOf(address(this));
        if (contractUsdcBalance >= trigger.usdcAmount) {
            // Use contract balance
            IERC20(usdcContract).transfer(msg.sender, trigger.usdcAmount);
        } else {
            // Bridge back from HyperCore
            _bridgeFromHyperCore(msg.sender, USDC_TOKEN_ID, trigger.usdcAmount);
        }
        
        // Refund execution reward
        payable(msg.sender).transfer(executionReward);
        
        userUsdcDeposits[msg.sender] -= trigger.usdcAmount;
        
        emit RefundClaimed(triggerId, msg.sender, trigger.usdcAmount);
    }
    
    function getTrigger(uint256 triggerId) external view returns (Trigger memory) {
        return triggers[triggerId];
    }
    
    function getUserTriggers(address user) external view returns (uint256[] memory) {
        return userTriggers[user];
    }
    
    function isTriggerReady(uint256 triggerId) external view returns (bool conditionMet, uint256 currentPrice) {
        Trigger storage trigger = triggers[triggerId];
        if (trigger.user == address(0)) return (false, 0);
        
        uint64 rawPrice = getOraclePrice(trigger.targetOracleIndex);
        currentPrice = convertOraclePrice(rawPrice, 6);
        
        conditionMet = trigger.isAbove ? 
            currentPrice >= trigger.triggerPrice : 
            currentPrice <= trigger.triggerPrice;
    }
    
    function _bridgeToHyperCore(uint64 tokenId, uint256 amount) internal {
        address systemAddr = getSystemAddress(tokenId);
        
        if (tokenId == 0) {
            payable(systemAddr).transfer(amount);
        } else {
            address tokenContract = tokenContracts[tokenId];
            IERC20(tokenContract).transfer(systemAddr, amount);
        }
    }
    
    function _bridgeFromHyperCore(address user, uint64 tokenId, uint256 amount) internal {
        // Action ID 6: spotSend
        bytes memory actionData = abi.encode(
            uint8(6), // Action ID
            user,
            tokenId,
            amount
        );
        
        (bool success, ) = CORE_WRITER.call(abi.encodeWithSignature("sendRawAction(bytes)", actionData));
        if (!success) revert SwapFailed();
    }
    
    // Emergency functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function emergencyWithdraw(uint64 tokenId, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenId == 0) {
            payable(msg.sender).transfer(amount);
        } else {
            address tokenContract = tokenContracts[tokenId];
            IERC20(tokenContract).transfer(msg.sender, amount);
        }
    }
} 