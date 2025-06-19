"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs_1 = require("fs");
const path_1 = require("path");
async function main() {
    console.log("🚀 Starting HyperTrigger contract deployment...");
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    const balance = await hardhat_1.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hardhat_1.ethers.formatEther(balance), "ETH");
    // Deploy TriggerTypes library first
    console.log("\n📦 Deploying TriggerTypes library...");
    const TriggerTypes = await hardhat_1.ethers.getContractFactory("TriggerTypes");
    const triggerTypes = await TriggerTypes.deploy();
    await triggerTypes.waitForDeployment();
    const triggerTypesAddress = await triggerTypes.getAddress();
    console.log("✅ TriggerTypes deployed to:", triggerTypesAddress);
    // Deploy TriggerManager with library
    console.log("\n📦 Deploying TriggerManager...");
    const TriggerManager = await hardhat_1.ethers.getContractFactory("TriggerManager", {
        libraries: {
            TriggerTypes: triggerTypesAddress,
        },
    });
    const triggerManager = await TriggerManager.deploy();
    await triggerManager.waitForDeployment();
    const triggerManagerAddress = await triggerManager.getAddress();
    console.log("✅ TriggerManager deployed to:", triggerManagerAddress);
    // Deploy mock tokens for testing
    console.log("\n📦 Deploying mock tokens for testing...");
    const MockToken = await hardhat_1.ethers.getContractFactory("MockToken");
    const mockTokens = [
        { name: "Mock Bitcoin", symbol: "MBTC", decimals: 8 },
        { name: "Mock Ethereum", symbol: "METH", decimals: 18 },
        { name: "Mock USDC", symbol: "MUSDC", decimals: 6 },
        { name: "Mock Fartcoin", symbol: "MFART", decimals: 18 },
    ];
    const deployedTokens = {};
    for (const token of mockTokens) {
        const mockToken = await MockToken.deploy(token.name, token.symbol, token.decimals, hardhat_1.ethers.parseUnits("1000000", token.decimals) // 1M tokens
        );
        await mockToken.waitForDeployment();
        const tokenAddress = await mockToken.getAddress();
        deployedTokens[token.symbol] = tokenAddress;
        console.log(`✅ ${token.symbol} deployed to:`, tokenAddress);
    }
    // Save deployment addresses
    const deploymentInfo = {
        network: "hypervm-testnet",
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            TriggerTypes: triggerTypesAddress,
            TriggerManager: triggerManagerAddress,
        },
        mockTokens: deployedTokens,
        gasUsed: {
        // Will be filled by actual deployment
        }
    };
    const deploymentPath = (0, path_1.join)(__dirname, "../deployments.json");
    (0, fs_1.writeFileSync)(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentPath);
    // Save to frontend
    const frontendContractsPath = (0, path_1.join)(__dirname, "../../apps/frontend/src/lib/contracts.ts");
    const contractsCode = `// Auto-generated contract addresses
// Generated on: ${deploymentInfo.timestamp}

export const CONTRACTS = {
  TriggerManager: "${triggerManagerAddress}" as const,
  TriggerTypes: "${triggerTypesAddress}" as const,
} as const;

export const MOCK_TOKENS = {
  ${Object.entries(deployedTokens)
        .map(([symbol, address]) => `${symbol}: "${address}"`)
        .join(",\n  ")}
} as const;

export const NETWORK_CONFIG = {
  name: "HyperEVM Testnet",
  chainId: 998, // HyperEVM testnet chain ID
  rpcUrl: "https://api.hyperliquid-testnet.xyz/evm",
} as const;
`;
    (0, fs_1.writeFileSync)(frontendContractsPath, contractsCode);
    console.log("📱 Contract addresses saved to frontend:", frontendContractsPath);
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Summary:");
    console.log(`   TriggerManager: ${triggerManagerAddress}`);
    console.log(`   TriggerTypes: ${triggerTypesAddress}`);
    console.log(`   Mock Tokens: ${Object.keys(deployedTokens).length} deployed`);
    console.log("\n🔗 Next steps:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Test trigger creation in frontend");
    console.log("3. Set up worker services for price monitoring");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
