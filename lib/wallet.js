import chainConfig from "./blockchainConfig";

const LAST_WALLET_CONNECTOR_KEY = "betterfund:lastWalletConnector";

export const shortAddress = (address, leading = 6, trailing = 4) => {
  if (!address) return "";
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
};

export const getStoredWalletConnector = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_WALLET_CONNECTOR_KEY);
};

export const clearStoredWalletConnector = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LAST_WALLET_CONNECTOR_KEY);
  }
};

export const disconnectWallet = (wallet) => {
  clearStoredWalletConnector();
  wallet.reset();
};

export const connectInjectedWallet = async (wallet) => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No injected wallet found. Install MetaMask, then open this app in that browser."
    );
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  try {
    await switchToConfiguredNetwork();
  } catch (error) {
    if (Number(window.ethereum.chainId) !== chainConfig.chainId) {
      throw error;
    }
  }

  try {
    await wallet.connect("injected");
    window.localStorage.setItem(LAST_WALLET_CONNECTOR_KEY, "injected");
  } catch (error) {
    await wallet.connect();
    window.localStorage.setItem(LAST_WALLET_CONNECTOR_KEY, "injected");
  }
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
