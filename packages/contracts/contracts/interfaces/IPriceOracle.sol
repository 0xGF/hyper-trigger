// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/TriggerTypes.sol";

/**
 * @title IPriceOracle
 * @dev Interface for price oracle functionality with multi-source support
 */
interface IPriceOracle {
    
    struct PriceInfo {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;
        string source;
    }

    // Core price functions
    function getPrice(address token) external view returns (uint256);
    
    function getPriceWithTimestamp(address token) external view returns (uint256 price, uint256 timestamp);
    
    function getPriceInfo(address token) external view returns (PriceInfo memory);
    
    function getMultiplePrices(address[] calldata tokens) external view returns (uint256[] memory);

    // Oracle management
    function addPriceSource(string calldata source, address oracle) external;
    
    function removePriceSource(string calldata source) external;
    
    function updatePrice(address token, uint256 price, string calldata source) external;
    
    function updatePriceWithProof(
        address token,
        uint256 price,
        uint256 timestamp,
        bytes calldata proof,
        string calldata source
    ) external;

    // Price validation
    function isPriceStale(address token) external view returns (bool);
    
    function getPriceAge(address token) external view returns (uint256);
    
    function validatePriceDeviation(
        address token,
        uint256 newPrice,
        uint256 maxDeviationBps
    ) external view returns (bool);

    // Configuration
    function setStalenessThreshold(uint256 threshold) external;
    
    function setMaxPriceDeviation(uint256 deviationBps) external;
    
    function setMinConfidence(uint256 confidence) external;

    // Events
    event PriceUpdated(
        address indexed token,
        uint256 price,
        uint256 timestamp,
        string source
    );
    
    event PriceSourceAdded(string source, address oracle);
    
    event PriceSourceRemoved(string source);
    
    event StalenessThresholdUpdated(uint256 threshold);
    
    event MaxPriceDeviationUpdated(uint256 deviationBps);

    // Errors
    error TokenNotSupported(address token);
    error PriceStale(address token, uint256 lastUpdate);
    error PriceDeviationTooHigh(uint256 currentPrice, uint256 newPrice);
    error InsufficientConfidence(uint256 confidence, uint256 required);
    error InvalidPriceSource(string source);
    error UnauthorizedPriceUpdate(address caller);
} 