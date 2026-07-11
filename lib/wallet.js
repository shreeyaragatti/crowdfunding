import chainConfig from "./blockchainConfig";

export const shortAddress = (address, leading = 6, trailing = 4) => {
  if (!address) return "";
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
};

export const switchToConfiguredNetwork = async () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask or another injected wallet is required.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainConfig.chainIdHex }],
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainConfig.chainIdHex,
          chainName: chainConfig.chainName,
          nativeCurrency: {
            name: chainConfig.nativeCurrencyName,
            symbol: chainConfig.nativeCurrencySymbol,
            decimals: chainConfig.nativeCurrencyDecimals,
          },
          rpcUrls: chainConfig.rpcUrl ? [chainConfig.rpcUrl] : [],
          blockExplorerUrls: chainConfig.explorerUrl
            ? [chainConfig.explorerUrl]
            : [],
        },
      ],
    });
  }
};
