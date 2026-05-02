import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { ARBISCAN, CONTRACTS } from "@/lib/contracts";

export function WalletButton() {
  const { address, isConnected, isWrongNetwork, connect, disconnect, switchNetwork, shortAddress, isLoadingUser } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isConnected) {
    return (
      <Button
        onClick={connect}
        className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-mono text-xs uppercase tracking-wider glow-primary border-none gap-2"
      >
        <Wallet className="w-3.5 h-3.5" />
        Connect Wallet
      </Button>
    );
  }

  if (isWrongNetwork) {
    return (
      <Button
        onClick={switchNetwork}
        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 rounded-full px-5 font-mono text-xs uppercase tracking-wider gap-2"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Switch to Arb Sepolia
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 transition-all"
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-xs text-white">{isLoadingUser ? "Loading…" : shortAddress}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-64 bg-card border border-white/10 rounded-2xl p-3 shadow-2xl"
            >
              <div className="px-3 py-2 mb-2 bg-white/5 rounded-xl">
                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Connected</p>
                <p className="text-sm text-white font-mono break-all">{shortAddress}</p>
              </div>

              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Address"}
              </button>

              <a
                href={`${ARBISCAN}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors text-sm no-underline"
                onClick={() => setOpen(false)}
              >
                <ExternalLink className="w-4 h-4" />
                View on Arbiscan
              </a>

              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={() => { disconnect(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
