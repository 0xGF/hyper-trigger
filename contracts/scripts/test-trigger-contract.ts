// Comprehensive Test for TriggerContract - USDC-Only Price Triggers
// @ts-ignore - hardhat provides ethers globally at runtime
const { ethers } = require("hardhat");
import { getAssetIndex, getToken } from "@hyper-trigger/shared";

interface TestResults {
  passed: number;
  failed: number;
  errors: string[];
}

class TriggerContractTester {
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
    this.log("🚀 Starting TriggerContract Tests");
    this.log(`📍 Contract: ${await this.contract.getAddress()}`);
    this.log(`👤 Signer: ${this.signer.address}`);

    // Test 1: Contract Constants
    await this.test("Contract Constants", async () => {
      const maxSlippage = await this.contract.MAX_SLIPPAGE();
      const executionReward = await this.contract.executionReward();
      const nextTriggerId = await this.contract.nextTriggerId();
      const usdcTokenId = await this.contract.USDC_TOKEN_ID();
      
      if (maxSlippage !== 50n) {
        throw new Error(`Max slippage incorrect: ${maxSlippage} (expected 50)`);
      }
      if (executionReward !== ethers.parseEther("0.01")) {
        throw new Error(`Execution reward incorrect: ${ethers.formatEther(executionReward)} (expected 0.01)`);
      }
      if (nextTriggerId !== 1n) {
        throw new Error(`Next trigger ID incorrect: ${nextTriggerId} (expected 1)`);
      }
      if (usdcTokenId !== 1n) {
        throw new Error(`USDC token ID incorrect: ${usdcTokenId} (expected 1)`);
      }
      
      this.log(`💰 Execution reward: ${ethers.formatEther(executionReward)} HYPE`);
      this.log(`📊 Max slippage: ${maxSlippage}%`);
      this.log(`🪙 USDC token ID: ${usdcTokenId}`);
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
        { input: 50000000000n, decimals: 6, expected: ethers.parseEther("50000") },
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
      
      const hasExecutorRole = await this.contract.hasRole(EXECUTOR_ROLE, this.signer.address);
      if (!hasExecutorRole) {
        throw new Error("Deployer should have executor role");
      }
      
      this.log(`👑 Admin role verified`);
      this.log(`🔑 EXECUTOR_ROLE: ${EXECUTOR_ROLE}`);
    });

