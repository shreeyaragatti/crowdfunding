const path = require("path");

module.exports = {
  future: {
    webpack5: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ethers: path.resolve(
        __dirname,
        "node_modules/authereum/node_modules/ethers/dist/ethers.min.js"
      ),
    };

    return config;
  },
};
