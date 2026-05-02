import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletProvider } from "@/contexts/WalletContext";
import { TestnetBanner } from "@/components/TestnetBanner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Vaults from "@/pages/vaults";
import Marketplace from "@/pages/marketplace";
import Staking from "@/pages/staking";
import Governance from "@/pages/governance";
import Dashboard from "@/pages/dashboard";
import React, { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/vaults" component={Vaults} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/staking" component={Staking} />
      <Route path="/governance" component={Governance} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <TestnetBanner />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
