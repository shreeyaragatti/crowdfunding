import web3 from "./web3";
import CampaignFactory from "./build/CampaignFactory.json";
import chainConfig from "../lib/blockchainConfig";

const instance = chainConfig.factoryAddress
  ? new web3.eth.Contract(
      JSON.parse(CampaignFactory.interface),
      chainConfig.factoryAddress
    )
  : null;

export default instance;
