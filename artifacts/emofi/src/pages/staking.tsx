import React, { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { useListStakingPositions, useGetStakingRates } from "@workspace/api-client-react";
import { useWallet } from "@/contexts/WalletContext";
import { useAttributeBalances, useIsApproved } from "@/hooks/useOnChainBalances";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS, EMOFI_TOKEN_ABI, STAKING_ABI } from "@/lib/contracts";
import { TOKEN_IDS } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Coins, TrendingUp, Clock, Timer, ArrowRight, Zap, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { ARBISCAN } from "@/lib/contracts";

const tokenColors: Record<string, string> = {
  happiness: "#FFD700", sadness: "#4A90D9", beautiful: "#FF69B4",
  good_thought: "#7CFC00", bad_thought: "#8B0000", intelligence: "#9B59B6",
  talent: "#E67E22", spirituality: "#1ABC9C", situational: "#95A5A6",
};

export default function Staking() {
  const { address, isConnected, userId } = useWallet();
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();

  const { data: rates, isLoading: ratesLoading } = useGetStakingRates();
  const { data: positions, isLoading: positionsLoading, refetch: refetchPositions } = useListStakingPositions(
    { userId: userId ?? 1 }
  );

  const { balances: attrBalances } = useAttributeBalances(address);
  const { isApproved, refetch: refetchApproval } = useIsApproved(address, CONTRACTS.EmoStaking);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: txPending } = useWaitForTransactionReceipt({
    hash: pendingTx,
    query: {
      enabled: !!pendingTx,
      onSettled() {
        setPendingTx(undefined);
        refetchPositions();
        refetchApproval();
      },
    } as any,
  });

  const handleApprove = async () => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoFiToken,
        abi: EMOFI_TOKEN_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.EmoStaking, true],
      });
      setPendingTx(hash);
      toast({ title: "Approval Sent", description: "Waiting for confirmation…" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to approve", variant: "destructive" });
    }
  };

  const handleStake = async () => {
    if (!selectedRate || !stakeAmount || !address) return;
    const pairId = BigInt(selectedRate.pairId ?? (rates?.findIndex((r: any) => r.id === selectedRate.id) ?? 0) + 1);
    const amount = BigInt(Math.floor(parseFloat(stakeAmount)));
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoStaking,
        abi: STAKING_ABI,
        functionName: "stake",
        args: [pairId, amount],
      });
      setPendingTx(hash);
      toast({
        title: "Staking Transaction Sent",
        description: (
          <a href={`${ARBISCAN}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary">
            View on Arbiscan <ExternalLink className="w-3 h-3" />
          </a>
        ) as any,
      });
      setStakeAmount("");
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to stake", variant: "destructive" });
    }
  };

  const handleClaim = async (positionId: number) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoStaking,
        abi: STAKING_ABI,
        functionName: "claimRewards",
        args: [BigInt(positionId)],
      });
      setPendingTx(hash);
      toast({ title: "Claim Sent", description: "Your rewards are being minted on-chain." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to claim", variant: "destructive" });
    }
  };

  const handleUnstake = async (positionId: number) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoStaking,
        abi: STAKING_ABI,
        functionName: "unstake",
        args: [BigInt(positionId)],
      });
      setPendingTx(hash);
      toast({ title: "Unstake Sent", description: "Tokens will be returned after confirmation." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to unstake", variant: "destructive" });
    }
  };

  const calculateProjected = (days: number) => {
    if (!selectedRate || !stakeAmount) return "0.00";
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount)) return "0.00";
    return (amount * selectedRate.ratePerDay * days).toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <Navbar />
        <main className="container mx-auto pt-32 px-6">
          <ConnectPrompt
            title="Attribute Staking"
            description="Connect your wallet to stake attribute tokens and earn on-chain rewards on Arbitrum Sepolia."
          />
        </main>
      </div>
    );
  }

  const stakedTokenId = selectedRate ? (TOKEN_IDS as any)[selectedRate.stakedTokenType] : undefined;
  const availableBalance = stakedTokenId !== undefined ? (attrBalances[selectedRate.stakedTokenType] ?? 0n) : 0n;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />

      <main className="container mx-auto pt-32 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
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
              <div className="text-xs font-mono text-primary uppercase mb-1">Contract</div>
              <a
                href={`${ARBISCAN}/address/${CONTRACTS.EmoStaking}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-mono text-xs flex items-center gap-1 hover:text-primary"
              >
                {CONTRACTS.EmoStaking.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          </div>
        </motion.div>

        {txPending && (
          <div className="mb-6 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Transaction pending — waiting for on-chain confirmation…
            {pendingTx && (
              <a href={`${ARBISCAN}/tx/${pendingTx}`} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 underline">
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="lg:col-span-2 bg-white/5 border-white/10 rounded-2xl overflow-hidden">
            <CardHeader className="bg-white/5 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                Staking Yield Rates
                <Badge className="ml-auto bg-green-500/10 text-green-400 border-green-500/20 text-[10px] font-mono">ON-CHAIN</Badge>
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Pair</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Rate/Day</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">APR</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Your Balance</TableHead>
                  <TableHead />
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
                  rates?.map((rate: any, i: number) => {
                    const bal = attrBalances[rate.stakedTokenType] ?? 0n;
                    const isSelected = selectedRate?.id === rate.id;
                    return (
                      <TableRow key={i} className={`border-white/5 hover:bg-white/5 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tokenColors[rate.stakedTokenType] }} />
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
                        <TableCell className="text-right font-mono text-muted-foreground">{bal.toString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "ghost"}
                            onClick={() => setSelectedRate(rate)}
                            className={isSelected ? "bg-primary text-white rounded-full" : "hover:bg-primary/20 hover:text-primary rounded-full"}
                          >
                            {isSelected ? <><CheckCircle2 className="w-3 h-3 mr-1" />Selected</> : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="bg-white/5 border-white/10 rounded-2xl flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-accent" />
                Stake On-Chain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 flex-1">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Selected Pair</label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                  {selectedRate ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold capitalize">{selectedRate.stakedTokenType.replace("_", " ")}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-secondary font-bold capitalize">{selectedRate.rewardTokenType.replace("_", " ")}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">Select a pair above</span>
                  )}
                </div>
                {selectedRate && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Your balance: <span className="text-white">{availableBalance.toString()}</span> tokens
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Amount to Stake</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    className="bg-white/5 border-white/10 pl-10"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    min="1"
                    step="1"
                  />
                </div>
              </div>

              <div className="bg-background/50 rounded-xl p-4 border border-white/5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7d Projected</span>
                  <span className="text-white font-mono">{calculateProjected(7)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">30d Projected</span>
                  <span className="text-white font-mono">{calculateProjected(30)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-2">
                  <span className="text-white">90d Projected</span>
                  <span className="text-secondary font-mono">{calculateProjected(90)}</span>
                </div>
              </div>

              {!isApproved ? (
                <Button
                  onClick={handleApprove}
                  disabled={txPending}
                  className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 py-5 font-bold rounded-xl"
                >
                  {txPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Step 1: Approve EmoFi Staking Contract
                </Button>
              ) : (
                <Button
                  onClick={handleStake}
                  disabled={!selectedRate || !stakeAmount || txPending || availableBalance === 0n}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-5 font-bold rounded-xl glow-primary border-none disabled:opacity-50"
                >
                  {txPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Stake On-Chain
                </Button>
              )}
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
          ) : positions?.length ? (
            positions.map((pos) => (
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
                  <div className="mb-4">
                    <div className="text-3xl font-black text-white">{Number(pos.amountStaked).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-mono">STAKED PRINCIPAL</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 mb-4 flex items-center justify-between border border-white/5">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase font-mono">Pending Rewards</div>
                      <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-lg font-bold text-secondary"
                      >
                        {Number(pos.pendingRewards).toFixed(4)}
                      </motion.div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleClaim(pos.id)}
                      disabled={txPending}
                      className="bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 rounded-full px-4"
                    >
                      {txPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim"}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleUnstake(pos.id)}
                    disabled={txPending}
                    className="w-full rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  >
                    Unstake
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Timer className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground">No active staking positions. Select a pair above and stake!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
