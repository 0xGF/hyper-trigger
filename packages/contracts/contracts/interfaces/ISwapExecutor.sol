// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/TriggerTypes.sol";

/**
 * @title ISwapExecutor
 * @dev Interface for executing token swaps through various DEXs including Hyperliquid
 */
interface ISwapExecutor {
    
    struct SwapResult {
        bool success;
        uint256 amountIn;
        uint256 amountOut;
        uint256 gasUsed;
        string errorMessage;
    }

    struct SwapRoute {
        address[] path;
        uint256[] fees;
        string protocol;
        bytes extraData;
    }

    struct SwapConfig {
        uint256 slippageToleranceBps;
        uint256 deadline;
        address recipient;
        bool useMultiHop;
        uint256 maxGasPrice;
    }

    // Core swap functions
    function executeBuy(
        address baseToken,
        address targetToken,
        uint256 amount,
        uint256 slippageToleranceBps,
        address recipient
    ) external returns (uint256 amountOut);

    function executeSell(
        address baseToken,
        address targetToken,
        uint256 amount,
        uint256 slippageToleranceBps,
        address recipient
    ) external returns (uint256 amountOut);

    function executeSwap(
        TriggerTypes.SwapParams calldata swapParams
    ) external returns (SwapResult memory);

    // Quote functions
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, SwapRoute memory route);

    function getSwapQuoteWithSlippage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 slippageToleranceBps
    ) external view returns (uint256 amountOutMin, uint256 amountOutExpected);

    // Liquidity checks
    function checkLiquidity(
        address tokenA,
        address tokenB,
        uint256 amount
    ) external view returns (bool sufficient, uint256 availableLiquidity);

    function estimatePriceImpact(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 priceImpactBps);

    // Protocol management
    function addProtocol(
        string calldata name,
        address router,
        bytes calldata config
    ) external;

    function removeProtocol(string calldata name) external;

    function setProtocolPriority(string[] calldata protocols) external;

    function updateProtocolConfig(
        string calldata name,
        bytes calldata config
    ) external;

    // Configuration
    function setDefaultSlippage(uint256 slippageToleranceBps) external;

    function setMaxSlippage(uint256 maxSlippageToleranceBps) external;

    function setSwapDeadline(uint256 deadline) external;

    function setMaxGasPrice(uint256 maxGasPrice) external;

    // Emergency functions
    function pauseProtocol(string calldata name) external;

    function unpauseProtocol(string calldata name) external;

    function emergencyWithdraw(address token, address to, uint256 amount) external;

    // Events
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient,
        string protocol
    );

    event ProtocolAdded(string name, address router);

    event ProtocolRemoved(string name);

    event ProtocolPaused(string name);

    event ProtocolUnpaused(string name);

    event SlippageConfigUpdated(uint256 defaultSlippage, uint256 maxSlippage);

    // Errors
    error SwapFailed(string reason);
    error InsufficientLiquidity(address token, uint256 required, uint256 available);
    error SlippageExceeded(uint256 expected, uint256 actual);
    error DeadlineExceeded(uint256 deadline, uint256 currentTime);
    error UnsupportedToken(address token);
    error ProtocolNotFound(string name);
    error ProtocolPaused(string name);
    error InvalidSwapParameters(string parameter);
    error GasPriceTooHigh(uint256 current, uint256 max);
    error UnauthorizedAccess(address caller);
} 