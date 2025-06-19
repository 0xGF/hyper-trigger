import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying HyperTrigger to HyperEVM...");

  // Get the contract factory
  const TriggerManager = await ethers.getContractFactory("TriggerManager");

  // Deployment parameters for HyperEVM
  const deployParams = {
    minExecutionReward: ethers.parseEther("0.001"), // 0.001 HYPE minimum reward
    maxSlippageBps: 1000, // 10% maximum slippage
    maxTriggerDuration: 30 * 24 * 60 * 60, // 30 days max duration
  };

  console.log("📋 Deployment parameters:");
  console.log("- Min execution reward:", ethers.formatEther(deployParams.minExecutionReward), "HYPE");
  console.log("- Max slippage:", deployParams.maxSlippageBps / 100, "%");
  console.log("- Max duration:", deployParams.maxTriggerDuration / (24 * 60 * 60), "days");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("🔑 Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "HYPE");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Low balance! Make sure you have enough HYPE for deployment and testing.");
  }

  try {
    // Deploy contract (non-upgradeable for now to avoid complexity)
    console.log("📦 Deploying TriggerManager...");
    const triggerManager = await TriggerManager.deploy();
    await triggerManager.waitForDeployment();
    const address = await triggerManager.getAddress();

    // Initialize the contract
    console.log("🔧 Initializing contract...");
    const initTx = await triggerManager.initialize(
      deployer.address, // admin
      deployParams.minExecutionReward,
      deployParams.maxSlippageBps,
      deployParams.maxTriggerDuration
    );
    await initTx.wait();

    console.log("✅ TriggerManager deployed to:", address);

    // Verify the deployment
    console.log("🔍 Verifying deployment...");
    const nextTriggerId = await triggerManager.nextTriggerId();
    const totalActiveTriggers = await triggerManager.totalActiveTriggers();
    const minReward = await triggerManager.minExecutionReward();

    console.log("📊 Contract state:");
    console.log("- Next trigger ID:", nextTriggerId.toString());
    console.log("- Active triggers:", totalActiveTriggers.toString());
    console.log("- Min reward:", ethers.formatEther(minReward), "HYPE");

    // Test HyperCore precompile access (this will likely fail on testnet but shows the integration)
    console.log("🧪 Testing HyperCore precompile integration...");
    try {
      const [conditionMet, currentPrice] = await triggerManager.checkTriggerCondition(1);
      console.log("- Precompile test result:", conditionMet, currentPrice.toString());
    } catch (error) {
      console.log("- Precompile test failed (expected on testnet):", (error as Error).message);
    }

    console.log("\n🎉 Deployment complete!");
    console.log("📋 Contract details:");
    console.log("- Network: HyperEVM");
    console.log("- Address:", address);
    console.log("- Admin:", deployer.address);
    console.log("- Explorer:", `https://explorer.hyperliquid.xyz/address/${address}`);

    // Save deployment info for frontend
    const deploymentInfo = {
      network: "hyperevm",
      address: address,
      admin: deployer.address,
      deployedAt: new Date().toISOString(),
      parameters: deployParams,
      txHash: triggerManager.deploymentTransaction()?.hash,
    };

    console.log("\n📄 Deployment info:", JSON.stringify(deploymentInfo, null, 2));

    return deploymentInfo;

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main; 