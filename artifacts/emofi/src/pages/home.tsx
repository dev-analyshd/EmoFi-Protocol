import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ChevronRight, Zap, Network, Lock, Activity, Coins, ArrowRight, Brain, Heart, Sparkles, ActivitySquare, BrainCircuit, Globe, GitMerge, Shield, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Components ---

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 w-full z-50 bg-background/50 backdrop-blur-lg border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center glow-primary">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">EmoFi</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        <a href="#concept" className="hover:text-white transition-colors">Concept</a>
        <a href="#vaults" className="hover:text-white transition-colors">RI-Vaults</a>
        <a href="#mechanics" className="hover:text-white transition-colors">Mechanics</a>
        <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
        <a href="#tokenomics" className="hover:text-white transition-colors">Tokenomics</a>
      </div>
      <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-mono text-xs uppercase tracking-wider glow-primary border-none" data-testid="button-whitelist-nav">
        Enter Protocol
      </Button>
    </motion.nav>
  );
};

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <img src="/images/hero-bg.png" alt="Neural Space" className="w-full h-full object-cover opacity-40 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </motion.div>
      
      <div className="container relative z-10 mx-auto px-6 text-center max-w-5xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs font-mono text-secondary-foreground uppercase tracking-widest">Protocol Live on Testnet</span>
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-tight"
        >
          Tokenize <br className="hidden md:block" />
          <span className="text-gradient">Human Reality.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light"
        >
          EmoFi is the world's first Reality-Integrated Emotional Finance Protocol. 
          Trade, stake, and program human emotions, intelligence, and spiritual states as on-chain assets.
        </motion.p>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-white text-background hover:bg-white/90 rounded-full font-bold text-base border-none group" data-testid="button-launch-app">
            Launch App
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full font-bold text-base border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md" data-testid="button-read-docs">
            Read Whitepaper
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

