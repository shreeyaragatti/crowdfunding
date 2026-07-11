import fetch from "node-fetch";
export const getETHPrice = async () => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum"
    );
    const data = await response.json();
    const ethPrice = data[0].current_price;
    return parseFloat(parseFloat(ethPrice).toFixed(2));
  } catch (error) {
    console.log(error);
    return 0;
  }
};

export const getWEIPriceInUSD = (usd, wei) => {
  if (!usd || !wei) return "0.00";
  return parseFloat(convertWeiToETH(wei) * usd).toFixed(2);
};
export const getETHPriceInUSD = (usd, eth) => {
  if (!usd || !eth) return "0.00";
  return parseFloat(eth * usd).toFixed(2);
};

export const convertWeiToETH = (wei) => {
  return parseFloat(wei) / 1000000000000000000;
};
