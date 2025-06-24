import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import dotenv from 'dotenv'

dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20,
        accountsBalance: '10000000000000000000000', // 10,000 ETH
      },
    },
    'hyperevm-testnet': {
      url: process.env.HYPEREVM_TESTNET_RPC_URL || 'https://rpc.hyperliquid-testnet.xyz/evm',
      chainId: 998,
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here_without_0x_prefix' 
        ? [process.env.PRIVATE_KEY] 
        : [],
      gasPrice: 'auto',
      gasMultiplier: 1.2,
      gas: 30000000,
      blockGasLimit: 30000000,
    },
    'hyperevm-mainnet': {
      url: process.env.HYPEREVM_MAINNET_RPC_URL || 'https://rpc.hyperliquid.xyz/evm',
      chainId: 999, // HyperEVM mainnet chain ID
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here_without_0x_prefix' 
        ? [process.env.PRIVATE_KEY] 
        : [],
      gasPrice: 'auto',
      gasMultiplier: 1.1,
    },
  },
  etherscan: {
    apiKey: {
      'hyperevm-testnet': process.env.HYPEREVM_EXPLORER_API_KEY || 'api-key',
      'hyperevm-mainnet': process.env.HYPEREVM_EXPLORER_API_KEY || 'api-key',
    },
    customChains: [
      {
        network: 'hyperevm-testnet',
        chainId: 998,
        urls: {
          apiURL: 'https://api.hyperliquid-testnet.xyz/api',
          browserURL: 'https://explorer.hyperliquid-testnet.xyz',
        },
      },
      {
        network: 'hyperevm-mainnet',
        chainId: 999,
        urls: {
          apiURL: 'https://api.hyperliquid.xyz/api',
          browserURL: 'https://explorer.hyperliquid.xyz',
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    gasPrice: 21,
    showTimeSpent: true,
    showMethodSig: true,
  },
  mocha: {
    timeout: 60000, // 60 seconds for complex tests
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v6',
    alwaysGenerateOverloads: false,
  },
}

export default config 