import React from "react";
import { motion } from "framer-motion";
import { Wallet, Droplets, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";

interface ConnectPromptProps {
  title?: string;
  description?: string;
}

export function ConnectPrompt({
  title = "Connect Your Wallet",
  description = "Connect MetaMask or any injected wallet to interact with the EmoFi Protocol on Arbitrum Sepolia.",
}: ConnectPromptProps) {
  const { connect, isWrongNetwork, switchNetwork } = useWallet();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 glow-primary">
        <Wallet className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-black text-white mb-3">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">{description}</p>

      {isWrongNetwork ? (
        <Button
          onClick={switchNetwork}
          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 rounded-full px-8 py-6 text-base font-bold mb-4"
        >
          Switch to Arbitrum Sepolia
        </Button>
      ) : (
        <Button
          onClick={connect}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-base font-bold glow-primary border-none mb-4"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
        <Droplets className="w-3 h-3 text-yellow-400" />
        <span>Need Arb Sepolia ETH?</span>
        <a
          href="https://www.alchemy.com/faucets/arbitrum-sepolia"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
        >
          Get from faucet <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </motion.div>
  );
}
