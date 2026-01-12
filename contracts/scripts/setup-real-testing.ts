import hre from "hardhat";
import fs from "fs";
import path from "path";

// Type assertion to access ethers
const ethers = (hre as any).ethers;

async function main() {
  console.log("🔧 HYPER TRIGGER REAL TESTING SETUP");
  console.log("=" .repeat(70));
  
  // Check environment setup
  console.log("\n1️⃣ Checking Environment Setup...");
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === 'your_private_key_here_without_0x_prefix') {
    console.log("❌ ERROR: PRIVATE_KEY not set in .env file");
    console.log("   Create a .env file with your private key:");
    console.log("   PRIVATE_KEY=your_private_key_without_0x");
    process.exit(1);
  }
  
  console.log("✅ Private key configured");
  
  // Check wallet balance
  console.log("\n2️⃣ Checking Wallet Balance...");
  
  try {
    const [signer] = await ethers.getSigners();
    const address = signer.address;
    const balance = await ethers.provider.getBalance(address);
    
    console.log(`👤 Wallet Address: ${address}`);
    console.log(`💰 HYPE Balance: ${ethers.formatEther(balance)} HYPE`);
    
    if (balance < ethers.parseEther("1")) {
      console.log("⚠️ WARNING: Low HYPE balance!");
      console.log("   You need at least 1 HYPE for testing");
      console.log("   Get HYPE from HyperLiquid testnet faucet");
    } else {
      console.log("✅ Sufficient HYPE balance for testing");
    }
  } catch (error: any) {
    console.log(`❌ ERROR: Cannot connect to HyperEVM testnet: ${error.message}`);
    console.log("   Check your network configuration and RPC URL");
    process.exit(1);
  }
  
  // Check if contracts are compiled
  console.log("\n3️⃣ Checking Contract Compilation...");
  
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  if (!fs.existsSync(artifactsDir)) {
    console.log("❌ ERROR: Contracts not compiled");
    console.log("   Run: pnpm run compile");
    process.exit(1);
  }
  
  const swapArtifact = path.join(artifactsDir, "SwapContract.sol/SwapContract.json");
  const triggerArtifact = path.join(artifactsDir, "TriggerContract.sol/TriggerContract.json");
  
  if (!fs.existsSync(swapArtifact) || !fs.existsSync(triggerArtifact)) {
    console.log("❌ ERROR: Contract artifacts missing");
    console.log("   Run: pnpm run compile");
    process.exit(1);
  }
  
  console.log("✅ Contracts compiled successfully");
  
  // Instructions
  console.log("\n" + "=".repeat(70));
  console.log("🚀 READY FOR REAL TESTING!");
  console.log("=".repeat(70));
  
  console.log("\n📋 STEP-BY-STEP GUIDE:");
  console.log("1. Deploy contracts to HyperEVM testnet:");
  console.log("   pnpm run deploy:testnet");
  console.log("");
  console.log("2. Copy the deployed contract addresses");
  console.log("   Update SWAP_CONTRACT_ADDRESS and TRIGGER_CONTRACT_ADDRESS");
  console.log("   in scripts/test-real-trading.ts");
  console.log("");
  console.log("3. Run the real trading test:");
  console.log("   pnpm run test:real");
  console.log("");
  
  console.log("⚠️  IMPORTANT WARNINGS:");
  console.log("- This will use REAL HYPE from your wallet");
  console.log("- Test with small amounts first (0.1-0.2 HYPE)");
  console.log("- Make sure you have enough HYPE for gas fees");
  console.log("- Cancel test triggers if you want your HYPE back");
  console.log("");
  
  console.log("🔍 WHAT THE TEST WILL DO:");
  console.log("✅ Connect to your deployed contracts");
  console.log("✅ Test system address generation");
  console.log("✅ Test HyperLiquid oracle integration");
  console.log("✅ Test spot balance queries");
  console.log("✅ Execute REAL HYPE → USDC swap");
  console.log("✅ Create REAL trigger order");
  console.log("✅ Verify cross-layer integration");
  console.log("");
  
  console.log("🎯 SUCCESS CRITERIA:");
  console.log("- Contracts deploy without errors");
  console.log("- System addresses generate correctly");
  console.log("- HYPE swap executes successfully");
  console.log("- Trigger creates and locks HYPE");
  console.log("- Cross-layer transfers work");
  console.log("- Tokens end up where expected");
  
  console.log("\n" + "=".repeat(70));
  console.log("Ready to deploy? Run: pnpm run deploy:testnet");
  console.log("=".repeat(70));
}

main()
  .then(() => {
    console.log("\n✅ Setup check completed!");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("\n💥 Setup check failed:", error.message);
    process.exit(1);
  }); 