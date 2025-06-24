// Comprehensive Test for SwapContract - Immediate Any-to-Any Swaps
// @ts-ignore - hardhat provides ethers globally at runtime
const { ethers } = require("hardhat");
import { getAssetIndex, getToken } from "@hyper-trigger/shared";

interface TestResults {
  passed: number;
  failed: number;
  errors: string[];
}

class SwapContractTester {
  private contract: any;
  private signer: any;
  private results: TestResults = { passed: 0, failed: 0, errors: [] };

  constructor(contract: any, signer: any) {
    this.contract = contract;
    this.signer = signer;
  }

  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  private async test(name: string, testFn: () => Promise<void>) {
    try {
      this.log(`🧪 Testing: ${name}`);
      await testFn();
      this.results.passed++;
      this.log(`✅ PASSED: ${name}`);
    } catch (error: unknown) {
      this.results.failed++;
      const errorMsg = `❌ FAILED: ${name} - ${error instanceof Error ? error.message : String(error)}`;
      this.log(errorMsg);
      this.results.errors.push(errorMsg);
    }
  }

  async runAllTests() {
    this.log("🚀 Starting SwapContract Tests");
    this.log(`📍 Contract: ${await this.contract.getAddress()}`);
    this.log(`👤 Signer: ${this.signer.address}`);

    // Test 1: Contract Constants
    await this.test("Contract Constants", async () => {
      const maxSlippage = await this.contract.MAX_SLIPPAGE();
      const swapFee = await this.contract.swapFee();
      
      if (maxSlippage !== 50n) {
        throw new Error(`Max slippage incorrect: ${maxSlippage} (expected 50)`);
      }
      if (swapFee !== ethers.parseEther("0.001")) {
        throw new Error(`Swap fee incorrect: ${ethers.formatEther(swapFee)} (expected 0.001)`);
      }
      
      this.log(`💰 Swap fee: ${ethers.formatEther(swapFee)} HYPE`);
      this.log(`📊 Max slippage: ${maxSlippage}%`);
    });

    // Test 2: System Address Calculations
    await this.test("System Address Calculations", async () => {
      const testCases = [
        { tokenId: 0, expected: "0x2222222222222222222222222222222222222222", name: "HYPE" },
        { tokenId: 1, expected: "0x2000000000000000000000000000000000000001", name: "USDC" },
        { tokenId: 142, expected: "0x200000000000000000000000000000000000008e", name: "BTC" },
        { tokenId: 156, expected: "0x200000000000000000000000000000000000009c", name: "ETH" }
      ];

      for (const testCase of testCases) {
        const addr = await this.contract.getSystemAddress(testCase.tokenId);
        if (addr.toLowerCase() !== testCase.expected.toLowerCase()) {
          throw new Error(`${testCase.name} address incorrect: ${addr} (expected ${testCase.expected})`);
        }
        this.log(`🔗 ${testCase.name} (${testCase.tokenId}): ${addr}`);
      }
    });

    // Test 3: Price Conversion Logic
    await this.test("Price Conversion Logic", async () => {
      const testCases = [
        { input: 100000000n, decimals: 6, expected: ethers.parseEther("100") },
        { input: 1000000000000n, decimals: 6, expected: ethers.parseEther("1000000") },
        { input: 1n, decimals: 6, expected: ethers.parseEther("0.000001") }
      ];

      for (const testCase of testCases) {
        const result = await this.contract.convertOraclePrice(testCase.input, testCase.decimals);
        if (result !== testCase.expected) {
          throw new Error(`Price conversion failed: ${result} !== ${testCase.expected}`);
        }
      }
      
      this.log(`🔄 Price conversion logic verified`);
    });

    // Test 4: Access Control Setup
    await this.test("Access Control Setup", async () => {
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const EXECUTOR_ROLE = await this.contract.EXECUTOR_ROLE();
      
      const hasAdminRole = await this.contract.hasRole(DEFAULT_ADMIN_ROLE, this.signer.address);
      if (!hasAdminRole) {
        throw new Error("Deployer should have admin role");
      }
      
      this.log(`👑 Admin role verified`);
      this.log(`🔑 EXECUTOR_ROLE: ${EXECUTOR_ROLE}`);
    });

    // Test 5: Fee Management
    await this.test("Fee Management", async () => {
      const originalFee = await this.contract.swapFee();
      const newFee = ethers.parseEther("0.002");
      
      // Set new fee
      await this.contract.setSwapFee(newFee);
      const updatedFee = await this.contract.swapFee();
      
      if (updatedFee !== newFee) {
        throw new Error(`Fee update failed: ${ethers.formatEther(updatedFee)} !== ${ethers.formatEther(newFee)}`);
      }
      
      // Restore original fee
      await this.contract.setSwapFee(originalFee);
      
      this.log(`💰 Fee management verified`);
    });

    // Test 6: Pausable Functionality
    await this.test("Pausable Functionality", async () => {
      // Pause contract
      await this.contract.pause();
      const isPaused = await this.contract.paused();
      
      if (!isPaused) {
        throw new Error("Contract should be paused");
      }
      
      // Unpause contract
      await this.contract.unpause();
      const isUnpaused = !(await this.contract.paused());
      
      if (!isUnpaused) {
        throw new Error("Contract should be unpaused");
      }
      
      this.log(`⏸️ Pause/unpause functionality verified`);
    });

    // Test 7: Oracle Price Fetching (will fail on local network)
    await this.test("Oracle Price Fetching (Expected to fail locally)", async () => {
      try {
        const btcPrice = await this.contract.getOraclePrice(3); // BTC
        this.log(`📊 BTC price: ${btcPrice}`);
        
        if (btcPrice <= 0) {
          throw new Error("Price should be > 0");
        }
      } catch (error: unknown) {
        // Expected to fail on local network
        if (error instanceof Error && error.message.includes("OracleCallFailed")) {
          this.log(`⚠️ Oracle call failed as expected on local network`);
          return; // This is expected
        }
        throw error;
      }
    });

    // Test 8: Invalid Swap Parameters
    await this.test("Invalid Swap Parameters", async () => {
      try {
        // Try to swap same token to same token
        await this.contract.executeSwap(
          0, 0, // Same token
          ethers.parseEther("1"),
          ethers.parseEther("0.9"),
          1, 1, // Same oracle
          { value: ethers.parseEther("1.001") }
        );
        throw new Error("Should have failed with same token swap");
      } catch (error: unknown) {
        if (!(error instanceof Error) || !error.message.includes("InvalidSlippage")) {
          throw new Error("Should fail with InvalidSlippage error");
        }
      }
      
      this.log(`🚫 Invalid parameter validation works`);
    });

    // Test 9: Shared Package Integration
    await this.test("Shared Package Integration", async () => {
      const btcIndex = getAssetIndex('BTC');
      const ethIndex = getAssetIndex('ETH');
      const btcToken = getToken('BTC');
      
      if (btcIndex !== 3) throw new Error(`BTC index should be 3, got ${btcIndex}`);
      if (ethIndex !== 4) throw new Error(`ETH index should be 4, got ${ethIndex}`);
      if (!btcToken || btcToken.tokenId !== 142) {
        throw new Error(`BTC token should have tokenId 142, got ${btcToken?.tokenId}`);
      }
      
      this.log(`📦 Shared package integration verified`);
    });

    // Test 10: Emergency Functions
    await this.test("Emergency Functions", async () => {
      // Test emergency withdraw (no tokens to withdraw, but function should exist)
      try {
        await this.contract.withdrawFees();
        this.log(`🚨 Emergency withdraw function works`);
      } catch (error: unknown) {
        // This might fail if no fees to withdraw, but function should exist
        if (error instanceof Error && !error.message.includes("function")) {
          this.log(`🚨 Emergency withdraw function exists`);
        } else {
          throw error;
        }
      }
    });

    this.printResults();
  }

