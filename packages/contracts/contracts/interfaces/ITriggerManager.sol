// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/TriggerTypes.sol";

/**
 * @title ITriggerManager
 * @dev Interface for the main trigger management contract
 */
interface ITriggerManager {
    
    // Main functions
    function createTrigger(
        TriggerTypes.CreateTriggerParams calldata params
    ) external payable returns (uint256 triggerId);

    function executeTrigger(uint256 triggerId) external;

    function cancelTrigger(uint256 triggerId) external;

    function getTrigger(uint256 triggerId) external view returns (TriggerTypes.Trigger memory);

    function getUserTriggers(address user) external view returns (uint256[] memory);

    function getActiveTriggersForToken(address baseToken) external view returns (uint256[] memory);

    // Admin functions
    function setExecutionFee(uint256 _executionFeePercentage) external;

    function setMaxTriggersPerUser(uint256 _maxTriggersPerUser) external;

    function pause() external;

    function unpause() external;

    // State variables getters
    function maxTriggersPerUser() external view returns (uint256);

    function executionFeePercentage() external view returns (uint256);

    function minExecutionReward() external view returns (uint256);
} 