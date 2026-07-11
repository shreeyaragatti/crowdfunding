import { useEffect } from "react";
import { useWallet } from "use-wallet";
import { getStoredWalletConnector } from "../lib/wallet";

export default function WalletAutoConnect() {
  const wallet = useWallet();

  useEffect(() => {
    const connector = getStoredWalletConnector();

    if (
      connector &&
      wallet.status === "disconnected" &&
      typeof window !== "undefined" &&
      window.ethereum
    ) {
      wallet.connect(connector).catch(() => {
        window.localStorage.removeItem("betterfund:lastWalletConnector");
      });
    }
  }, [wallet.status]);

  return null;
}