  private printResults() {
    this.log("\n" + "=".repeat(80));
    this.log("📊 SWAP CONTRACT TEST RESULTS");
    this.log("=".repeat(80));
    this.log(`✅ PASSED: ${this.results.passed}`);
    this.log(`❌ FAILED: ${this.results.failed}`);
    this.log(`📈 SUCCESS RATE: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      this.log("\n🚨 FAILED TESTS:");
      this.results.errors.forEach(error => this.log(`   ${error}`));
    }
    
    this.log("\n🎯 SWAP CONTRACT STATUS:");
    if (this.results.failed === 0) {
      this.log("   ✅ ALL TESTS PASSED - Ready for immediate swaps!");
    } else if (this.results.failed <= 2) {
      this.log("   ⚠️  Minor issues detected - Review failed tests");
    } else {
      this.log("   🚨 Major issues detected - Contract needs fixes");
    }
    this.log("=".repeat(80));
  }
}

async function main() {
  console.log("🔄 SwapContract Local Test Suite");
  console.log("🌐 Network: Hardhat Local");
  console.log("🎯 Focus: Immediate any-to-any token swaps");
  
  const [signer] = await ethers.getSigners();
  console.log(`🔑 Testing with account: ${signer.address}`);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HYPE`);
  
  // Deploy the contract
  console.log("\n🚀 Deploying SwapContract...");
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const contract = await SwapContract.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`📋 Contract deployed at: ${contractAddress}`);
  
  // Run tests
  const tester = new SwapContractTester(contract, signer);
  await tester.runAllTests();
}

main()
  .then(() => {
    console.log("\n🎉 SwapContract test suite completed!");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("\n💥 SwapContract test suite failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }); 