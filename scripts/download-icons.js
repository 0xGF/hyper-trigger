#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// CoinGecko API mappings for popular tokens
const TOKEN_MAPPINGS = {
  // Major Cryptocurrencies
  'btc': { id: 'bitcoin', imageId: '1' },
  'eth': { id: 'ethereum', imageId: '279' },
  'sol': { id: 'solana', imageId: '4128' },
  'usdc': { id: 'usd-coin', imageId: '6319' },
  'usdt': { id: 'tether', imageId: '325' },
  
  // Meme Tokens
  'doge': { id: 'dogecoin', imageId: '5' },
  'shib': { id: 'shiba-inu', imageId: '11939' },
  'pepe': { id: 'pepe', imageId: '29850' },
  'bonk': { id: 'bonk', imageId: '28600' },
  'wif': { id: 'dogwifcoin', imageId: '33566' },
  
  // DeFi Tokens
  'uni': { id: 'uniswap', imageId: '12504' },
  'aave': { id: 'aave', imageId: '12645' },
  'link': { id: 'chainlink', imageId: '877' },
  'mkr': { id: 'maker', imageId: '1364' },
  'comp': { id: 'compound-governance-token', imageId: '10775' },
  'sushi': { id: 'sushi', imageId: '12271' },
  'crv': { id: 'curve-dao-token', imageId: '12124' },
  'yfi': { id: 'yearn-finance', imageId: '11849' },
  
  // Layer 1s & Layer 2s
  'ada': { id: 'cardano', imageId: '975' },
  'dot': { id: 'polkadot', imageId: '12171' },
  'avax': { id: 'avalanche-2', imageId: '12559' },
  'matic': { id: 'matic-network', imageId: '4713' },
  'atom': { id: 'cosmos', imageId: '5570' },
  'near': { id: 'near', imageId: '10365' },
  'ftm': { id: 'fantom', imageId: '4001' },
  'algo': { id: 'algorand', imageId: '4030' },
  'arb': { id: 'arbitrum', imageId: '16547' },
  'op': { id: 'optimism', imageId: '25244' },
  
  // Other Popular
  'ltc': { id: 'litecoin', imageId: '2' },
  'bch': { id: 'bitcoin-cash', imageId: '780' },
  'xrp': { id: 'ripple', imageId: '44' },
  'icp': { id: 'internet-computer', imageId: '14495' },
  'vet': { id: 'vechain', imageId: '1167' },
  'sand': { id: 'the-sandbox', imageId: '12493' },
  'mana': { id: 'decentraland', imageId: '878' },
  'axs': { id: 'axie-infinity', imageId: '13029' },
  'ape': { id: 'apecoin', imageId: '18876' },
  
  // Newer tokens (approximate IDs)
  'blur': { id: 'blur', imageId: '28453' },
  'sui': { id: 'sui', imageId: '26375' },
  'jup': { id: 'jupiter-exchange-solana', imageId: '33566' },
  'pyth': { id: 'pyth-network', imageId: '25244' },
  'tia': { id: 'celestia', imageId: '31967' },
  'sei': { id: 'sei-network', imageId: '28205' },
  'strk': { id: 'starknet', imageId: '26433' },
};

const ICONS_DIR = path.join(__dirname, '..', 'apps', 'frontend', 'public', 'tokens');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function downloadIcon(symbol, mapping) {
  return new Promise((resolve, reject) => {
    const url = `https://coin-images.coingecko.com/coins/images/${mapping.imageId}/small/${mapping.id}.png`;
    const filePath = path.join(ICONS_DIR, `${symbol}.png`);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${symbol.toUpperCase()} icon already exists`);
      resolve();
      return;
    }
    
    console.log(`📥 Downloading ${symbol.toUpperCase()} icon...`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded ${symbol.toUpperCase()} icon`);
          resolve();
        });
      } else {
        fs.unlink(filePath, () => {}); // Delete empty file
        console.log(`❌ Failed to download ${symbol.toUpperCase()} icon (${response.statusCode})`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete empty file
      console.log(`❌ Error downloading ${symbol.toUpperCase()} icon:`, err.message);
      reject(err);
    });
  });
}

async function downloadAllIcons() {
  console.log('🚀 Starting token icon downloads...\n');
  
  const symbols = process.argv.slice(2);
  const tokensToDownload = symbols.length > 0 
    ? symbols.filter(s => TOKEN_MAPPINGS[s.toLowerCase()])
    : Object.keys(TOKEN_MAPPINGS);
  
  if (tokensToDownload.length === 0) {
    console.log('❌ No valid tokens specified or found');
    console.log('\nAvailable tokens:');
    console.log(Object.keys(TOKEN_MAPPINGS).join(', '));
    return;
  }
  
  console.log(`📦 Downloading icons for: ${tokensToDownload.map(s => s.toUpperCase()).join(', ')}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const symbol of tokensToDownload) {
    try {
      await downloadIcon(symbol, TOKEN_MAPPINGS[symbol]);
      successCount++;
      // Add small delay to be respectful to CoinGecko
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failCount++;
    }
  }
  
  console.log(`\n🎉 Download complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Icons saved to: ${ICONS_DIR}`);
}

// Handle specific tokens or download all
if (require.main === module) {
  downloadAllIcons().catch(console.error);
}

module.exports = { downloadIcon, TOKEN_MAPPINGS }; 