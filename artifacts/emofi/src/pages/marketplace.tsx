import React, { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { useListMarketplaceListings, useGetMarketplaceStats, useListTokens } from "@workspace/api-client-react";
import { useWallet } from "@/contexts/WalletContext";
import { useIsApproved, useEmoAllowance } from "@/hooks/useOnChainBalances";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, EMOFI_TOKEN_ABI, EMO_ABI, MARKETPLACE_ABI, ARBISCAN } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ShoppingBag, TrendingUp, BarChart3, Search, Filter, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TokenType } from "@workspace/api-client-react";

const tokenColors: Record<string, string> = {
  happiness: "#FFD700", sadness: "#4A90D9", beautiful: "#FF69B4",
  good_thought: "#7CFC00", bad_thought: "#8B0000", intelligence: "#9B59B6",
  talent: "#E67E22", spirituality: "#1ABC9C", situational: "#95A5A6",
};

const TOKEN_ID_MAP: Record<string, bigint> = {
  happiness: 0n, sadness: 1n, beautiful: 2n, good_thought: 3n,
  bad_thought: 4n, intelligence: 5n, talent: 6n, spirituality: 7n, situational: 8n,
};

export default function Marketplace() {
  const { address, isConnected } = useWallet();
  const [tokenType, setTokenType] = useState<string>("all");
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useGetMarketplaceStats();
  const { data: listingsData, isLoading: listingsLoading, refetch } = useListMarketplaceListings({
    tokenType: tokenType === "all" ? undefined : tokenType as TokenType,
    status: "active",
  });
  const { data: tokens } = useListTokens();

  const { isApproved: erc1155Approved, refetch: refetchApproval } = useIsApproved(address, CONTRACTS.EmoMarketplace);
  const { writeContractAsync } = useWriteContract();

  const { isLoading: txPending } = useWaitForTransactionReceipt({
    hash: pendingTx,
    query: {
      enabled: !!pendingTx,
      onSettled() {
        setPendingTx(undefined);
        setBuyingId(null);
        refetch();
        refetchApproval();
      },
    } as any,
  });

  const handleApproveERC1155 = async () => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoFiToken,
        abi: EMOFI_TOKEN_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.EmoMarketplace, true],
      });
      setPendingTx(hash);
      toast({ title: "Approval Sent", description: "Approving marketplace to handle your tokens…" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to approve", variant: "destructive" });
    }
  };

  const handleBuy = async (listingId: number, amount: number, pricePerUnit: number) => {
    if (!address) return;
    setBuyingId(listingId);
    const totalCost = parseEther(String(pricePerUnit * amount));
    try {
      const allowanceRes = await fetch(`${ARBISCAN}/api?module=account&action=tokenbalance`).catch(() => null);
      const hash = await writeContractAsync({
        address: CONTRACTS.EMOToken,
        abi: EMO_ABI,
        functionName: "approve",
        args: [CONTRACTS.EmoMarketplace, totalCost],
      });
      const approveTx = hash;
      toast({ title: "Step 1/2: Approving EMO Spend", description: "Waiting for confirmation…" });
      setPendingTx(approveTx);
    } catch (e: any) {
      setBuyingId(null);
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to buy", variant: "destructive" });
    }
  };

  const executeBuy = async (listingId: number, amount: number) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoMarketplace,
        abi: MARKETPLACE_ABI,
        functionName: "buy",
        args: [BigInt(listingId), BigInt(amount)],
      });
      setPendingTx(hash);
      toast({
        title: "Step 2/2: Purchase Sent!",
        description: (
          <a href={`${ARBISCAN}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary">
            View on Arbiscan <ExternalLink className="w-3 h-3" />
          </a>
        ) as any,
      });
    } catch (e: any) {
      setBuyingId(null);
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to execute buy", variant: "destructive" });
    }
  };

  const [newListing, setNewListing] = useState({ tokenType: "happiness", amount: "", pricePerUnit: "" });

  const handleCreateListing = async () => {
    if (!erc1155Approved) { await handleApproveERC1155(); return; }
    const tokenId = TOKEN_ID_MAP[newListing.tokenType] ?? 0n;
    const amount = BigInt(Math.floor(parseFloat(newListing.amount)));
    const pricePerUnit = parseEther(newListing.pricePerUnit);
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.EmoMarketplace,
        abi: MARKETPLACE_ABI,
        functionName: "createListing",
        args: [tokenId, amount, pricePerUnit, 0n],
      });
      setPendingTx(hash);
      toast({ title: "Listing Created!", description: "Your listing is being added on-chain." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to create listing", variant: "destructive" });
    }
  };

  const chartData = stats?.tokenVolumes
    ? stats.tokenVolumes.map((item) => ({
        name: item.tokenType.charAt(0).toUpperCase() + item.tokenType.slice(1).replace("_", " "),
        volume: item.volume,
        rawName: item.tokenType,
      }))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />

      <main className="container mx-auto pt-32 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                EmoFi Exchange — <span className="text-secondary">Trade Human Attributes</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                The world's premier liquid market for cryptographic emotional states.
              </p>
            </div>
            <Card className="bg-red-500/10 border-red-500/20 backdrop-blur-md max-w-sm">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                  <div>
                    <h4 className="text-white font-bold mb-1">Bear Market Protocol</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Negative attributes always trade. Protocol incentives active on Arb Sepolia.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {txPending && (
          <div className="mb-6 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Transaction pending…
            {pendingTx && (
              <a href={`${ARBISCAN}/tx/${pendingTx}`} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 underline">
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />)
          ) : (
            <>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Volume</div>
                <div className="text-2xl font-black text-white">${stats?.totalVolume?.toLocaleString()}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Active Listings</div>
                <div className="text-2xl font-black text-secondary">{stats?.activeListings?.toLocaleString()}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Trades</div>
                <div className="text-2xl font-black text-accent">{stats?.totalTrades?.toLocaleString()}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Contract</div>
                <a
                  href={`${ARBISCAN}/address/${CONTRACTS.EmoMarketplace}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-mono text-sm flex items-center gap-1"
                >
                  {CONTRACTS.EmoMarketplace.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                </a>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="lg:col-span-2 bg-white/5 border-white/10 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Volume Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0D0D14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} itemStyle={{ color: "#fff" }} />
                    <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={tokenColors[entry.rawName] || "#8884d8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Filter className="w-5 h-5 text-secondary" />
                Market Filters
              </CardTitle>
            </CardHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Token Type</label>
                <Select value={tokenType} onValueChange={setTokenType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="All Attributes" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 text-white">
                    <SelectItem value="all">All Attributes</SelectItem>
                    {tokens?.map((token: any) => (
                      <SelectItem key={token.tokenType} value={token.tokenType} className="capitalize">
                        {token.tokenType.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Search Listings</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search address..." className="bg-white/5 border-white/10 pl-10" />
                </div>
              </div>

              {isConnected ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 font-bold rounded-xl glow-secondary border-none">
                      Create New Listing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Create Listing On-Chain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label className="text-xs font-mono text-muted-foreground uppercase">Attribute Token</Label>
                        <Select value={newListing.tokenType} onValueChange={v => setNewListing(l => ({ ...l, tokenType: v }))}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-white/10 text-white">
                            {Object.keys(TOKEN_ID_MAP).map(t => (
                              <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-mono text-muted-foreground uppercase">Amount</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          className="bg-white/5 border-white/10 mt-1"
                          value={newListing.amount}
                          onChange={e => setNewListing(l => ({ ...l, amount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-mono text-muted-foreground uppercase">Price per unit (EMO)</Label>
                        <Input
                          type="number"
                          placeholder="1.0"
                          className="bg-white/5 border-white/10 mt-1"
                          value={newListing.pricePerUnit}
                          onChange={e => setNewListing(l => ({ ...l, pricePerUnit: e.target.value }))}
                        />
                      </div>
                      {!erc1155Approved && (
                        <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-3">
                          You need to approve the marketplace first — clicking "Create" will prompt an approval tx.
                        </p>
                      )}
                      <Button
                        onClick={handleCreateListing}
                        disabled={txPending || !newListing.amount || !newListing.pricePerUnit}
                        className="w-full bg-secondary hover:bg-secondary/90 text-white py-5 font-bold rounded-xl"
                      >
                        {txPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {!erc1155Approved ? "Approve & Create" : "Create Listing On-Chain"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <ConnectPrompt title="Connect to Trade" description="Connect your wallet to buy and create listings." />
              )}
            </div>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-mono text-xs uppercase">Seller</TableHead>
                <TableHead className="text-muted-foreground font-mono text-xs uppercase">Attribute</TableHead>
                <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Amount</TableHead>
                <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Price/Unit (EMO)</TableHead>
                <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Remaining</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listingsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-white/5 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 bg-white/5 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : listingsData?.listings.length ? (
                listingsData.listings.map((listing) => (
                  <TableRow key={listing.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {listing.sellerId.toString().substring(0, 6)}…{listing.sellerId.toString().slice(-4)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tokenColors[listing.tokenType] }} />
                        <span className="text-white capitalize font-medium">{listing.tokenType.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-white font-bold">{listing.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-accent font-bold">{listing.pricePerUnit.toLocaleString()} EMO</TableCell>
                    <TableCell className="text-right text-muted-foreground">{listing.remainingAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {isConnected ? (
                        <Button
                          size="sm"
                          onClick={() => handleBuy(listing.id, listing.remainingAmount, listing.pricePerUnit)}
                          disabled={txPending && buyingId === listing.id}
                          className="bg-white text-background hover:bg-white/90 rounded-full font-bold px-6"
                        >
                          {txPending && buyingId === listing.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buy"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">Connect wallet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No active listings — be the first to list!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
