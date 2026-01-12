// Script to configure asset indexes on an existing TriggerContract deployment
import hre from "hardhat";

const ethers = (hre as any).ethers;

// ============================================
// CONFIGURATION - Edit these values as needed
// ============================================

// Contract address (update after deployment)
const TRIGGER_CONTRACT_ADDRESS = process.env.TRIGGER_CONTRACT_ADDRESS || "";

// TESTNET SPOT INDEXES
const TESTNET_ASSETS = ["HYPE"];
const TESTNET_INDEXES = [1105];

// MAINNET SPOT INDEXES (L1 names - all have U prefix except HYPE)
const MAINNET_ASSETS = ["HYPE", "UBTC", "UFART", "USOL", "UETH", "UPUMP"];
const MAINNET_INDEXES = [150, 197, 269, 254, 221, 299];

async function main() {
  console.log("🔮 Configuring Oracle Asset Indexes");
  console.log("=".repeat(50));

  if (!TRIGGER_CONTRACT_ADDRESS) {
    console.error("❌ TRIGGER_CONTRACT_ADDRESS not set!");
    console.log("Set it via: TRIGGER_CONTRACT_ADDRESS=0x... npx hardhat run scripts/configureAssets.ts --network hyperevm_testnet");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`📄 Contract: ${TRIGGER_CONTRACT_ADDRESS}`);

  // Connect to contract
  const TriggerContract = await ethers.getContractFactory("TriggerContract");
  const contract = TriggerContract.attach(TRIGGER_CONTRACT_ADDRESS);

  // Check if signer has admin role
  const adminRole = await contract.DEFAULT_ADMIN_ROLE();
  const hasAdmin = await contract.hasRole(adminRole, signer.address);
  
  if (!hasAdmin) {
    console.error("❌ Signer does not have admin role!");
    process.exit(1);
  }

  // Determine network
  const isTestnet = hre.network.name === "hyperevm-testnet" || hre.network.name === "hardhat";
  const assets = isTestnet ? TESTNET_ASSETS : MAINNET_ASSETS;
  const indexes = isTestnet ? TESTNET_INDEXES : MAINNET_INDEXES;

  console.log(`\n🌐 Network: ${isTestnet ? "TESTNET" : "MAINNET"}`);
  console.log(`📊 Configuring ${assets.length} assets...`);

  // Option 1: Batch set (recommended for new deployments)
  if (process.argv.includes("--batch")) {
    console.log("\n⚡ Using batch set...");
    const tx = await contract.setAssetIndexes(assets, indexes);
    await tx.wait();
    console.log("✅ Batch configuration complete!");
  } 
  // Option 2: Individual set (for updating specific assets)
  else {
    console.log("\n🔧 Setting individually...");
    for (let i = 0; i < assets.length; i++) {
      const currentIndex = await contract.assetToSpotIndex(assets[i]);
      
      if (currentIndex.toString() === indexes[i].toString()) {
        console.log(`   ${assets[i]} → ${indexes[i]} (already set)`);
        continue;
      }
      
      const tx = await contract.setAssetIndex(assets[i], indexes[i]);
      await tx.wait();
      console.log(`   ${assets[i]} → ${indexes[i]} ✅`);
    }
  }

  // Verify configuration
  console.log("\n🔍 Verifying configuration...");
  for (const asset of assets.slice(0, 5)) {
    const index = await contract.assetToSpotIndex(asset);
    console.log(`   ${asset}: ${index}`);
  }

  console.log("\n✅ Asset configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

