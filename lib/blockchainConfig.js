const DEFAULT_CHAIN_ID = 11155111;

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || DEFAULT_CHAIN_ID);

const chainConfig = {
  chainId,
  chainIdHex: `0x${chainId.toString(16)}`,
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || "Sepolia",
  nativeCurrencyName:
    process.env.NEXT_PUBLIC_NATIVE_CURRENCY_NAME || "Sepolia Ether",
  nativeCurrencySymbol: process.env.NEXT_PUBLIC_NATIVE_CURRENCY_SYMBOL || "ETH",
  nativeCurrencyDecimals: Number(
    process.env.NEXT_PUBLIC_NATIVE_CURRENCY_DECIMALS || 18
  ),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "",
  explorerUrl:
    process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io",
  factoryAddress: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",
  ownerAddress:
    process.env.NEXT_PUBLIC_OWNER_ADDRESS ||
    "0x398C00Cd2949d0DB08af2ae6De9c0D1c2C872D19",
};

export const isBlockchainConfigured = Boolean(
  chainConfig.rpcUrl && chainConfig.factoryAddress
);

export const getAddressExplorerUrl = (address) => {
  if (!address) return chainConfig.explorerUrl;

  return `${chainConfig.explorerUrl.replace(/\/$/, "")}/address/${address}`;
};

export default chainConfig;
