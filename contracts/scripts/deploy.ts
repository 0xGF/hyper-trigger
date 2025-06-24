// Deploy SwapContract and TriggerContract - run with: npx hardhat run scripts/deploy.ts --network hyperevm-testnet

// @ts-ignore - hardhat provides ethers globally at runtime
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying HyperTrigger Contracts...");
    
    // Deploy the SwapContract (immediate swaps)
    console.log("\n📦 Deploying SwapContract...");
    const SwapContract = await ethers.getContractFactory("SwapContract");
    const swapContract = await SwapContract.deploy();
    await swapContract.waitForDeployment();
    const swapAddress = await swapContract.getAddress();
    console.log("✅ SwapContract deployed to:", swapAddress);
    
    // Deploy the TriggerContract (USDC-only triggers)
    console.log("\n📦 Deploying TriggerContract...");
    const TriggerContract = await ethers.getContractFactory("TriggerContract");
    const triggerContract = await TriggerContract.deploy();
    await triggerContract.waitForDeployment();
    const triggerAddress = await triggerContract.getAddress();
    console.log("✅ TriggerContract deployed to:", triggerAddress);
    
    // Verify deployments
    console.log("\n🔍 Verifying deployments...");
    try {
        // Test SwapContract
        const swapPaused = await swapContract.paused();
        console.log("📊 SwapContract paused:", swapPaused);
        
        // Test TriggerContract
        const triggerPaused = await triggerContract.paused();
        const nextTriggerId = await triggerContract.nextTriggerId();
        console.log("📊 TriggerContract paused:", triggerPaused);
        console.log("📊 Next trigger ID:", nextTriggerId.toString());
        
        console.log("\n🎯 Contracts ready for HyperTrigger!");
        console.log("🔥 SwapContract: Immediate any-to-any swaps");
        console.log("🔥 TriggerContract: USDC-only price triggers");
        
        console.log("\n📋 Contract Addresses:");
        console.log("SwapContract:", swapAddress);
        console.log("TriggerContract:", triggerAddress);
        
    } catch (error) {
        console.error("❌ Error verifying deployment:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 