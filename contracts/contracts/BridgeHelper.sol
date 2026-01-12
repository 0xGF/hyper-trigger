// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title BridgeHelper
 * @dev Helps users deposit funds from HyperEVM to HyperCore spot balance
 * 
 * HyperLiquid Bridge Flow:
 * 1. Send tokens to the system address for that token
 * 2. Tokens appear in your HyperCore spot balance
 * 
 * System Addresses:
 * - HYPE: 0x2222222222222222222222222222222222222222
 * - Other tokens: 0x2000...0000 + token_index
 */
contract BridgeHelper is Ownable2Step {
    using SafeERC20 for IERC20;
    // HyperCore system addresses
    address constant HYPE_SYSTEM_ADDRESS = 0x2222222222222222222222222222222222222222;
    
    // Common token addresses on HyperEVM
    // These need to be set correctly for each deployment
    mapping(string => address) public tokenAddresses;
    mapping(string => uint64) public tokenIndices;
    
    // Events
    event BridgedToHyperCore(
        address indexed user,
        string token,
        uint256 amount,
        address systemAddress
    );
    
    event TokenConfigured(string symbol, address tokenAddress, uint64 tokenIndex);
    
    constructor() Ownable(msg.sender) {
        // Configure USDC (most common for spot trading)
        // Note: These addresses need to be verified on the actual network
        tokenIndices["USDC"] = 1; // USDC spot index
        tokenIndices["HYPE"] = 0; // HYPE is native/0
    }
    
    /**
     * @dev Configure a token for bridging
     * @param symbol Token symbol (e.g., "USDC")
     * @param tokenAddress ERC20 contract address on HyperEVM
     * @param tokenIndex Spot token index on HyperCore
     */
    function configureToken(
        string calldata symbol,
        address tokenAddress,
        uint64 tokenIndex
    ) external onlyOwner {
        tokenAddresses[symbol] = tokenAddress;
        tokenIndices[symbol] = tokenIndex;
        emit TokenConfigured(symbol, tokenAddress, tokenIndex);
    }
    
    /**
     * @dev Bridge HYPE from HyperEVM to HyperCore spot balance
     * Just send HYPE to this function and it will be deposited
     */
    function bridgeHype() external payable {
        require(msg.value > 0, "Must send HYPE");
        
        // Send to HYPE system address
        (bool success,) = HYPE_SYSTEM_ADDRESS.call{value: msg.value}("");
        require(success, "HYPE bridge failed");
        
        emit BridgedToHyperCore(msg.sender, "HYPE", msg.value, HYPE_SYSTEM_ADDRESS);
    }
    
    /**
     * @dev Bridge ERC20 tokens from HyperEVM to HyperCore spot balance
     * @param symbol Token symbol (e.g., "USDC")
     * @param amount Amount to bridge
     */
    function bridgeToken(string calldata symbol, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        address tokenAddress = tokenAddresses[symbol];
        require(tokenAddress != address(0), "Token not configured");
        
        uint64 tokenIndex = tokenIndices[symbol];
        address systemAddress = getSystemAddress(tokenIndex);
        
        // Transfer tokens from user to system address (using SafeERC20)
        IERC20(tokenAddress).safeTransferFrom(msg.sender, systemAddress, amount);
        
        emit BridgedToHyperCore(msg.sender, symbol, amount, systemAddress);
    }
    
    /**
     * @dev Get system address for a token index
     */
    function getSystemAddress(uint64 tokenIndex) public pure returns (address) {
        if (tokenIndex == 0) {
            return HYPE_SYSTEM_ADDRESS;
        }
        // Standard pattern: 0x2000...0000 + token_index
        return address(uint160(0x2000000000000000000000000000000000000000) + uint160(tokenIndex));
    }
    
    /**
     * @dev Get token config
     */
    function getTokenConfig(string calldata symbol) external view returns (
        address tokenAddress,
        uint64 tokenIndex,
        address systemAddress
    ) {
        tokenAddress = tokenAddresses[symbol];
        tokenIndex = tokenIndices[symbol];
        systemAddress = getSystemAddress(tokenIndex);
    }
    
    // Allow contract to receive HYPE
    receive() external payable {
        // Forward to bridge
        (bool success,) = HYPE_SYSTEM_ADDRESS.call{value: msg.value}("");
        require(success, "HYPE bridge failed");
        emit BridgedToHyperCore(msg.sender, "HYPE", msg.value, HYPE_SYSTEM_ADDRESS);
    }
}

