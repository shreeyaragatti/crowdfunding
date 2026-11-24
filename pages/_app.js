import "../styles/globals.css";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { UseWalletProvider } from "use-wallet";
import NavBar from "../components/Navbar";
import Footer from "../components/Footer";
import WalletAutoConnect from "../components/WalletAutoConnect";
import FloatingChatWidget from "../components/FloatingChatWidget";
import { AuthProvider } from "../lib/authContext";
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
          <AuthProvider>
            <WalletAutoConnect />
            <NavBar />
            <Component {...pageProps} />
            <Footer />
            <FloatingChatWidget />
          </AuthProvider>
        </UseWalletProvider>
      </ChakraProvider>
    </>
  );
}

export default MyApp;