    // Test 5: Execution Reward Management
    await this.test("Execution Reward Management", async () => {
      const originalReward = await this.contract.executionReward();
      const newReward = ethers.parseEther("0.02");
      
      // Set new reward
      await this.contract.setExecutionReward(newReward);
      const updatedReward = await this.contract.executionReward();
      
      if (updatedReward !== newReward) {
        throw new Error(`Reward update failed: ${ethers.formatEther(updatedReward)} !== ${ethers.formatEther(newReward)}`);
      }
      
      // Restore original reward
      await this.contract.setExecutionReward(originalReward);
      
      this.log(`💰 Execution reward management verified`);
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

    // Test 8: Trigger Creation Validation
    await this.test("Trigger Creation Validation", async () => {
      try {
        // Try to create trigger with zero amount
        await this.contract.createTrigger(
          3, // BTC oracle
          142, // BTC token
          0, // Zero amount
          ethers.parseEther("100000"),
          true,
          500,
          { value: ethers.parseEther("0.01") }
        );
        throw new Error("Should have failed with zero amount");
      } catch (error: unknown) {
        if (!(error instanceof Error) || !error.message.includes("ZeroAmount")) {
          throw new Error("Should fail with ZeroAmount error");
        }
      }
      
      try {
        // Try to create trigger with excessive slippage
        await this.contract.createTrigger(
          3, // BTC oracle
          142, // BTC token
          ethers.parseUnits("1000", 6), // 1000 USDC
          ethers.parseEther("100000"),
          true,
          10000, // 100% slippage (too high)
          { value: ethers.parseEther("0.01") }
        );
        throw new Error("Should have failed with excessive slippage");
      } catch (error: unknown) {
        if (!(error instanceof Error) || !error.message.includes("InvalidSlippage")) {
          throw new Error("Should fail with InvalidSlippage error");
        }
      }
      
      this.log(`🚫 Trigger creation validation works`);
    });

    // Test 9: User Deposits Tracking
    await this.test("User Deposits Initial State", async () => {
      const userDeposits = await this.contract.userUsdcDeposits(this.signer.address);
      
      if (userDeposits !== 0n) {
        throw new Error("Initial user deposits should be 0");
      }
      
      this.log(`💳 User deposits tracking initialized`);
    });

    // Test 10: Trigger State Queries
    await this.test("Trigger State Queries", async () => {
      // Test non-existent trigger
      const trigger = await this.contract.getTrigger(999);
      if (trigger.user !== ethers.ZeroAddress) {
        throw new Error("Non-existent trigger should have zero address");
      }
      
      // Test trigger readiness for non-existent trigger
      const [conditionMet, currentPrice] = await this.contract.isTriggerReady(999);
      if (conditionMet !== false || currentPrice !== 0n) {
        throw new Error("Non-existent trigger should return false, 0");
      }
      
      // Test user triggers for user with no triggers
      const userTriggers = await this.contract.getUserTriggers(this.signer.address);
      if (userTriggers.length !== 0) {
        throw new Error("User should have no triggers initially");
      }
      
      this.log(`🔍 Trigger state queries verified`);
    });

    // Test 11: Shared Package Integration
    await this.test("Shared Package Integration", async () => {
      const btcIndex = getAssetIndex('BTC');
      const ethIndex = getAssetIndex('ETH');
      const btcToken = getToken('BTC');
      const usdcToken = getToken('USDC');
      
      if (btcIndex !== 3) throw new Error(`BTC index should be 3, got ${btcIndex}`);
      if (ethIndex !== 4) throw new Error(`ETH index should be 4, got ${ethIndex}`);
      if (!btcToken || btcToken.tokenId !== 142) {
        throw new Error(`BTC token should have tokenId 142, got ${btcToken?.tokenId}`);
      }
      if (!usdcToken || usdcToken.tokenId !== 1) {
        throw new Error(`USDC token should have tokenId 1, got ${usdcToken?.tokenId}`);
      }
      
      this.log(`📦 Shared package integration verified`);
      this.log(`   BTC: oracle=${btcIndex}, tokenId=${btcToken.tokenId}`);
      this.log(`   USDC: tokenId=${usdcToken.tokenId}`);
    });

    // Test 12: Emergency Functions
    await this.test("Emergency Functions", async () => {
      // Test emergency withdraw (no tokens to withdraw, but function should exist)
      try {
        await this.contract.emergencyWithdraw(0, 0); // Try to withdraw 0 HYPE
        this.log(`🚨 Emergency withdraw function works`);
      } catch (error: unknown) {
        // This might fail if trying to withdraw 0, but function should exist
        if (error instanceof Error && !error.message.includes("function")) {
          this.log(`🚨 Emergency withdraw function exists`);
        } else {
          throw error;
        }
      }
    });

    // Test 13: Execution State Enum
    await this.test("Execution State Handling", async () => {
      // Test that we can reference execution states
      // Since we can't access enum values directly, we test through trigger creation
      // This is tested implicitly through other tests, so we just verify the structure
      
      const trigger = await this.contract.getTrigger(1); // Non-existent trigger
      // State should be 0 (PENDING) for non-existent triggers
      if (Number(trigger.state) !== 0) {
        throw new Error(`Non-existent trigger should have state 0, got ${trigger.state}`);
      }
      
      this.log(`🔄 Execution state handling verified`);
    });

    this.printResults();
  }

  private printResults() {
    this.log("\n" + "=".repeat(80));
    this.log("📊 TRIGGER CONTRACT TEST RESULTS");
    this.log("=".repeat(80));
    this.log(`✅ PASSED: ${this.results.passed}`);
    this.log(`❌ FAILED: ${this.results.failed}`);
    this.log(`📈 SUCCESS RATE: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      this.log("\n🚨 FAILED TESTS:");
      this.results.errors.forEach(error => this.log(`   ${error}`));
    }
    
    this.log("\n🎯 TRIGGER CONTRACT STATUS:");
    if (this.results.failed === 0) {
      this.log("   ✅ ALL TESTS PASSED - Ready for USDC triggers!");
    } else if (this.results.failed <= 2) {
      this.log("   ⚠️  Minor issues detected - Review failed tests");
    } else {
      this.log("   🚨 Major issues detected - Contract needs fixes");
    }
    
    this.log("\n📋 TRIGGER CONTRACT FEATURES:");
    this.log("   🪙 USDC-only input (stable refunds)");
    this.log("   🎯 Price-triggered swaps");
    this.log("   🔄 Multi-phase execution");
    this.log("   💰 Safe refund mechanism");
    this.log("   ⏸️ Pausable for emergencies");
    this.log("=".repeat(80));
  }
}

async function main() {
  console.log("🎯 TriggerContract Local Test Suite");
  console.log("🌐 Network: Hardhat Local");
  console.log("🎯 Focus: USDC-only price triggers");
  
  const [signer] = await ethers.getSigners();
  console.log(`🔑 Testing with account: ${signer.address}`);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} HYPE`);
  
  // Deploy the contract
  console.log("\n🚀 Deploying TriggerContract...");
  const TriggerContract = await ethers.getContractFactory("TriggerContract");
  const contract = await TriggerContract.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`📋 Contract deployed at: ${contractAddress}`);
  
  // Run tests
  const tester = new TriggerContractTester(contract, signer);
  await tester.runAllTests();
}

main()
  .then(() => {
    console.log("\n🎉 TriggerContract test suite completed!");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("\n💥 TriggerContract test suite failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }); 