import { expect } from "chai"
import { ethers } from "hardhat"
import type { TriggerContract } from "../src/types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import { parseEther, parseUnits } from "ethers"

describe("TriggerContract", function () {
  let triggerContract: TriggerContract
  let owner: HardhatEthersSigner
  let user1: HardhatEthersSigner
  let executor: HardhatEthersSigner

  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"))

  beforeEach(async function () {
    [owner, user1, executor] = await ethers.getSigners()

    const TriggerContractFactory = await ethers.getContractFactory("TriggerContract")
    triggerContract = await TriggerContractFactory.deploy()
    await triggerContract.waitForDeployment()

    // Grant executor role
    await triggerContract.grantRole(EXECUTOR_ROLE, executor.address)
  })

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      const adminRole = await triggerContract.DEFAULT_ADMIN_ROLE()
      expect(await triggerContract.hasRole(adminRole, owner.address)).to.be.true
    })

    it("Should set the deployer as executor", async function () {
      expect(await triggerContract.hasRole(EXECUTOR_ROLE, owner.address)).to.be.true
    })

    it("Should set default trigger fee", async function () {
      expect(await triggerContract.triggerFee()).to.equal(parseEther("0.001"))
    })

    it("Should start with nextTriggerId = 1", async function () {
      expect(await triggerContract.nextTriggerId()).to.equal(1)
    })
  })

  describe("createTrigger", function () {
    const triggerParams = {
      watchAsset: "BTC",
      targetPrice: parseUnits("100000", 6), // $100,000 in 6 decimals
      isAbove: true,
      tradeAsset: "HYPE",
      isBuy: true,
      amount: parseUnits("1000", 6), // 1000 USDC
      maxSlippage: 100n, // 1%
      durationHours: 24n,
    }

    it("Should create a trigger with correct parameters", async function () {
      const fee = await triggerContract.triggerFee()

      await expect(
        triggerContract.connect(user1).createTrigger(
          triggerParams.watchAsset,
          triggerParams.targetPrice,
          triggerParams.isAbove,
          triggerParams.tradeAsset,
          triggerParams.isBuy,
          triggerParams.amount,
          triggerParams.maxSlippage,
          triggerParams.durationHours,
          { value: fee }
        )
      ).to.emit(triggerContract, "TriggerCreated")

      const trigger = await triggerContract.getTrigger(1)
      expect(trigger.id).to.equal(1)
      expect(trigger.user).to.equal(user1.address)
      expect(trigger.watchAsset).to.equal("BTC")
      expect(trigger.targetPrice).to.equal(triggerParams.targetPrice)
      expect(trigger.isAbove).to.be.true
      expect(trigger.tradeAsset).to.equal("HYPE")
      expect(trigger.isBuy).to.be.true
      expect(trigger.amount).to.equal(triggerParams.amount)
      expect(trigger.maxSlippage).to.equal(100)
      expect(trigger.status).to.equal(0) // Active
    })

    it("Should increment nextTriggerId", async function () {
      const fee = await triggerContract.triggerFee()

      await triggerContract.connect(user1).createTrigger(
        triggerParams.watchAsset,
        triggerParams.targetPrice,
        triggerParams.isAbove,
        triggerParams.tradeAsset,
        triggerParams.isBuy,
        triggerParams.amount,
        triggerParams.maxSlippage,
        triggerParams.durationHours,
        { value: fee }
      )

      expect(await triggerContract.nextTriggerId()).to.equal(2)
    })

    it("Should add trigger to user's list", async function () {
      const fee = await triggerContract.triggerFee()

      await triggerContract.connect(user1).createTrigger(
        triggerParams.watchAsset,
        triggerParams.targetPrice,
        triggerParams.isAbove,
        triggerParams.tradeAsset,
        triggerParams.isBuy,
        triggerParams.amount,
        triggerParams.maxSlippage,
        triggerParams.durationHours,
        { value: fee }
      )

      const userTriggers = await triggerContract.getUserTriggers(user1.address)
      expect(userTriggers.length).to.equal(1)
      expect(userTriggers[0]).to.equal(1)
    })

    it("Should revert if fee is insufficient", async function () {
      await expect(
        triggerContract.connect(user1).createTrigger(
          triggerParams.watchAsset,
          triggerParams.targetPrice,
          triggerParams.isAbove,
          triggerParams.tradeAsset,
          triggerParams.isBuy,
          triggerParams.amount,
          triggerParams.maxSlippage,
          triggerParams.durationHours,
          { value: 0 }
        )
      ).to.be.revertedWith("Insufficient trigger fee")
    })

    it("Should revert if watch asset is empty", async function () {
      const fee = await triggerContract.triggerFee()

      await expect(
        triggerContract.connect(user1).createTrigger(
          "", // Empty watch asset
          triggerParams.targetPrice,
          triggerParams.isAbove,
          triggerParams.tradeAsset,
          triggerParams.isBuy,
          triggerParams.amount,
          triggerParams.maxSlippage,
          triggerParams.durationHours,
          { value: fee }
        )
      ).to.be.revertedWith("Watch asset required")
    })

    it("Should revert if target price is zero", async function () {
      const fee = await triggerContract.triggerFee()

      await expect(
        triggerContract.connect(user1).createTrigger(
          triggerParams.watchAsset,
          0, // Zero price
          triggerParams.isAbove,
          triggerParams.tradeAsset,
          triggerParams.isBuy,
          triggerParams.amount,
          triggerParams.maxSlippage,
          triggerParams.durationHours,
          { value: fee }
        )
      ).to.be.revertedWith("Target price must be > 0")
    })

    it("Should revert if slippage too high", async function () {
      const fee = await triggerContract.triggerFee()

      await expect(
        triggerContract.connect(user1).createTrigger(
          triggerParams.watchAsset,
          triggerParams.targetPrice,
          triggerParams.isAbove,
          triggerParams.tradeAsset,
          triggerParams.isBuy,
          triggerParams.amount,
          5001n, // > 50%
          triggerParams.durationHours,
          { value: fee }
        )
      ).to.be.revertedWith("Max slippage too high")
    })

    it("Should revert if duration too short", async function () {
      const fee = await triggerContract.triggerFee()

      await expect(
        triggerContract.connect(user1).createTrigger(
          triggerParams.watchAsset,
          triggerParams.targetPrice,
          triggerParams.isAbove,
          triggerParams.tradeAsset,
          triggerParams.isBuy,
          triggerParams.amount,
          triggerParams.maxSlippage,
          0n, // Too short
          { value: fee }
        )
      ).to.be.revertedWith("Duration too short")
    })
  })

  describe("cancelTrigger", function () {
    beforeEach(async function () {
      const fee = await triggerContract.triggerFee()

      await triggerContract.connect(user1).createTrigger(
        "BTC",
        parseUnits("100000", 6),
        true,
        "HYPE",
        true,
        parseUnits("1000", 6),
        100n,
        24n,
        { value: fee }
      )
    })

    it("Should allow user to cancel their trigger", async function () {
      await expect(triggerContract.connect(user1).cancelTrigger(1))
        .to.emit(triggerContract, "TriggerCancelled")
        .withArgs(1, user1.address)

      const trigger = await triggerContract.getTrigger(1)
      expect(trigger.status).to.equal(2) // Cancelled
    })

    it("Should refund fee on cancel", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address)

      const tx = await triggerContract.connect(user1).cancelTrigger(1)
      const receipt = await tx.wait()
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice

      const balanceAfter = await ethers.provider.getBalance(user1.address)
      const fee = await triggerContract.triggerFee()

      // Balance should increase by (fee - gas)
      expect(balanceAfter).to.be.gt(balanceBefore - BigInt(gasUsed))
    })

    it("Should revert if not trigger owner", async function () {
      await expect(
        triggerContract.connect(executor).cancelTrigger(1)
      ).to.be.revertedWith("Not trigger owner")
    })

    it("Should revert if trigger not active", async function () {
      await triggerContract.connect(user1).cancelTrigger(1)

      await expect(
        triggerContract.connect(user1).cancelTrigger(1)
      ).to.be.revertedWith("Trigger not active")
    })
  })

  describe("markExecuted", function () {
    beforeEach(async function () {
      const fee = await triggerContract.triggerFee()

      await triggerContract.connect(user1).createTrigger(
        "BTC",
        parseUnits("100000", 6),
        true,
        "HYPE",
        true,
        parseUnits("1000", 6),
        100n,
        24n,
        { value: fee }
      )
    })

    it("Should allow executor to mark trigger as executed", async function () {
      const executionPrice = parseUnits("100500", 6)
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx"))

      await expect(
        triggerContract.connect(executor).markExecuted(1, executionPrice, txHash)
      )
        .to.emit(triggerContract, "TriggerExecuted")
        .withArgs(1, executor.address, executionPrice, txHash)

      const trigger = await triggerContract.getTrigger(1)
      expect(trigger.status).to.equal(1) // Executed
      expect(trigger.executionPrice).to.equal(executionPrice)
      expect(trigger.executionTxHash).to.equal(txHash)
    })

    it("Should revert if not executor", async function () {
      await expect(
        triggerContract.connect(user1).markExecuted(
          1,
          parseUnits("100000", 6),
          ethers.keccak256(ethers.toUtf8Bytes("test"))
        )
      ).to.be.reverted
    })

    it("Should revert if trigger not active", async function () {
      await triggerContract.connect(user1).cancelTrigger(1)

      await expect(
        triggerContract.connect(executor).markExecuted(
          1,
          parseUnits("100000", 6),
          ethers.keccak256(ethers.toUtf8Bytes("test"))
        )
      ).to.be.revertedWith("Trigger not active")
    })
  })

  describe("markFailed", function () {
    beforeEach(async function () {
      const fee = await triggerContract.triggerFee()

      await triggerContract.connect(user1).createTrigger(
        "BTC",
        parseUnits("100000", 6),
        true,
        "HYPE",
        true,
        parseUnits("1000", 6),
        100n,
        24n,
        { value: fee }
      )
    })

    it("Should allow executor to mark trigger as failed", async function () {
      const reason = "Insufficient user balance"

      await expect(triggerContract.connect(executor).markFailed(1, reason))
        .to.emit(triggerContract, "TriggerFailed")
        .withArgs(1, reason)

      const trigger = await triggerContract.getTrigger(1)
      expect(trigger.status).to.equal(4) // Failed
    })
  })

  describe("checkTrigger", function () {
    beforeEach(async function () {
      const fee = await triggerContract.triggerFee()

      await triggerContract.connect(user1).createTrigger(
        "BTC",
        parseUnits("100000", 6), // Trigger at $100,000
        true, // When above
        "HYPE",
        true,
        parseUnits("1000", 6),
        100n,
        24n,
        { value: fee }
      )
    })

    it("Should return true when price condition is met (above)", async function () {
      const [shouldExecute, reason] = await triggerContract.checkTrigger(
        1,
        parseUnits("100001", 6) // Price above target
      )

      expect(shouldExecute).to.be.true
      expect(reason).to.equal("Ready to execute")
    })

    it("Should return false when price condition not met", async function () {
      const [shouldExecute, reason] = await triggerContract.checkTrigger(
        1,
        parseUnits("99999", 6) // Price below target
      )

      expect(shouldExecute).to.be.false
      expect(reason).to.equal("Price condition not met")
    })

    it("Should return false for inactive trigger", async function () {
      await triggerContract.connect(user1).cancelTrigger(1)

      const [shouldExecute, reason] = await triggerContract.checkTrigger(
        1,
        parseUnits("100001", 6)
      )

      expect(shouldExecute).to.be.false
      expect(reason).to.equal("Trigger not active")
    })
  })

  describe("getUserActiveTriggers", function () {
    it("Should return only active triggers", async function () {
      const fee = await triggerContract.triggerFee()

      // Create 3 triggers
      for (let i = 0; i < 3; i++) {
        await triggerContract.connect(user1).createTrigger(
          "BTC",
          parseUnits((100000 + i * 1000).toString(), 6),
          true,
          "HYPE",
          true,
          parseUnits("1000", 6),
          100n,
          24n,
          { value: fee }
        )
      }

      // Cancel the second one
      await triggerContract.connect(user1).cancelTrigger(2)

      const activeTriggers = await triggerContract.getUserActiveTriggers(user1.address)
      expect(activeTriggers.length).to.equal(2)
      expect(activeTriggers[0].id).to.equal(1)
      expect(activeTriggers[1].id).to.equal(3)
    })
  })

  describe("Admin functions", function () {
    it("Should allow admin to update trigger fee", async function () {
      const newFee = parseEther("0.002")
      await triggerContract.updateTriggerFee(newFee)
      expect(await triggerContract.triggerFee()).to.equal(newFee)
    })

    it("Should allow admin to pause and unpause", async function () {
      await triggerContract.pause()
      expect(await triggerContract.paused()).to.be.true

      await triggerContract.unpause()
      expect(await triggerContract.paused()).to.be.false
    })

    it("Should allow admin to withdraw fees", async function () {
      // Create a trigger to add some fees
      const fee = await triggerContract.triggerFee()
      await triggerContract.connect(user1).createTrigger(
        "BTC",
        parseUnits("100000", 6),
        true,
        "HYPE",
        true,
        parseUnits("1000", 6),
        100n,
        24n,
        { value: fee }
      )

      const balanceBefore = await ethers.provider.getBalance(owner.address)
      const tx = await triggerContract.withdrawFees()
      const receipt = await tx.wait()
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice
      const balanceAfter = await ethers.provider.getBalance(owner.address)

      expect(balanceAfter).to.be.gt(balanceBefore - BigInt(gasUsed))
    })
  })
})
