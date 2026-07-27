import "../styles/globals.css";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { UseWalletProvider } from "use-wallet";
import NavBar from "../components/Navbar";
import Footer from "../components/Footer";
import WalletAutoConnect from "../components/WalletAutoConnect";
import { DevModeProvider } from "../lib/devModeContext";
import "@fontsource/space-grotesk";
import chainConfig from "../lib/blockchainConfig";

const theme = extendTheme({
  fonts: {
    heading: "Space Grotesk",
    body: "Space Grotesk",
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <>
      {" "}
      <ChakraProvider theme={theme}>
        <UseWalletProvider
          chainId={chainConfig.chainId}
          connectors={{
            walletconnect: {
              rpcUrl: chainConfig.rpcUrl,
            },
          }}
        >
          <DevModeProvider>
            <WalletAutoConnect />
            <NavBar />
            <Component {...pageProps} />
            <Footer />
          </DevModeProvider>
        </UseWalletProvider>
      </ChakraProvider>
    </>
  );
}

export default MyApp;
