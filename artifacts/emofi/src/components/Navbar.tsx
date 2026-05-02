import React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Activity, LayoutDashboard, Database, ShoppingCart, Coins, ShieldCheck } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";

const Navbar = () => {
  const [location] = useLocation();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/vaults", label: "Vaults", icon: <Database className="w-4 h-4" /> },
    { href: "/marketplace", label: "Marketplace", icon: <ShoppingCart className="w-4 h-4" /> },
    { href: "/staking", label: "Staking", icon: <Coins className="w-4 h-4" /> },
    { href: "/governance", label: "Governance", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 w-full z-50 bg-background/50 backdrop-blur-lg border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between"
    >
      <Link href="/" className="flex items-center gap-2 cursor-pointer no-underline">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center glow-primary">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">EmoFi</span>
      </Link>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 transition-colors hover:text-white no-underline ${location === link.href ? "text-white" : "text-muted-foreground"}`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>

      <WalletButton />
    </motion.nav>
  );
};

export default Navbar;
