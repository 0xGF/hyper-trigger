// @ts-ignore - hardhat provides ethers globally at runtime
const { ethers } = require("hardhat");
const fileSystem = require('fs');
const filePath = require('path');

async function generateTokenRegistry() {
  console.log('🔍 GENERATING COMPLETE TOKEN REGISTRY')
  console.log('====================================')
  
  // Fetch real token metadata from HyperLiquid
  const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'spotMeta'
    })
  })
  
  const data = await response.json()
  const tokens = data.tokens || []
  
  console.log(`📊 Found ${tokens.length} tokens on HyperLiquid testnet`)
  
  // Test price oracle for first 20 tokens to get current prices
  console.log('\n💰 Fetching current prices...')
  const SPOT_PRICE_PRECOMPILE = '0x0000000000000000000000000000000000000808'
  
  const tokensWithPrices = []
  
  for (let i = 0; i < Math.min(tokens.length, 50); i++) {
    const token = tokens[i]
    try {
      const directResult = await ethers.provider.call({
        to: SPOT_PRICE_PRECOMPILE,
        data: ethers.AbiCoder.defaultAbiCoder().encode(['uint32'], [token.index])
      })
      const price = parseInt(directResult, 16) / 1000000
      
      tokensWithPrices.push({
        name: token.name,
        index: token.index,
        tokenId: token.tokenId,
        currentPrice: price,
        priceDecimals: 6,
        category: categorizeToken(token.name)
      })
      
      if (i % 10 === 0) {
        console.log(`   Processed ${i + 1}/${Math.min(tokens.length, 50)} tokens...`)
      }
    } catch (err) {
      console.log(`   ⚠️  Failed to get price for ${token.name} (index ${token.index})`)
      // Still add token without price
      tokensWithPrices.push({
        name: token.name,
        index: token.index,
        tokenId: token.tokenId,
        currentPrice: null,
        priceDecimals: 6,
        category: categorizeToken(token.name)
      })
    }
  }
  
  // Add remaining tokens without prices (to avoid rate limiting)
  for (let i = 50; i < tokens.length; i++) {
    const token = tokens[i]
    tokensWithPrices.push({
      name: token.name,
      index: token.index,
      tokenId: token.tokenId,
      currentPrice: null,
      priceDecimals: 6,
      category: categorizeToken(token.name)
    })
  }
  
  // Create categories
  const categories: Record<string, string[]> = {
    native: [],
    stablecoin: [],
    major: [],
    meme: [],
    test: [],
    utility: [],
    other: []
  }
  
  tokensWithPrices.forEach(token => {
    if (!categories[token.category]) {
      categories[token.category] = []
    }
    categories[token.category].push(token.name)
  })
  
  const registry = {
    lastUpdated: new Date().toISOString(),
    network: "hyperliquid-testnet",
    totalTokens: tokens.length,
    tokens: tokensWithPrices,
    categories,
    priceOracle: {
      precompileAddress: "0x0000000000000000000000000000000000000808",
      balancePrecompileAddress: "0x0000000000000000000000000000000000000801", 
      coreWriterAddress: "0x3333333333333333333333333333333333333333",
      encoding: "uint32",
      returnType: "uint256",
      decimals: 6
    },
    usage: {
      description: "Complete token registry for HyperLiquid testnet - auto-generated",
      indexUsage: "Use the 'index' field for oracle price calls",
      tokenIdUsage: "Use the 'tokenId' field for balance and transfer operations", 
      priceUsage: "Current prices are in USD with 6 decimal places (null if unavailable)"
    }
  }
  
  // Write to shared package
  const outputPath = filePath.join(__dirname, '../../packages/shared/src/hyperliquid-tokens.json')
  fileSystem.writeFileSync(outputPath, JSON.stringify(registry, null, 2))
  
  console.log(`\n✅ Generated token registry with ${tokensWithPrices.length} tokens`)
  console.log(`📁 Saved to: ${outputPath}`)
  console.log(`💰 Got prices for ${tokensWithPrices.filter(t => t.currentPrice !== null).length} tokens`)
  
  // Show sample of tokens with prices
  console.log('\n🏷️  SAMPLE TOKENS WITH PRICES:')
  tokensWithPrices
    .filter(t => t.currentPrice !== null)
    .slice(0, 10)
    .forEach(token => {
      console.log(`   ${token.name.padEnd(12)} (index ${token.index.toString().padEnd(4)}): $${token.currentPrice?.toFixed(6)}`)
    })
}

function categorizeToken(name: string): string {
  const nameLower = name.toLowerCase()
  
  if (name === 'HYPE') return 'native'
  if (nameLower.includes('usd') || nameLower === 'usdc' || nameLower === 'usdt') return 'stablecoin'
  if (['btc', 'eth', 'sol'].includes(nameLower)) return 'major'
  if (nameLower.includes('test') || nameLower.includes('pascal')) return 'test'
  if (['purr', 'bread', 'kogu', 'korila', 'pepe', 'doge', 'shib'].includes(nameLower)) return 'meme'
  if (nameLower.length <= 2) return 'utility'
  
  return 'other'
}

generateTokenRegistry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  }) 