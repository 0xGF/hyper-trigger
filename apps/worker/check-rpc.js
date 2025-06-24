const https = require('https');

const RPC_URL = 'https://rpc.hyperliquid-testnet.xyz/evm';

function checkRPC() {
  const postData = JSON.stringify({
    method: 'eth_blockNumber',
    params: [],
    id: 1,
    jsonrpc: '2.0'
  });

  const options = {
    hostname: 'rpc.hyperliquid-testnet.xyz',
    port: 443,
    path: '/evm',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 10000
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          if (response.result) {
            const blockNumber = parseInt(response.result, 16);
            console.log(`✅ RPC Online - Block: ${blockNumber} (${new Date().toISOString()})`);
          } else {
            console.log(`⚠️ RPC responded but no block number (${new Date().toISOString()})`);
          }
        } catch (e) {
          console.log(`❌ Invalid JSON response (${new Date().toISOString()})`);
        }
      } else {
        console.log(`❌ RPC Error: ${res.statusCode} ${res.statusMessage} (${new Date().toISOString()})`);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`❌ Connection Error: ${error.message} (${new Date().toISOString()})`);
  });

  req.on('timeout', () => {
    console.log(`❌ Request Timeout (${new Date().toISOString()})`);
    req.destroy();
  });

  req.write(postData);
  req.end();
}

console.log('🔍 Monitoring Hyperliquid Testnet RPC Status...');
console.log(`📡 URL: ${RPC_URL}`);
console.log('Press Ctrl+C to stop\n');

// Check immediately
checkRPC();

// Then check every 30 seconds
setInterval(checkRPC, 30000); 