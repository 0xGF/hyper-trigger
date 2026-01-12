// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SwapContract
 * @dev Immediate spot asset swaps for HyperEVM users via HyperCore integration
 * Allows users without HyperCore accounts to buy spot assets directly
 */
contract SwapContract is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    
    // HyperCore integration addresses from official docs
    address constant ORACLE_PRECOMPILE = 0x0000000000000000000000000000000000000807;
    address constant SPOT_BALANCE_PRECOMPILE = 0x0000000000000000000000000000000000000801;
    address constant CORE_WRITER = 0x3333333333333333333333333333333333333333;
    
    // HYPE system address (special case)
    address constant HYPE_SYSTEM_ADDRESS = 0x2222222222222222222222222222222222222222;
    
    // Fee configuration
    uint256 public swapFee = 0.001 ether; // 0.001 HYPE
    uint256 public constant MAX_SLIPPAGE = 5000; // 50% in basis points
    
    // Swap tracking
    struct SwapRequest {
        address user;
        uint64 fromToken;
        uint64 toToken;
        uint256 fromAmount;
        uint256 minOutputAmount;
        uint256 slippageBps;  // User-provided slippage in basis points
        uint256 timestamp;
        bool completed;
    }
    
    mapping(uint256 => SwapRequest) public swapRequests;
    mapping(address => uint256[]) public userSwaps;
    uint256 public nextSwapId = 1;
    
    // Events
    event SwapInitiated(
        uint256 indexed swapId,
        address indexed user,
        uint64 fromToken,
        uint64 toToken,
        uint256 fromAmount,
        uint256 minOutputAmount
    );
    
    event SwapCompleted(
        uint256 indexed swapId,
        address indexed user,
        uint256 outputAmount
    );
    
    event FeeUpdated(uint256 newFee);
    
    event HypeSystemTransfer(address indexed user, uint256 amount);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }
    
    /**
     * @dev Execute immediate swap between any two spot assets
     * @param fromToken Source token spot index
     * @param toToken Destination token spot index  
     * @param fromAmount Amount to swap (in token's native decimals)
     * @param minOutputAmount Minimum amount to receive (slippage protection)
     * @param slippageBps Slippage tolerance in basis points (e.g., 100 = 1%)
     * @param fromTokenAddress ERC20 contract address for fromToken (0x0 for HYPE)
     */
    function executeSwap(
        uint64 fromToken,
        uint64 toToken,
        uint256 fromAmount,
        uint256 minOutputAmount,
        uint256 slippageBps,
        address fromTokenAddress
    ) external payable whenNotPaused nonReentrant returns (uint256 swapId) {
        require(fromAmount > 0, "Amount must be greater than 0");
        require(fromToken != toToken, "Cannot swap same token");
        require(msg.value >= swapFee, "Insufficient fee payment");
        require(slippageBps <= MAX_SLIPPAGE, "Slippage too high");
        
        // Create swap request
        swapId = nextSwapId++;
        swapRequests[swapId] = SwapRequest({
            user: msg.sender,
            fromToken: fromToken,
            toToken: toToken,
            fromAmount: fromAmount,
            minOutputAmount: minOutputAmount,
            slippageBps: slippageBps,
            timestamp: block.timestamp,
            completed: false
        });
        
        userSwaps[msg.sender].push(swapId);
        
        // Transfer user's tokens to this contract first
        if (fromToken == 0) { // HYPE
            require(msg.value >= fromAmount + swapFee, "Insufficient HYPE sent");
        } else {
            // For ERC20 tokens, user must approve this contract first
            require(fromTokenAddress != address(0), "Invalid token address");
            IERC20(fromTokenAddress).safeTransferFrom(msg.sender, address(this), fromAmount);
        }
        
        // Execute the cross-layer swap
        _executeCrossLayerSwap(swapId, fromToken, toToken, fromAmount, fromTokenAddress);
        
        emit SwapInitiated(swapId, msg.sender, fromToken, toToken, fromAmount, minOutputAmount);
    }
    
    /**
     * @dev Helper function for users to manually send HYPE to system address
     * Use this if the contract-mediated transfer isn't working
     */
    function sendHypeToSystem() external payable {
        require(msg.value > 0, "Must send HYPE");
        address systemAddress = HYPE_SYSTEM_ADDRESS;
        
        // Try the direct transfer
        (bool success,) = systemAddress.call{value: msg.value}("");
        require(success, "HYPE system transfer failed");
        
        emit HypeSystemTransfer(msg.sender, msg.value);
    }
    
    /**
     * @dev Execute cross-layer swap via HyperCore order book
     * Places a limit order to trade fromToken for toToken
     */
    function _executeCrossLayerSwap(
        uint256 swapId,
        uint64 fromToken,
        uint64 toToken,
        uint256 fromAmount,
        address fromTokenAddress
    ) internal {
        // Step 1: Send tokens from HyperEVM to HyperCore via system address
        _sendToHyperCore(fromToken, fromAmount, fromTokenAddress);
        
        // Step 2: Place limit order on HyperCore spot market to trade tokens
        _placeLimitOrder(swapId, fromToken, toToken, fromAmount);
        
        // Note: Event emission happens in executeSwap() - removed duplicate here
    }
    
    /**
     * @dev Place a limit order on HyperCore to trade tokens
     * Uses CoreWriter Action ID 1 (limit order)
     */
    function _placeLimitOrder(uint256 swapId, uint64 fromToken, uint64 toToken, uint256 fromAmount) internal {
        SwapRequest storage swap = swapRequests[swapId];
        
        // For HYPE → USDC swap, we need to place a sell order for HYPE to get USDC
        // Asset ID for spot trading: 10000 + spot_index
        uint32 spotAsset = uint32(10000 + toToken); // USDC spot asset
        
        // Get current market price for the target token
        uint256 marketPrice = this.getOraclePrice(uint32(toToken));
        require(marketPrice > 0, "Cannot get market price");
        
        // Place a market order by setting price with user-provided slippage
        bool isBuy = (fromToken != 0); // If selling HYPE (token 0), we're buying the other token
        uint256 slippageMultiplier = swap.slippageBps; // User's slippage in basis points
        uint256 limitPrice;
        
        if (isBuy) {
            // Buying: set price above market by user's slippage tolerance
            limitPrice = marketPrice * (10000 + slippageMultiplier) / 10000;
        } else {
            // Selling: set price below market by user's slippage tolerance
            limitPrice = marketPrice * (10000 - slippageMultiplier) / 10000;
        }
        
        // Ensure limitPrice fits in uint64 (with overflow protection)
        require(limitPrice <= type(uint64).max, "Price overflow");
        
        // Calculate order size - preserve precision by scaling appropriately
        // fromAmount is in token's native decimals, orderSize needs proper conversion
        // Use uint256 for intermediate calculation to prevent overflow
        uint256 orderSizeCalc = fromAmount;
        require(orderSizeCalc <= type(uint64).max, "Order size overflow");
        uint64 orderSize = uint64(orderSizeCalc);
        require(orderSize > 0, "Order size too small");
        
        // Encode limit order action
        // Action ID 1: (asset, isBuy, limitPx, sz, reduceOnly, encodedTif, cloid)
        bytes memory actionData = abi.encodePacked(
            uint8(1), // Version 1
            uint24(1), // Action ID 1 (limit order)
            abi.encode(
                spotAsset, // asset (spot market)
                isBuy, // isBuy
                uint64(limitPrice), // limitPx
                orderSize, // sz (order size)
                false, // reduceOnly
                uint8(3), // encodedTif (3 = IOC - Immediate or Cancel for market-like behavior)
                uint128(swapId) // cloid (use swapId as client order id for tracking)
            )
        );
        
        // Call CoreWriter to place the order
        (bool success,) = CORE_WRITER.call(actionData);
        require(success, "CoreWriter limit order failed");
        
        // Note: Order execution is asynchronous
        // We'll need a separate mechanism to detect fills and send tokens back
    }
    
    /**
     * @dev Send tokens from HyperEVM to HyperCore via system address
     */
    function _sendToHyperCore(uint64 token, uint256 amount, address tokenAddress) internal {
        address systemAddress = getTokenSystemAddress(token);
        
        if (token == 0) { // HYPE - native transfer to system address
            (bool success,) = systemAddress.call{value: amount}("");
            require(success, "HYPE transfer to HyperCore failed");
        } else {
            // ERC20 transfer to system address (using SafeERC20)
            require(tokenAddress != address(0), "Invalid token address");
            IERC20(tokenAddress).safeTransfer(systemAddress, amount);
        }
    }
    
    /**
     * @dev Get system address for a token
     */
    function getTokenSystemAddress(uint64 tokenIndex) public pure returns (address) {
        if (tokenIndex == 0) { // HYPE special case
            return HYPE_SYSTEM_ADDRESS;
        }
        
        // Standard pattern: 0x2000...0000 + token index
        return address(uint160(0x2000000000000000000000000000000000000000) + uint160(tokenIndex));
    }
    
    /**
     * @dev Get oracle price for a token
     */
    function getOraclePrice(uint32 oracleIndex) external view returns (uint256) {
        (bool success, bytes memory result) = ORACLE_PRECOMPILE.staticcall(
            abi.encode(oracleIndex)
        );
        
        if (!success || result.length == 0) {
            return 0;
        }
        
        return abi.decode(result, (uint256));
    }
    
    /**
     * @dev Get spot balance for an address
     */
    function getSpotBalance(address user, uint64 token) external view returns (uint256) {
        (bool success, bytes memory result) = SPOT_BALANCE_PRECOMPILE.staticcall(
            abi.encode(user, token)
        );
        
        if (!success || result.length == 0) {
            return 0;
        }
        
        return abi.decode(result, (uint256));
    }
    
    /**
     * @dev Mark swap as completed (called by executor bot)
     */
    function completeSwap(uint256 swapId, uint256 outputAmount) external onlyRole(EXECUTOR_ROLE) {
        SwapRequest storage swap = swapRequests[swapId];
        require(!swap.completed, "Swap already completed");
        require(outputAmount >= swap.minOutputAmount, "Output below minimum");
        
        swap.completed = true;
        
        emit SwapCompleted(swapId, swap.user, outputAmount);
    }
    
    /**
     * @dev Get user's swap history
     */
    function getUserSwaps(address user) external view returns (uint256[] memory) {
        return userSwaps[user];
    }
    
    /**
     * @dev Get swap details
     */
    function getSwap(uint256 swapId) external view returns (SwapRequest memory) {
        return swapRequests[swapId];
    }
    
    /**
     * @dev Update swap fee (admin only)
     */
    function updateSwapFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        swapFee = newFee;
        emit FeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw collected fees (admin only)
     */
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success,) = msg.sender.call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Emergency token recovery (admin only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) {
            (bool success,) = msg.sender.call{value: amount}("");
            require(success, "ETH withdrawal failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
    
    // Receive function to accept HYPE payments
    receive() external payable {}
} 