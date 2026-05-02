import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  },
});

export { arbitrumSepolia };
export const CHAIN_ID = arbitrumSepolia.id;
