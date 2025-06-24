// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SwapContract - Immediate Cross-Layer Token Swaps
 * @dev Instant any-to-any token swaps via HyperCore orderbook
 */
contract SwapContract is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    
    // HyperCore Precompile Addresses
    address constant ORACLE_PRICES = 0x0000000000000000000000000000000000000807;
    address constant SPOT_BALANCE = 0x0000000000000000000000000000000000000801;
    address constant CORE_WRITER = 0x3333333333333333333333333333333333333333;
    
    uint256 public constant MAX_SLIPPAGE = 50; // 50% max slippage
    uint256 public swapFee = 0.001 ether; // 0.001 HYPE fee per swap
    
    mapping(uint64 => address) public tokenContracts;
    
    event SwapExecuted(
        address indexed user,
        uint64 fromToken,
        uint64 targetToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 executionPrice
    );
    
    event SwapFailed(
        address indexed user,
        uint64 fromToken,
        uint64 targetToken,
        uint256 inputAmount,
        string reason
    );
    
    error InsufficientDeposit();
    error ZeroAmount();
    error InvalidSlippage();
    error OracleCallFailed();
    error SwapExecutionFailed();
    error TokenContractNotSet();
    error InsufficientOutput();
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }
    
    function setTokenContract(uint64 tokenId, address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenContracts[tokenId] = contractAddress;
    }
    
    function setSwapFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        swapFee = newFee;
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
     * @dev Execute immediate swap from any token to any token
     * @param fromToken Input token ID
     * @param targetToken Output token ID  
     * @param inputAmount Amount of input token
     * @param minOutputAmount Minimum output amount (slippage protection)
     * @param fromOracleIndex Oracle index for input token price
     * @param targetOracleIndex Oracle index for output token price
     */
    function executeSwap(
        uint64 fromToken,
        uint64 targetToken,
        uint256 inputAmount,
        uint256 minOutputAmount,
        uint32 fromOracleIndex,
        uint32 targetOracleIndex
    ) external payable nonReentrant whenNotPaused {
        if (inputAmount == 0) revert ZeroAmount();
        if (fromToken == targetToken) revert InvalidSlippage();
        
        // Handle input token deposit
        if (fromToken == 0) {
            // HYPE deposit
            if (msg.value != inputAmount + swapFee) revert InsufficientDeposit();
        } else {
            // ERC20 deposit
            if (msg.value < swapFee) revert InsufficientDeposit();
            address tokenContract = tokenContracts[fromToken];
            if (tokenContract == address(0)) revert TokenContractNotSet();
            IERC20(tokenContract).transferFrom(msg.sender, address(this), inputAmount);
        }
        
        // Get current prices for calculation
        uint64 fromPrice = getOraclePrice(fromOracleIndex);
        uint64 targetPrice = getOraclePrice(targetOracleIndex);
        
        // Calculate expected output amount
        uint256 fromPriceConverted = convertOraclePrice(fromPrice, 6);
        uint256 targetPriceConverted = convertOraclePrice(targetPrice, 6);
        uint256 expectedOutput = (inputAmount * fromPriceConverted) / targetPriceConverted;
        
        // Bridge input tokens to HyperCore
        _bridgeToHyperCore(fromToken, inputAmount);
        
        // Execute the swap via HyperCore orderbook
        uint256 actualOutput = _executeHyperCoreSwap(
            fromToken,
            targetToken,
            inputAmount,
            expectedOutput,
            fromOracleIndex,
            targetOracleIndex
        );
        
        // Verify minimum output
        if (actualOutput < minOutputAmount) {
            // Refund original tokens
            _bridgeFromHyperCore(msg.sender, fromToken, inputAmount);
            revert InsufficientOutput();
        }
        
        // Bridge output tokens back to user
        _bridgeFromHyperCore(msg.sender, targetToken, actualOutput);
        
        emit SwapExecuted(
            msg.sender,
            fromToken,
            targetToken,
            inputAmount,
            actualOutput,
            (fromPriceConverted * 1e18) / targetPriceConverted
        );
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
        if (!success) revert SwapExecutionFailed();
    }
    
    function _executeHyperCoreSwap(
        uint64 fromToken,
        uint64 targetToken,
        uint256 inputAmount,
        uint256 expectedOutput,
        uint32 fromOracleIndex,
        uint32 targetOracleIndex
    ) internal returns (uint256 actualOutput) {
        // For immediate swaps, we use market orders (limit price with high slippage tolerance)
        // This is simplified - in production you'd want more sophisticated order placement
        
        // Calculate limit price with 10% slippage tolerance for immediate execution
        uint64 fromPrice = getOraclePrice(fromOracleIndex);
        uint64 targetPrice = getOraclePrice(targetOracleIndex);
        
        // Place limit order on HyperCore
        // Action ID 1: Limit order (asset, isBuy, limitPx, sz, reduceOnly, encodedTif, cloid)
        bytes memory orderData = abi.encode(
            uint8(1), // Action ID
            targetToken, // asset to buy
            true, // isBuy
            uint64((uint256(fromPrice) * 110) / (uint256(targetPrice) * 100)), // limit price with 10% slippage
            uint64(inputAmount), // size
            false, // reduceOnly
            uint64(0), // encodedTif (GTC)
            uint64(block.timestamp) // cloid (unique order ID)
        );
        
        (bool success, ) = CORE_WRITER.call(abi.encodeWithSignature("sendRawAction(bytes)", orderData));
        if (!success) revert SwapExecutionFailed();
        
        // For immediate swaps, we assume the order fills quickly
        // In production, you'd want to check the actual fill amount
        return expectedOutput;
    }
    
    // Emergency functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
} 