const Concept = () => {
  return (
    <section id="concept" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              A New Primitive for <span className="text-primary">Consciousness.</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              For too long, DeFi has been restricted to purely financial abstraction. EmoFi bridges the gap between the visceral human experience and cryptographic permanence.
            </p>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              By utilizing the Reality-Integrated Vault (RI-Vault), users synthesize raw real-world states—joy, sorrow, brilliance, and intuition—into tradable, composable tokens.
            </p>
            <div className="flex gap-4" id="vaults">
              <div className="flex-1 bg-gradient-glass p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h4 className="text-4xl font-black text-white mb-2 tracking-tighter">RI-Vaults</h4>
                <p className="text-sm text-muted-foreground">Personalized on-chain emotion vaults bridging reality to protocol via zero-knowledge proofs.</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative h-[500px] rounded-3xl overflow-hidden glow-secondary border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-primary/20 mix-blend-overlay z-10" />
            <img src="/images/vault.png" alt="Futuristic Vault" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const TokenCategories = () => {
  const categories = [
    { icon: <Heart className="w-6 h-6" />, name: "Happiness", desc: "Synthesized pure joy. High demand during bull markets.", color: "text-pink-400" },
    { icon: <ActivitySquare className="w-6 h-6" />, name: "Sadness", desc: "Negative token utility. Highly profitable in bear markets.", color: "text-blue-400" },
    { icon: <Sparkles className="w-6 h-6" />, name: "Beautiful", desc: "Aesthetic appreciation. Used in NFT compounding.", color: "text-yellow-400" },
    { icon: <BrainCircuit className="w-6 h-6" />, name: "Good Thought", desc: "Constructive cognitive energy. Boosts yield.", color: "text-green-400" },
    { icon: <Brain className="w-6 h-6" />, name: "Bad Thought", desc: "Destructive cognitive energy. Burn mechanism target.", color: "text-red-400" },
    { icon: <Network className="w-6 h-6" />, name: "Intelligence", desc: "Logical capacity. Unlocks governance multiplier.", color: "text-cyan-400" },
    { icon: <Zap className="w-6 h-6" />, name: "Talent", desc: "Innate capability. Required for protocol creation.", color: "text-orange-400" },
    { icon: <Globe className="w-6 h-6" />, name: "Spirituality", desc: "Ethereal connection. Deep staking requirement.", color: "text-purple-400" },
    { icon: <Activity className="w-6 h-6" />, name: "Situational", desc: "Dynamic oracle-fed metrics based on real events.", color: "text-white" },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">The <span className="text-primary">Attribute</span> Matrix</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nine fundamental pillars of the human experience, synthesized into ERC-20 and ERC-1155 primitives.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-gradient-glass p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${cat.color}`}>
                {cat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{cat.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{cat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Mechanics = () => {
  return (
    <section id="mechanics" className="py-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Protocol <span className="text-secondary">Mechanics</span></h2>
            <div className="space-y-8 mt-12">
              {[
                { title: "Mint", desc: "Deposit baseline emotional assets into RI-Vaults to synthesize higher-order attribute tokens." },
                { title: "Burn", desc: "Destroy negative tokens (Sadness, Bad Thought) to stabilize the oracle and earn protocol fees." },
                { title: "Stake", desc: "Lock positive attributes to compound yield and increase your Reality-Integration score." },
                { title: "Trade", desc: "Liquid markets for human states. Arbitrage intelligence against happiness in the open market." }
              ].map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-6"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20">
                    <GitMerge className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{m.title}</h4>
                    <p className="text-muted-foreground">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-secondary/5 rounded-3xl backdrop-blur-3xl border border-white/10 p-8 flex flex-col justify-center">
               <h3 className="text-2xl font-bold text-white mb-6 font-mono border-b border-white/10 pb-4">Bear Market Utility</h3>
               <p className="text-muted-foreground text-lg mb-8">
                 Unlike traditional DeFi, EmoFi thrives in market downturns. Negative attribute tokens become highly profitable instruments as users hedge against widespread panic.
               </p>
               <div className="bg-background/80 p-6 rounded-xl border border-red-500/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[40px] pointer-events-none" />
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-white font-mono">Sadness Base APY</span>
                   <span className="text-red-400 font-bold font-mono">+142.5%</span>
                 </div>
                 <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                   <div className="bg-red-500 h-full w-[70%]" />
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Oracle = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative h-[600px] rounded-3xl overflow-hidden border border-white/10"
          >
             <img src="/images/oracle.png" alt="Oracle Network" className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </motion.div>
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              AI + <span className="text-accent">Oracle Layer</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              How do we verify human experience on-chain? EmoFi employs a decentralized network of AI agents processing real-world data feeds—biometrics, sentiment analysis, and situational metrics.
            </p>
            <ul className="space-y-4 mb-8">
              {["Cryptographic Verification of State", "Zero-Knowledge Emotion Proofs", "Real-time Sentiment Pegging"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-muted-foreground">
                  <Shield className="w-5 h-5 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="rounded-full border-accent text-accent hover:bg-accent hover:text-background font-bold transition-all px-8">
              Explore Oracle Architecture
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Roadmap = () => {
  const phases = [
    { phase: "0", title: "Genesis & Oracle Deployment", weeks: "Week 0-6" },
    { phase: "1", title: "Testnet Protocol Launch", weeks: "Week 6-12" },
    { phase: "2", title: "Token Generation Event", weeks: "Week 12-18" },
    { phase: "3", title: "Cross-chain Aggregation", weeks: "Week 18-24" },
    { phase: "4", title: "Decentralized Sentiment Models", weeks: "Week 24-30" },
    { phase: "5", title: "Reality-Integration Mainnet", weeks: "Week 30-36" },
  ];

  return (
    <section id="roadmap" className="py-24 relative">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Expansion <span className="text-primary">Roadmap</span></h2>
          <p className="text-muted-foreground text-lg">36 weeks to global reality integration.</p>
        </div>
        <div className="relative border-l-2 border-white/10 ml-4 md:ml-0 md:pl-10 space-y-12">
          {phases.map((p, i) => (
            <motion.div 
              key={i}
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative pl-8 md:pl-0"
            >
              <div className="absolute -left-[45px] md:-left-12 top-0 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div className="bg-gradient-glass p-6 rounded-2xl border border-white/5 relative group hover:border-primary/50 transition-colors">
                <span className="text-xs font-mono text-primary mb-2 block tracking-widest">{p.weeks}</span>
                <h4 className="text-xl font-bold text-white mb-1"><span className="text-muted-foreground mr-2">Phase {p.phase}:</span> {p.title}</h4>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Tokenomics = () => {
  return (
    <section id="tokenomics" className="py-24 bg-card/30 border-y border-white/5">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">$EMO <span className="text-primary">Tokenomics</span></h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The governance and utility core of the Reality-Integrated network.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
           <div className="bg-gradient-glass p-8 rounded-2xl text-center">
             <h4 className="text-sm font-mono text-muted-foreground uppercase mb-2">Total Supply</h4>
             <p className="text-4xl font-black text-white">1,000,000</p>
           </div>
           <div className="bg-gradient-glass p-8 rounded-2xl text-center">
             <h4 className="text-sm font-mono text-muted-foreground uppercase mb-2">Token Standard</h4>
             <p className="text-4xl font-black text-white">ERC-20</p>
           </div>
           <div className="bg-gradient-glass p-8 rounded-2xl text-center">
             <h4 className="text-sm font-mono text-muted-foreground uppercase mb-2">Governance</h4>
             <p className="text-4xl font-black text-white">DAO</p>
           </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-24 relative overflow-hidden border-t border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
        <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Initialize Your State.</h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Join the vanguard of Reality-Integrated Finance. Whitelist applications are open for Phase 0.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="w-full sm:w-auto h-16 px-10 bg-white text-background hover:bg-white/90 rounded-full font-bold text-lg border-none glow-primary">
            Join Whitelist
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 rounded-full font-bold text-lg border-white/20 bg-white/5 hover:bg-white/10 text-white">
            Discord Community
          </Button>
        </div>
        <div className="mt-24 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-white tracking-widest">EmoFi Protocol</span>
          </div>
          <p>© 2026 EmoFi DAO. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/30">
      <Navbar />
      <Hero />
      <Concept />
      <TokenCategories />
      <Mechanics />
      <Oracle />
      <Roadmap />
      <Tokenomics />
      <Footer />
    </div>
  );
}
