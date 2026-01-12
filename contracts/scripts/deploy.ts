// Deployment script for HyperCore-compatible contracts
import hre from "hardhat";

// Type assertion to access ethers (works at runtime even if TypeScript complains)
const ethers = (hre as any).ethers;

async function main() {
  console.log("🚀 Deploying HyperTrigger Contracts to HyperEVM");
  console.log("=" .repeat(70));
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HYPE`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️ WARNING: Low HYPE balance. You may need more HYPE for deployment.");
  }
  
  console.log("\n📦 Starting deployment...");
  
  try {
    // Deploy TriggerContract (main contract)
    console.log("\n1️⃣ Deploying TriggerContract...");
    const TriggerContract = await ethers.getContractFactory("TriggerContract");
    const triggerContract = await TriggerContract.deploy();
    await triggerContract.waitForDeployment();
    const triggerAddress = await triggerContract.getAddress();
    console.log(`✅ TriggerContract deployed to: ${triggerAddress}`);
    
    // Deploy BridgeHelper
    console.log("\n2️⃣ Deploying BridgeHelper...");
    const BridgeHelper = await ethers.getContractFactory("BridgeHelper");
    const bridgeHelper = await BridgeHelper.deploy();
    await bridgeHelper.waitForDeployment();
    const bridgeAddress = await bridgeHelper.getAddress();
    console.log(`✅ BridgeHelper deployed to: ${bridgeAddress}`);
    
    // Deploy SwapContract (optional, for instant swaps)
    console.log("\n3️⃣ Deploying SwapContract...");
    const SwapContract = await ethers.getContractFactory("SwapContract");
    const swapContract = await SwapContract.deploy();
    await swapContract.waitForDeployment();
    const swapAddress = await swapContract.getAddress();
    console.log(`✅ SwapContract deployed to: ${swapAddress}`);
    
    // Verify deployments
    console.log("\n🔍 Verifying deployments...");
    
    // Test TriggerContract
    try {
      const triggerFee = await triggerContract.triggerFee();
      const nextTriggerId = await triggerContract.nextTriggerId();
      const minDuration = await triggerContract.MIN_TRIGGER_DURATION();
      const maxDuration = await triggerContract.MAX_TRIGGER_DURATION();
      console.log(`   TriggerContract - Fee: ${ethers.formatEther(triggerFee)} HYPE, Next ID: ${nextTriggerId}`);
      console.log(`   Duration limits: ${minDuration / 3600}h - ${maxDuration / 86400}d`);
    } catch (error: any) {
      console.log(`   ⚠️ TriggerContract verification failed: ${error.message}`);
    }
    
    // Test BridgeHelper
    try {
      const hypeSystem = await bridgeHelper.getSystemAddress(0);
      const usdcSystem = await bridgeHelper.getSystemAddress(1);
      console.log(`   BridgeHelper - HYPE System: ${hypeSystem}`);
      console.log(`   BridgeHelper - USDC System: ${usdcSystem}`);
    } catch (error: any) {
      console.log(`   ⚠️ BridgeHelper verification failed: ${error.message}`);
    }
    
    // Test SwapContract
    try {
      const swapFee = await swapContract.swapFee();
      const isPaused = await swapContract.paused();
      console.log(`   SwapContract - Fee: ${ethers.formatEther(swapFee)} HYPE, Paused: ${isPaused}`);
    } catch (error: any) {
      console.log(`   ⚠️ SwapContract verification failed: ${error.message}`);
    }
    
    // Test admin functions
    console.log("\n🔧 Testing admin functions...");
    try {
      const adminRole = await triggerContract.DEFAULT_ADMIN_ROLE();
      const executorRole = await triggerContract.EXECUTOR_ROLE();
      const hasAdminRole = await triggerContract.hasRole(adminRole, deployer.address);
      const hasExecutorRole = await triggerContract.hasRole(executorRole, deployer.address);
      
      console.log(`   👑 Deployer has admin role: ${hasAdminRole}`);
      console.log(`   ⚡ Deployer has executor role: ${hasExecutorRole}`);
      
      if (hasAdminRole) {
        console.log("   ✅ Admin functions available");
      }
      
    } catch (error: any) {
      console.log(`   ⚠️ Admin function test failed: ${error.message}`);
    }
    
    // Configure asset indexes for oracle price verification
    console.log("\n🔮 Configuring oracle asset indexes...");
    
    // Determine network and set appropriate indexes
    const isTestnet = hre.network.name === "hyperevm-testnet" || hre.network.name === "hardhat";
    
    // TESTNET SPOT INDEXES
    const TESTNET_ASSETS = ["HYPE"];
    const TESTNET_INDEXES = [1105];
    
    // MAINNET SPOT INDEXES (L1 names - all have U prefix except HYPE)
    const MAINNET_ASSETS = ["HYPE", "UBTC", "UFART", "USOL", "UETH", "UPUMP"];
    const MAINNET_INDEXES = [150, 197, 269, 254, 221, 299];
    
    const assets = isTestnet ? TESTNET_ASSETS : MAINNET_ASSETS;
    const indexes = isTestnet ? TESTNET_INDEXES : MAINNET_INDEXES;
    
    try {
      console.log(`   Setting ${assets.length} asset indexes for ${isTestnet ? "testnet" : "mainnet"}...`);
      
      const tx = await triggerContract.setAssetIndexes(assets, indexes);
      await tx.wait();
      
      console.log(`   ✅ Asset indexes configured!`);
      console.log(`   Assets: ${assets.join(", ")}`);
      
      // Verify a few
      for (let i = 0; i < Math.min(3, assets.length); i++) {
        const storedIndex = await triggerContract.assetToSpotIndex(assets[i]);
        console.log(`   Verified: ${assets[i]} → ${storedIndex}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ Asset index configuration failed: ${error.message}`);
    }
    
    // Final summary
    console.log("\n" + "=".repeat(70));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(70));
    console.log(`TriggerContract: ${triggerAddress}`);
    console.log(`BridgeHelper:    ${bridgeAddress}`);
    console.log(`SwapContract:    ${swapAddress}`);
    console.log(`Deployer:        ${deployer.address}`);
    console.log(`Network:         ${hre.network.name}`);
    console.log("");
    console.log("📋 NEXT STEPS:");
    console.log("1. Save contract addresses for frontend (.env)");
    console.log("2. Grant EXECUTOR_ROLE to worker address");
    console.log("3. Configure BridgeHelper token addresses");
    console.log("");
    console.log("🔧 CONTRACT CONFIGURATION:");
    console.log("- Trigger Fee: 0.001 HYPE (prevents spam)");
    console.log("- Swap Fee: 0.001 HYPE");
    console.log("- Max Slippage: 50%");
    console.log("- Duration: 1h - 30d");
    console.log("");
    console.log("💡 ARCHITECTURE:");
    console.log("- TriggerContract stores trigger parameters (no funds held)");
    console.log("- User funds stay in HyperCore spot balance");
    console.log("- Worker executes trades via Hyperliquid API");
    console.log("- User must authorize worker as agent on Hyperliquid");
    console.log("=".repeat(70));
    
    // Save deployment info to file
    const deploymentInfo = {
      network: hre.network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        TriggerContract: triggerAddress,
        BridgeHelper: bridgeAddress,
        SwapContract: swapAddress,
      },
    };
    
    console.log("\n📄 Deployment Info (copy to .env):");
    console.log(`NEXT_PUBLIC_TRIGGER_CONTRACT_ADDRESS=${triggerAddress}`);
    console.log(`NEXT_PUBLIC_BRIDGE_HELPER_ADDRESS=${bridgeAddress}`);
    console.log(`NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS=${swapAddress}`);
    
  } catch (error: any) {
    console.error("\n💥 Deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => {
    console.log("\n✅ Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("\n💥 Deployment script failed:", error.message);
    process.exit(1);
  });
