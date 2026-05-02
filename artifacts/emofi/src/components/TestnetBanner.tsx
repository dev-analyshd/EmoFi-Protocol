import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, X, Droplets, Info } from "lucide-react";
import { ARBISCAN, CONTRACTS } from "@/lib/contracts";

const FAUCETS = [
  { name: "Alchemy Faucet", url: "https://www.alchemy.com/faucets/arbitrum-sepolia" },
  { name: "QuickNode Faucet", url: "https://faucet.quicknode.com/arbitrum/sepolia" },
  { name: "Chainlink Faucet", url: "https://faucets.chain.link/arbitrum-sepolia" },
];

export function TestnetBanner() {
  const [showContracts, setShowContracts] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="relative z-40 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5"
      >
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-yellow-400 font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            TESTNET — Arbitrum Sepolia (Chain 421614) — Not real money
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-yellow-300/80">
              <Droplets className="w-3 h-3" />
              <span>Need ETH?</span>
            </div>
            {FAUCETS.map(f => (
              <a
                key={f.name}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
              >
                {f.name}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}

            <button
              onClick={() => setShowContracts(!showContracts)}
              className="flex items-center gap-1 text-yellow-400/80 hover:text-yellow-300 transition-colors"
            >
              <Info className="w-3 h-3" />
              Contracts
            </button>
          </div>

          <button onClick={() => setDismissed(true)} className="text-yellow-400/60 hover:text-yellow-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <AnimatePresence>
          {showContracts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden container mx-auto"
            >
              <div className="pt-2 pb-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
                {Object.entries(CONTRACTS).map(([name, addr]) => (
                  <a
                    key={name}
                    href={`${ARBISCAN}/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col bg-yellow-500/10 rounded-lg p-2 hover:bg-yellow-500/20 transition-colors no-underline"
                  >
                    <span className="text-yellow-300 font-bold mb-0.5">{name}</span>
                    <span className="text-yellow-400/60 truncate">{addr.slice(0, 10)}…{addr.slice(-4)}</span>
                    <span className="text-yellow-400/40 mt-0.5">↗ Arbiscan</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
