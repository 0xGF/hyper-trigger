// Grant EXECUTOR_ROLE to worker address
import hre from "hardhat";

const ethers = (hre as any).ethers;

async function main() {
  const TRIGGER_CONTRACT = process.env.TRIGGER_CONTRACT_ADDRESS || "0x77B5D94C7B79CBBFd534b9Bd2225E7648C17eaf4";
  const WORKER_ADDRESS = "0xA84d80b1B0F576A7e9aF0b985007CaF19587ACBC";

  console.log("🔧 Granting EXECUTOR_ROLE to worker...");
  console.log(`Contract: ${TRIGGER_CONTRACT}`);
  console.log(`Worker: ${WORKER_ADDRESS}`);

  const [signer] = await ethers.getSigners();
  console.log(`Signer: ${signer.address}`);

  const TriggerContract = await ethers.getContractFactory("TriggerContract");
  const contract = TriggerContract.attach(TRIGGER_CONTRACT);

  const EXECUTOR_ROLE = await contract.EXECUTOR_ROLE();
  console.log(`EXECUTOR_ROLE: ${EXECUTOR_ROLE}`);

  // Check if already has role
  const hasRole = await contract.hasRole(EXECUTOR_ROLE, WORKER_ADDRESS);
  if (hasRole) {
    console.log("✅ Worker already has EXECUTOR_ROLE");
    return;
  }

  // Grant role
  const tx = await contract.grantRole(EXECUTOR_ROLE, WORKER_ADDRESS);
  await tx.wait();

  console.log("✅ EXECUTOR_ROLE granted to worker!");

  // Verify
  const hasRoleNow = await contract.hasRole(EXECUTOR_ROLE, WORKER_ADDRESS);
  console.log(`Verified: ${hasRoleNow}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });

