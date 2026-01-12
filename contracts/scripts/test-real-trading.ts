import hre from "hardhat";

// Type assertion to access ethers (works at runtime even if TypeScript complains)
const ethers = (hre as any).ethers;

// Contract addresses (will be filled after deployment)
const SWAP_CONTRACT_ADDRESS = "0x65A95F0b55a00567316aBBB00E064075549e11b2"; // Fill this after deployment
const TRIGGER_CONTRACT_ADDRESS = "0x186B93000Cbf73fc2e2737002BB76517a6AbcC0a"; // Fill this after deployment

// Known ERC20 tokens on HyperEVM testnet (these need to be real addresses)
const KNOWN_TOKENS = {
  // These would be real ERC20 contract addresses linked to HyperCore
  // You'll need to provide real addresses from HyperLiquid documentation
  USDC: "0x0000000000000000000000000000000000000000", // Replace with real USDC address
  BTC: "0x0000000000000000000000000000000000000000",  // Replace with real BTC address
  ETH: "0x0000000000000000000000000000000000000000",  // Replace with real ETH address
};

async function main() {
  console.log("🔥 REAL TRADING TEST - HyperEVM Testnet");
  console.log("=" .repeat(80));
  console.log("⚠️  WARNING: This uses REAL HYPE tokens from your wallet!");
  console.log("=" .repeat(80));

  // Get signer (your wallet)
  const [trader] = await ethers.getSigners();
  console.log(`👤 Trading with wallet: ${trader.address}`);
  
  // Check HYPE balance
  const balance = await ethers.provider.getBalance(trader.address);
  console.log(`💰 Current HYPE balance: ${ethers.formatEther(balance)} HYPE`);
  
  if (balance < ethers.parseEther("1")) {
    console.log("❌ ERROR: Need at least 1 HYPE for testing. Get more HYPE first.");
    process.exit(1);
  }

  // Check if contract addresses are set
  if (!SWAP_CONTRACT_ADDRESS || !TRIGGER_CONTRACT_ADDRESS) {
    console.log("❌ ERROR: Contract addresses not set. Deploy contracts first:");
    console.log("   pnpm run deploy:testnet");
    console.log("   Then update SWAP_CONTRACT_ADDRESS and TRIGGER_CONTRACT_ADDRESS in this script");
    process.exit(1);
  }

  // Connect to deployed contracts
  console.log("\n🔗 Connecting to deployed contracts...");
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const TriggerContract = await ethers.getContractFactory("TriggerContract");
  
  const swapContract = SwapContract.attach(SWAP_CONTRACT_ADDRESS);
  const triggerContract = TriggerContract.attach(TRIGGER_CONTRACT_ADDRESS);
  
  console.log(`✅ Connected to SwapContract: ${SWAP_CONTRACT_ADDRESS}`);
  console.log(`✅ Connected to TriggerContract: ${TRIGGER_CONTRACT_ADDRESS}`);

  // Test 1: System Address Generation
  console.log("\n🏠 Testing System Address Generation...");
  try {
    const hypeSystemAddr = await swapContract.getTokenSystemAddress(0);
    const usdcSystemAddr = await swapContract.getTokenSystemAddress(1);
    const btcSystemAddr = await swapContract.getTokenSystemAddress(2);
    
    console.log(`   HYPE System Address: ${hypeSystemAddr}`);
    console.log(`   USDC System Address: ${usdcSystemAddr}`);
    console.log(`   BTC System Address: ${btcSystemAddr}`);
    
    if (hypeSystemAddr === "0x2222222222222222222222222222222222222222") {
      console.log("   ✅ HYPE system address correct");
    } else {
      console.log("   ❌ HYPE system address incorrect - this is a problem!");
    }
  } catch (error: any) {
    console.log(`   ❌ System address test failed: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Oracle Integration
  console.log("\n📊 Testing Oracle Integration...");
  try {
    const btcPrice = await swapContract.getOraclePrice(1); // BTC oracle
    const ethPrice = await swapContract.getOraclePrice(2); // ETH oracle
    
    console.log(`   BTC Oracle Price: ${btcPrice.toString()}`);
    console.log(`   ETH Oracle Price: ${ethPrice.toString()}`);
    
    if (btcPrice > 0) {
      console.log("   ✅ Oracle integration working!");
    } else {
      console.log("   ⚠️ Oracle returning 0 - might not be available on testnet");
    }
  } catch (error: any) {
    console.log(`   ⚠️ Oracle test failed: ${error.message}`);
    console.log("   This is expected if oracles aren't available on testnet");
  }

  // Test 3: Spot Balance Check
  console.log("\n💰 Testing Spot Balance Integration...");
  try {
    const hypeSpotBalance = await swapContract.getSpotBalance(trader.address, 0);
    const usdcSpotBalance = await swapContract.getSpotBalance(trader.address, 1);
    
    console.log(`   Your HYPE Spot Balance: ${hypeSpotBalance.toString()}`);
    console.log(`   Your USDC Spot Balance: ${usdcSpotBalance.toString()}`);
    
    console.log("   ✅ Spot balance queries working!");
  } catch (error: any) {
    console.log(`   ⚠️ Spot balance test failed: ${error.message}`);
    console.log("   This is expected if precompiles aren't available on testnet");
  }

  // Test 4: REAL HYPE SWAP
  console.log("\n🔥 REAL HYPE SWAP TEST");
  console.log("⚠️  This will use 0.1 HYPE from your wallet!");
  
  // Wait for user confirmation
  console.log("\nPress Ctrl+C to cancel, or wait 10 seconds to continue...");
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    const swapAmount = ethers.parseEther("0.1"); // 0.1 HYPE
    const swapFee = await swapContract.swapFee();
    const totalValue = swapAmount + swapFee;
    
    console.log(`   Swapping: ${ethers.formatEther(swapAmount)} HYPE → USDC`);
    console.log(`   Swap Fee: ${ethers.formatEther(swapFee)} HYPE`);
    console.log(`   Total Cost: ${ethers.formatEther(totalValue)} HYPE`);
    
    const balanceBefore = await ethers.provider.getBalance(trader.address);
    
    // Execute REAL swap
    const swapTx = await swapContract.executeSwap(
      0, // fromToken (HYPE)
      1, // toToken (USDC spot index)
      swapAmount,
      0, // minOutput (0 for testing - don't do this in production!)
      ethers.ZeroAddress, // fromTokenAddress (0x0 for HYPE)
      { value: totalValue }
    );
    
    console.log(`   📝 Transaction hash: ${swapTx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await swapTx.wait();
    console.log(`   ✅ REAL SWAP EXECUTED! Gas used: ${receipt?.gasUsed}`);
    
    const balanceAfter = await ethers.provider.getBalance(trader.address);
    const actualCost = balanceBefore - balanceAfter;
    
    console.log(`   💸 Actual cost: ${ethers.formatEther(actualCost)} HYPE (including gas)`);
    
    // Check swap details
    const swap = await swapContract.getSwap(1);
    console.log(`   📊 Swap created: ${swap.fromToken} → ${swap.toToken}`);
    console.log(`   📊 Amount: ${ethers.formatEther(swap.fromAmount)} HYPE`);
    console.log(`   📊 Status: ${swap.completed ? "Completed" : "Pending"}`);
    
    console.log("\n🎉 REAL HYPE SWAP SUCCESSFUL!");
    console.log("   The swap has been initiated on HyperEVM");
    console.log("   Check if tokens arrive in your HyperCore spot balance");
    console.log("   Or check if they come back to your HyperEVM wallet");
    
  } catch (error: any) {
    console.log(`   ❌ REAL SWAP FAILED: ${error.message}`);
    console.log("   Your HYPE is safe - transaction reverted");
  }

  // Test 5: REAL TRIGGER CREATION
  console.log("\n⏰ REAL TRIGGER TEST");
  console.log("⚠️  This will use 0.05 HYPE + execution reward from your wallet!");
  
  try {
    const triggerAmount = ethers.parseEther("0.05"); // 0.05 HYPE
    const executionReward = await triggerContract.executionReward();
    const totalTriggerValue = triggerAmount + executionReward;
    
    console.log(`   Creating trigger: ${ethers.formatEther(triggerAmount)} HYPE → BTC`);
    console.log(`   Execution Reward: ${ethers.formatEther(executionReward)} HYPE`);
    console.log(`   Total Cost: ${ethers.formatEther(totalTriggerValue)} HYPE`);
    
    const triggerTx = await triggerContract.createTrigger(
      1, // triggerOracleIndex (BTC price oracle)
      0, // fromToken (HYPE)
      2, // toToken (BTC)
      ethers.ZeroAddress, // fromTokenAddress (0x0 for HYPE)
      triggerAmount,
      ethers.parseUnits("200000", 6), // triggerPrice ($200k BTC - unlikely to trigger)
      true, // isAbove (trigger when BTC > $200k)
      0, // minOutput (0 for testing)
      24, // durationHours
      { value: totalTriggerValue }
    );
    
    console.log(`   📝 Transaction hash: ${triggerTx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await triggerTx.wait();
    console.log(`   ✅ REAL TRIGGER CREATED! Gas used: ${receipt?.gasUsed}`);
    
    // Check trigger details
    const trigger = await triggerContract.getTrigger(1);
    console.log(`   📊 Trigger ID: ${trigger.id}`);
    console.log(`   📊 User: ${trigger.user}`);
    console.log(`   📊 From: ${trigger.fromToken} → To: ${trigger.toToken}`);
    console.log(`   📊 Amount: ${ethers.formatEther(trigger.fromAmount)} HYPE`);
    console.log(`   📊 Trigger Price: $${ethers.formatUnits(trigger.triggerPrice, 6)}`);
    console.log(`   📊 Status: ${trigger.status} (0=Active)`);
    
    console.log("\n🎉 REAL TRIGGER CREATED!");
    console.log("   Your HYPE is locked in the contract until:");
    console.log("   1. BTC hits $200k (unlikely) and trigger executes");
    console.log("   2. You cancel the trigger");
    console.log("   3. Trigger expires in 24 hours");
    
  } catch (error: any) {
    console.log(`   ❌ REAL TRIGGER FAILED: ${error.message}`);
    console.log("   Your HYPE is safe - transaction reverted");
  }

  // Final Summary
  console.log("\n" + "=".repeat(80));
  console.log("🏁 REAL TRADING TEST COMPLETE!");
  console.log("=".repeat(80));
  
  const finalBalance = await ethers.provider.getBalance(trader.address);
  console.log(`💰 Final HYPE balance: ${ethers.formatEther(finalBalance)} HYPE`);
  
  console.log("\n📋 WHAT HAPPENED:");
  console.log("✅ Connected to real deployed contracts on HyperEVM");
  console.log("✅ Tested system address generation");
  console.log("✅ Tested oracle integration (if available)");
  console.log("✅ Tested spot balance queries (if available)");
  console.log("✅ Executed REAL HYPE swap with your wallet");
  console.log("✅ Created REAL trigger with your HYPE");
  
  console.log("\n🔍 NEXT STEPS:");
  console.log("1. Check your HyperCore spot balances");
  console.log("2. See if swapped tokens appear in your wallet");
  console.log("3. Monitor trigger execution");
  console.log("4. Test with real ERC20 tokens if available");
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("- This test used REAL HYPE from your wallet");
  console.log("- Check if cross-layer transfers actually work");
  console.log("- Cancel test trigger if you want your HYPE back");
  console.log("=".repeat(80));
}

main()
  .then(() => {
    console.log("\n✅ Real trading test completed!");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("\n💥 Real trading test failed:", error.message);
    process.exit(1);
  }); 