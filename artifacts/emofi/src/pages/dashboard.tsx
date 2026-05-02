import React from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useGetDashboard, useGetAiRecommendations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Brain, Wallet, Database, Coins, ArrowUpRight, TrendingUp, Sparkles, LayoutGrid } from "lucide-react";
import { Link } from "wouter";

const tokenColors: Record<string, string> = {
  happiness: "#FFD700",
  sadness: "#4A90D9",
  beautiful: "#FF69B4",
  good_thought: "#7CFC00",
  bad_thought: "#8B0000",
  intelligence: "#9B59B6",
  talent: "#E67E22",
  spirituality: "#1ABC9C",
  situational: "#95A5A6",
};

export default function Dashboard() {
  const { data: dashboard, isLoading: dashboardLoading } = useGetDashboard(1);
  const { data: recommendations, isLoading: recommendationsLoading } = useGetAiRecommendations(1);

  const quickLinks = [
    { label: "RI-Vaults",   href: "/vaults",      icon: <Database className="w-5 h-5" />, color: "text-primary" },
    { label: "Exchange",    href: "/marketplace",  icon: <Activity className="w-5 h-5" />, color: "text-secondary" },
    { label: "Staking",     href: "/staking",      icon: <Coins className="w-5 h-5" />,    color: "text-accent" },
    { label: "Governance",  href: "/governance",   icon: <Brain className="w-5 h-5" />,    color: "text-white" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <main className="container mx-auto pt-32 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              System Status: <span className="text-primary">Synchronized</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Reality-Integration Score: 98.4%</p>
          </motion.div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-mono uppercase">EMO Balance</p>
              <p className="text-2xl font-black text-white">
                {dashboard ? Number(dashboard.emoBalance).toLocaleString() : "—"} EMO
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {dashboardLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 bg-white/5 rounded-2xl" />)
          ) : (
            <>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Vaults</div>
                <div className="text-2xl font-black text-white">{dashboard?.summary?.activeVaults ?? 0}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Active Staking</div>
                <div className="text-2xl font-black text-secondary">{dashboard?.summary?.activePositions ?? 0}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Reputation</div>
                <div className="text-2xl font-black text-accent">{dashboard?.reputationScore ?? 0}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Staked</div>
                <div className="text-2xl font-black text-primary">
                  {dashboard?.summary?.totalStaked?.toFixed(2) ?? "0.00"}
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
              <CardHeader className="bg-white/5 py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Portfolio Overview
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase">Attribute</TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Balance</TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Locked</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 bg-white/5 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : dashboard?.tokenBalances?.length ? (
                    dashboard.tokenBalances.map((token: any, i: number) => (
                      <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tokenColors[token.tokenType] }} />
                            <span className="text-white capitalize font-bold">{token.tokenType.replace(/_/g, " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-white font-mono">{Number(token.balance).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">{Number(token.lockedBalance).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="hover:text-primary">
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No token balances yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                <CardHeader className="bg-white/5 py-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                    Pending Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {dashboardLoading ? (
                    <Skeleton className="h-32 bg-white/5 rounded-xl" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-mono">Total Pending</p>
                          <p className="text-lg font-black text-secondary">
                            {(dashboard?.summary?.totalPendingRewards ?? 0).toFixed(4)} EMO
                          </p>
                        </div>
                        <Link href="/staking">
                          <Button size="sm" variant="outline" className="rounded-full border-secondary/30 text-secondary">View</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                <CardHeader className="bg-white/5 py-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-accent" />
                    Quick Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-3">
                    {quickLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all group no-underline"
                      >
                        <div className={`${link.color} mb-2 group-hover:scale-110 transition-transform`}>{link.icon}</div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground group-hover:text-white">{link.label}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
              <CardHeader className="bg-white/5 py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" />
                  Active Staking Positions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {dashboardLoading ? (
                  Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-white/5 rounded-xl" />)
                ) : dashboard?.stakingPositions?.length ? (
                  dashboard.stakingPositions.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="text-white font-bold capitalize text-sm">{p.stakedTokenType?.replace(/_/g, " ")} → {p.rewardTokenType?.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{Number(p.amountStaked).toFixed(2)} staked</p>
                      </div>
                      <div className="text-right">
                        <p className="text-secondary font-bold text-sm">{Number(p.pendingRewards).toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">pending rewards</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">No active staking positions</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Recommendations
            </h2>
            <div className="space-y-4">
              {recommendationsLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)
              ) : (
                recommendations?.map((rec: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="bg-white/5 border-white/10 rounded-2xl p-6 group hover:border-primary/40 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-primary/20 text-primary border-primary/30 uppercase font-mono text-[10px]">
                          {Math.round(Number(rec.confidence) * 100)}% CONFIDENCE
                        </Badge>
                        <Sparkles className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="text-white font-bold mb-2">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{rec.description}</p>
                      <Link href={rec.actionUrl ?? "/vaults"}>
                        <Button className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-full font-bold text-xs uppercase tracking-wider">
                          Execute Strategy
                        </Button>
                      </Link>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
