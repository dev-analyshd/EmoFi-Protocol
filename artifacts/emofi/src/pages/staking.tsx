import React, { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useListStakingPositions, useStakeTokens, useClaimRewards, useUnstakeTokens, useGetStakingRates } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Coins, TrendingUp, Clock, Timer, ArrowRight, Zap } from "lucide-react";

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

export default function Staking() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const { data: rates, isLoading: ratesLoading } = useGetStakingRates();
  const { data: positions, isLoading: positionsLoading, refetch: refetchPositions } = useListStakingPositions({ userId: 1 });
  const stakeMutation = useStakeTokens();
  const claimMutation = useClaimRewards();
  const unstakeMutation = useUnstakeTokens();

  const handleStake = async () => {
    if (!selectedRate || !stakeAmount) return;
    try {
      await stakeMutation.mutateAsync({
        data: {
          userId: 1,
          stakedTokenType: selectedRate.stakedTokenType,
          rewardTokenType: selectedRate.rewardTokenType,
          amount: parseFloat(stakeAmount)
        }
      });
      toast({ title: "Staking Successful", description: `You have staked ${stakeAmount} ${selectedRate.stakedTokenType}` });
      setStakeAmount("");
      refetchPositions();
    } catch (error) {
      toast({ title: "Error", description: "Failed to stake tokens", variant: "destructive" });
    }
  };

  const handleClaim = async (id: number) => {
    try {
      await claimMutation.mutateAsync({ positionId: id, data: { userId: 1 } });
      toast({ title: "Rewards Claimed", description: "Your rewards have been sent to your wallet" });
      refetchPositions();
    } catch (error) {
      toast({ title: "Error", description: "Failed to claim rewards", variant: "destructive" });
    }
  };

  const handleUnstake = async (id: number) => {
    try {
      await unstakeMutation.mutateAsync({ positionId: id, data: { userId: 1 } });
      toast({ title: "Unstaked Successfully", description: "Tokens and rewards have been returned" });
      refetchPositions();
    } catch (error) {
      toast({ title: "Error", description: "Failed to unstake", variant: "destructive" });
    }
  };

  const calculateProjected = (days: number) => {
    if (!selectedRate || !stakeAmount) return "0.00";
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount)) return "0.00";
    return (amount * selectedRate.ratePerDay * days).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <main className="container mx-auto pt-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Attribute Staking — <span className="text-primary">Compound Emotional Capital</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Lock your emotional assets to generate higher-order attributes and protocol rewards.
              </p>
            </div>
            <motion.div 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2">
                <Zap className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="text-xs font-mono text-primary uppercase mb-1">Active Multiplier</div>
              <div className="text-2xl font-black text-white">Bear Market 2x</div>
              <p className="text-[10px] text-muted-foreground mt-1">Rewards doubled during market downturns</p>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="lg:col-span-2 bg-white/5 border-white/10 rounded-2xl overflow-hidden">
            <CardHeader className="bg-white/5 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                Staking Yield Rates
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Pair</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Rate/Day</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">APR</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Min. Stake</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratesLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 bg-white/5 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  rates?.map((rate, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-white capitalize font-bold">{rate.stakedTokenType.split("_")[0]}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-secondary capitalize font-bold">{rate.rewardTokenType.split("_")[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-white font-mono">{rate.ratePerDay.toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="border-secondary/50 text-secondary bg-secondary/10">
                          {rate.apy?.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono">1.0</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setSelectedRate(rate)}
                          className="hover:bg-primary/20 hover:text-primary rounded-full"
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="bg-white/5 border-white/10 rounded-2xl flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-accent" />
                Stake & Calculate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Selected Pair</label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  {selectedRate ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold capitalize">{selectedRate.stakedTokenType.replace("_", " ")}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-secondary font-bold capitalize">{selectedRate.rewardTokenType.replace("_", " ")}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">Select a pair from the table</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Amount to Stake</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="bg-white/5 border-white/10 pl-10" 
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-background/50 rounded-xl p-4 border border-white/5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">7d Projected</span>
                  <span className="text-white font-mono">{calculateProjected(7)} {selectedRate?.rewardTokenType.split("_")[0]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">30d Projected</span>
                  <span className="text-white font-mono">{calculateProjected(30)} {selectedRate?.rewardTokenType.split("_")[0]}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2">
                  <span className="text-white">90d Projected</span>
                  <span className="text-secondary font-mono">{calculateProjected(90)} {selectedRate?.rewardTokenType.split("_")[0]}</span>
                </div>
              </div>

              <Button 
                onClick={handleStake}
                disabled={!selectedRate || !stakeAmount}
                className="w-full bg-primary hover:bg-primary/90 text-white py-6 font-bold rounded-xl glow-primary border-none disabled:opacity-50"
              >
                Confirm Staking
              </Button>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          My Active Positions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {positionsLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />)
          ) : (
            positions?.map((pos) => (
              <Card key={pos.id} className="bg-white/5 border-white/10 rounded-2xl group hover:border-white/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tokenColors[pos.stakedTokenType] }} />
                      <span className="text-white capitalize font-bold">{pos.stakedTokenType.replace("_", " ")}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                      {pos.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="text-3xl font-black text-white">{pos.amountStaked.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-mono">STAKED PRINCIPAL</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-3 mb-6 flex items-center justify-between border border-white/5">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase font-mono">Pending Rewards</div>
                      <motion.div 
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-lg font-bold text-secondary"
                      >
                        {pos.pendingRewards.toFixed(4)}
                      </motion.div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleClaim(pos.id)}
                      className="bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 rounded-full px-4"
                    >
                      Claim
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleUnstake(pos.id)}
                      className="flex-1 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    >
                      Unstake
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {positions?.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Timer className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground">No active staking positions found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
