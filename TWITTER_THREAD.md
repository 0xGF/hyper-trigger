# 🧵 I Had an Idea. I Couldn't Code. So I Prompted an AI to Build It.

**From shower thought to mainnet DeFi app in 3 days**

---

## THREAD 1/16: The Idea 💡

I DCA into BTC.

I have my levels - 90k, 85k, 80k.

But here's the thing: when BTC dumps to those levels, I don't want more BTC.

I want ALTS. Higher beta. Higher upside.

When BTC hits 85k, I want to auto-buy HYPE.
When BTC hits 80k, I want to auto-buy PURR.

Cross-asset triggers. BTC is my signal. Alts are my trade.

No product existed for this.

So I built one. Without writing code.

---

## THREAD 2/16: The Problem with Existing Tools 🚫

Limit orders? Same asset only.
Trading bots? Need API keys, centralized.
CEX conditional orders? Still same-asset.

I wanted:

- BTC price drops → automatically buy a DIFFERENT asset
- Fully on-chain
- Non-custodial
- Set and forget

Nothing existed.

So I opened Cursor and started prompting.

---

## THREAD 3/16: First Prompt - Explain My Idea 📐

> "I want to build a DeFi app on HyperEVM where users can:
>
> - Set a trigger based on one asset's price (like BTC)
> - When that price hits, automatically swap a different asset (like USDC → HYPE)
> - Everything on-chain and non-custodial
>
> What architecture would you recommend? Think through the components needed."

The AI mapped out:

- Smart contract for trigger storage + execution
- Worker bot to monitor prices
- Frontend for creating triggers

I didn't know what I needed. The AI figured it out.

---

## THREAD 4/16: Setting Up the Project 📦

> "Create a monorepo structure for this DeFi app with:
>
> - A Next.js frontend
> - Solidity contracts using Hardhat
> - A Node.js worker service
> - A shared package for token data
> - Use pnpm workspaces and Turborepo"

One prompt. Entire project scaffold. All the config files wired up.

I just hit enter and watched folders appear.

---

## THREAD 5/16: The Smart Contract 📜

> "Write a Solidity contract for HyperEVM that:
>
> - Lets users create price-triggered swaps
> - The trigger price can be for ANY asset (the oracle asset)
> - The swap can be between ANY two different assets
> - Uses HyperLiquid's oracle precompile at 0x0000000000000000000000000000000000000807
> - Has an executor role that can trigger trades when conditions are met
> - Users deposit funds upfront, get refunded if they cancel"

This was the core insight: **decouple the trigger asset from the swap assets**.

The AI wrote the entire contract. 300+ lines. Access control. Events. Edge cases.

---

## THREAD 6/16: HyperEVM Config 🔧

> "Configure Hardhat for HyperEVM:
>
> - Testnet RPC: https://rpc.hyperliquid-testnet.xyz/evm (chainId 998)
> - Mainnet RPC: https://rpc.hyperliquid.xyz/evm (chainId 999)
> - HyperEVM uses 1 gwei gas price
> - Generate TypeScript types with TypeChain"

No googling docs. No trial and error with RPC configs.

The AI knew HyperEVM's quirks.

---

## THREAD 7/16: The Token Registry 📚

> "Create a shared package with all HyperLiquid spot tokens:
>
> - Include symbol, spotIndex, tokenId, and category
> - Add USDC, HYPE, PURR, BTC, ETH, SOL, and other major tokens
> - Export helper functions to look up tokens
> - Both frontend and worker should import from this"

One source of truth.

When I'm building the UI and selecting "HYPE", it uses the same data the contract uses.

No mismatched token IDs. No bugs.

---

## THREAD 8/16: The Frontend 🖥️

> "Build a trigger creation form with:
>
> - Dropdown to select the TRIGGER asset (what price to watch)
> - Dropdown to select the INPUT asset (what to sell)
> - Dropdown to select the OUTPUT asset (what to buy)
> - Price input with above/below toggle
> - Amount input
> - Show current price of the trigger asset
> - Dark theme, clean UI"

The key UX insight: three separate asset selectors.

"When BTC hits $85k, sell my USDC for HYPE"

Trigger ≠ Trade. The AI got it.

---

## THREAD 9/16: The Wallet Integration 🪝

> "Set up RainbowKit and Wagmi for HyperEVM.
> Create a hook called useTriggerContract that:
>
> - Calls the createTrigger function on the contract
> - Converts token symbols to the right format using our shared package
> - Shows pending/confirming/success states
> - Handles errors gracefully"

I clicked "Connect Wallet" and it worked.

No debugging WalletConnect for 4 hours. No config hell.

---

## THREAD 10/16: The Worker Bot 🤖

> "Build a worker service that:
>
> - Checks all active triggers every 30 seconds
> - Gets current prices from HyperLiquid's oracle
> - When a trigger condition is met, execute it on-chain
> - Log everything clearly
> - Use the shared tokens package"

This is the magic. 24/7 automation.

User sets trigger → Worker monitors → Executes when price hits.

Runs on a $5 VPS. No AWS Lambda complexity.

---

## THREAD 11/16: The Chart 📈

> "Add a price chart that:
>
> - Shows the trigger asset's price history
> - Draws a horizontal line at the user's trigger price
> - Updates in real-time
> - Uses TradingView lightweight charts"

Now users can visually see:

- Current BTC price
- Their trigger level
- How close they are to execution

Makes the product feel professional.

---

## THREAD 12/16: The API Layer 🔌

> "Create a NestJS backend that:
>
> - Fetches prices from HyperLiquid
> - Reads active triggers from the contract
> - Serves data to the frontend
> - Auto-generates OpenAPI docs"

Then:

> "Use Orval to generate typed React Query hooks from the OpenAPI spec"

Now my frontend has `usePrices()` and `useUserTriggers(address)` with full TypeScript.

Type-safe from database to UI.

---

## THREAD 13/16: Deployment 🚀

> "Write a deployment script for the contracts.
> Deploy to HyperEVM testnet first.
> Log all the addresses."

```bash
pnpm deploy:testnet
```

Contracts live. Addresses in my terminal.

Updated the frontend config. Reloaded. Connected wallet.

It worked.

---

## THREAD 14/16: Testing My Actual Use Case 🧪

I created my first real trigger:

- **Trigger**: When BTC drops below $92,000
- **Action**: Swap 100 USDC → HYPE

Set it. Waited.

BTC dipped. Worker picked it up. Executed the swap.

Got my HYPE. Automatically. While I was sleeping.

This is the product I wanted.

---

## THREAD 15/16: What I Learned 🎓

Building with AI prompts:

1. **Start with the idea** - Explain the problem, let AI suggest architecture
2. **Be specific** - Include addresses, chain IDs, exact behavior
3. **Build incrementally** - One feature per prompt session
4. **Reference your own code** - "use the shared package we created"
5. **Let AI handle boilerplate** - Configs, types, provider setup

The prompts ARE the product spec.

---

## THREAD 16/16: The Takeaway 💭

I had an idea:

> "I want to buy alts when BTC hits my levels"

No product existed.

3 days later, I shipped one to mainnet.

I don't know Solidity.
I don't know React.
I just knew what I wanted.

The barrier to building is now zero.

What's YOUR idea?

---

## Deployed Contracts (HyperEVM Testnet)

| Contract        | Address                                      |
| --------------- | -------------------------------------------- |
| TriggerContract | `0x2C1a677C21850C88B360a833612f62F6291a6723` |
| SwapContract    | `0x6c4AB1aE6BF2902f6f665BA362B6073032B1a995` |

---
