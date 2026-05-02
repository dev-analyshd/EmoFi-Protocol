import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";

const DEPLOYER_KEY = process.env.DEPLOYER_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOYER_KEY],
      chainId: 11155111,
      gasPrice: "auto",
    },
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOYER_KEY],
      chainId: 1,
      gasPrice: "auto",
    },
    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [DEPLOYER_KEY],
      chainId: 421614,
      gasPrice: "auto",
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: [DEPLOYER_KEY],
      chainId: 84532,
      gasPrice: "auto",
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: [DEPLOYER_KEY],
      chainId: 8453,
      gasPrice: "auto",
    },
  },

  etherscan: {
    // Etherscan V2 unified API key (single key covers all chains)
    apiKey: ARBISCAN_API_KEY || ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "arbitrum-sepolia",
        chainId: 421614,
        urls: {
          // Etherscan V2 unified endpoint with chainid param
          apiURL:     "https://api.etherscan.io/v2/api?chainid=421614",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true,
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 120000,
  },
};

export default config;
