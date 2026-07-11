require("@nomiclabs/hardhat-ethers");
require("dotenv").config({ path: ".env.local" });

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY
  ? process.env.DEPLOYER_PRIVATE_KEY.startsWith("0x")
    ? process.env.DEPLOYER_PRIVATE_KEY
    : `0x${process.env.DEPLOYER_PRIVATE_KEY}`
  : "";

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        process.env.NEXT_PUBLIC_RPC_URL ||
        "",
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
};
