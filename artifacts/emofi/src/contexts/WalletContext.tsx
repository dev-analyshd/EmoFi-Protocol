import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN_ID } from "@/lib/wagmi";

interface WalletContextValue {
  address: `0x${string}` | undefined;
  userId: number | null;
  isConnected: boolean;
  isWrongNetwork: boolean;
  isLoadingUser: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  shortAddress: string;
}

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  userId: null,
  isConnected: false,
  isWrongNetwork: false,
  isLoadingUser: false,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
  shortAddress: "",
});

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function getOrCreateUser(address: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/users/wallet/${address}`);
    if (res.ok) {
      const user = await res.json();
      return user.id;
    }
    if (res.status === 404) {
      const createRes = await fetch(`${BASE_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, username: `user_${address.slice(2, 8)}` }),
      });
      if (createRes.ok || createRes.status === 409) {
        const retryRes = await fetch(`${BASE_URL}/api/users/wallet/${address}`);
        if (retryRes.ok) {
          const user = await retryRes.json();
          return user.id;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect: wagmiConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [userId, setUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  useEffect(() => {
    if (!address) { setUserId(null); return; }
    setIsLoadingUser(true);
    getOrCreateUser(address).then(id => {
      setUserId(id);
      setIsLoadingUser(false);
    });
  }, [address]);

  const connect = useCallback(async () => {
    wagmiConnect({ connector: injected() });
  }, [wagmiConnect]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setUserId(null);
  }, [wagmiDisconnect]);

  const switchNetwork = useCallback(async () => {
    switchChain({ chainId: CHAIN_ID });
  }, [switchChain]);

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  return (
    <WalletContext.Provider value={{
      address,
      userId,
      isConnected,
      isWrongNetwork,
      isLoadingUser,
      connect,
      disconnect,
      switchNetwork,
      shortAddress,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
