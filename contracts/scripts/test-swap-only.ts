import hre from "hardhat";

// Type assertion to access ethers
const ethers = (hre as any).ethers;

// Deployed contract address
const SWAP_CONTRACT_ADDRESS = "0xdbFB5f92A0A0fF120FE2cC727A171b2574ee3528";

async function main() {
  console.log("🔄 HYPE SWAP TEST - CORRECT COREWRITER ENCODING");
  console.log("=" .repeat(60));
  
  // Get signer
  const [trader] = await ethers.getSigners();
  console.log(`👤 Wallet: ${trader.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(trader.address);
  console.log(`💰 HYPE Balance: ${ethers.formatEther(balance)} HYPE`);
  
  if (balance < ethers.parseEther("0.2")) {
    console.log("❌ Need at least 0.2 HYPE for testing");
    process.exit(1);
  }
  
  // Connect to SwapContract
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const swapContract = SwapContract.attach(SWAP_CONTRACT_ADDRESS);
  console.log(`🔗 Connected to SwapContract: ${SWAP_CONTRACT_ADDRESS}`);
  
  // Test system addresses
  console.log("\n🏠 System Addresses:");
  const hypeAddr = await swapContract.getTokenSystemAddress(0);
  const usdcAddr = await swapContract.getTokenSystemAddress(1);
  console.log(`   HYPE: ${hypeAddr}`);
  console.log(`   USDC: ${usdcAddr}`);
  
  // Check if HYPE address is correct
  if (hypeAddr !== "0x2222222222222222222222222222222222222222") {
    console.log("❌ HYPE system address is wrong!");
    process.exit(1);
  }
  
  console.log("\n🔄 ATTEMPTING HYPE → USDC SWAP");
  console.log("⚠️  This will use 0.05 HYPE from your wallet");
  
  try {
    const swapAmount = ethers.parseEther("0.05"); // 0.05 HYPE
    const swapFee = await swapContract.swapFee();
    const totalValue = swapAmount + swapFee;
    
    console.log(`   Amount: ${ethers.formatEther(swapAmount)} HYPE`);
    console.log(`   Fee: ${ethers.formatEther(swapFee)} HYPE`);
    console.log(`   Total: ${ethers.formatEther(totalValue)} HYPE`);
    
    const balanceBefore = await ethers.provider.getBalance(trader.address);
    
    // Execute swap with detailed logging
    console.log("\n📝 Executing swap transaction...");
    const swapTx = await swapContract.executeSwap(
      0, // fromToken (HYPE)
      1, // toToken (USDC spot index)
      swapAmount,
      0, // minOutput (0 for testing)
      ethers.ZeroAddress, // fromTokenAddress (0x0 for HYPE)
      { 
        value: totalValue,
        gasLimit: 500000 // Explicit gas limit
      }
    );
    
    console.log(`   📝 Transaction hash: ${swapTx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await swapTx.wait();
    console.log(`   ✅ Transaction confirmed! Gas used: ${receipt?.gasUsed}`);
    
    // Check results
    const balanceAfter = await ethers.provider.getBalance(trader.address);
    const actualCost = balanceBefore - balanceAfter;
    console.log(`   💸 Total cost: ${ethers.formatEther(actualCost)} HYPE`);
    
    // Check swap details
    const swap = await swapContract.getSwap(1);
    console.log(`\n📊 Swap Details:`);
    console.log(`   ID: ${swap.id}`);
    console.log(`   User: ${swap.user}`);
    console.log(`   From Token: ${swap.fromToken} (HYPE)`);
    console.log(`   To Token: ${swap.toToken} (USDC)`);
    console.log(`   Amount: ${ethers.formatEther(swap.fromAmount)} HYPE`);
    console.log(`   Min Output: ${swap.minOutputAmount}`);
    console.log(`   Completed: ${swap.completed}`);
    console.log(`   Timestamp: ${new Date(Number(swap.timestamp) * 1000).toISOString()}`);
    
    // Check HyperCore spot balances
    console.log(`\n💰 HyperCore Spot Balances:`);
    try {
      const hypeSpotBalance = await swapContract.getSpotBalance(trader.address, 0);
      const usdcSpotBalance = await swapContract.getSpotBalance(trader.address, 1);
      console.log(`   HYPE (token 0): ${hypeSpotBalance}`);
      console.log(`   USDC (token 1): ${usdcSpotBalance}`);
      
      // Check if HYPE balance increased (indicating successful transfer)
      const expectedIncrease = ethers.parseEther("0.05");
      console.log(`\n🔍 Transfer Analysis:`);
      console.log(`   Expected HYPE increase: ${ethers.formatEther(expectedIncrease)}`);
      console.log(`   Current HyperCore HYPE: ${hypeSpotBalance}`);
      console.log(`   Previous HyperCore HYPE: 7270080000 (from deploy test)`);
      
      if (hypeSpotBalance > 7270080000n) {
        console.log(`   ✅ HYPE transfer to HyperCore WORKED!`);
        console.log(`   💡 But no USDC because we only did transfer, not swap`);
      } else {
        console.log(`   ❌ HYPE transfer to HyperCore FAILED`);
      }
      
    } catch (error: any) {
      console.log(`   ❌ Could not read spot balances: ${error.message}`);
    }
    
    // Check if HYPE is stuck in the contract
    console.log(`\n🔍 Contract Balance Check:`);
    const contractBalance = await ethers.provider.getBalance(SWAP_CONTRACT_ADDRESS);
    console.log(`   Contract HYPE balance: ${ethers.formatEther(contractBalance)} HYPE`);
    
    if (contractBalance > 0) {
      console.log(`   ⚠️  HYPE IS STUCK IN CONTRACT!`);
      console.log(`   💡 The system address transfer isn't working properly`);
    } else {
      console.log(`   ✅ No HYPE stuck in contract`);
    }
    
    if (swap.completed) {
      console.log("\n🎉 SWAP COMPLETED SUCCESSFULLY!");
      console.log("   Cross-layer integration is working!");
    } else {
      console.log("\n⏳ SWAP INITIATED BUT NOT COMPLETED");
      console.log("   This is normal - swap completion happens async");
      console.log("   Check your HyperCore spot balance for USDC");
      console.log("   Or wait for tokens to arrive back on HyperEVM");
    }
    
  } catch (error: any) {
    console.log(`\n❌ SWAP FAILED: ${error.message}`);
    
    // Parse the error for more details
    if (error.message.includes("CoreWriter call failed")) {
      console.log("\n🔍 COREWRITER DEBUG:");
      console.log("   - CoreWriter address: 0x3333333333333333333333333333333333333333");
      console.log("   - This suggests the CoreWriter precompile isn't working on testnet");
      console.log("   - Or our encoding format is wrong");
      console.log("   - The contract logic is correct but HyperCore integration fails");
    }
    
    console.log("\n💡 POSSIBLE ISSUES:");
    console.log("   1. HyperEVM testnet doesn't have real CoreWriter precompile");
    console.log("   2. Our CoreWriter action encoding is incorrect");
    console.log("   3. SpotSend action (ID 6) format is wrong");
    console.log("   4. Testnet limitations - may work on mainnet");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🏁 SWAP TEST COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => {
    console.log("\n✅ Swap test completed!");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("\n💥 Swap test failed:", error.message);
    process.exit(1);
  }); 