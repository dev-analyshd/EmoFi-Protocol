import React, { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useListMarketplaceListings, useGetMarketplaceStats, useBuyListing, useListTokens } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ShoppingBag, TrendingUp, BarChart3, Search, Filter, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TokenType } from "@workspace/api-client-react";

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

export default function Marketplace() {
  const [tokenType, setTokenType] = useState<string>("all");
  const { data: stats, isLoading: statsLoading } = useGetMarketplaceStats();
  const { data: listingsData, isLoading: listingsLoading, refetch } = useListMarketplaceListings({ 
    tokenType: tokenType === "all" ? undefined : tokenType as TokenType,
    status: "active"
  });
  const { data: tokens } = useListTokens();
  const buyMutation = useBuyListing();

  const handleBuy = async (listingId: number, amount: number) => {
    try {
      await buyMutation.mutateAsync({ 
        listingId: listingId as any,
        data: { buyerId: 1, amount }
      });
      toast({ title: "Purchase Successful", description: "Tokens added to your portfolio" });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete purchase", variant: "destructive" });
    }
  };

  const chartData = stats?.tokenVolumes ? stats.tokenVolumes.map((item) => ({
    name: item.tokenType.charAt(0).toUpperCase() + item.tokenType.slice(1).replace("_", " "),
    volume: item.volume,
    rawName: item.tokenType
  })) : [];

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
                      Negative attributes (Sadness, Bad Thought) always trade regardless of market conditions. Protocol incentives active.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

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
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Market Sentiment</div>
                <div className="text-2xl font-black text-primary">Bullish</div>
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
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0D0D14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                      itemStyle={{ color: "#fff" }}
                    />
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
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Token Type</label>
                <Select value={tokenType} onValueChange={setTokenType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="All Attributes" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 text-white">
                    <SelectItem value="all">All Attributes</SelectItem>
                    {tokens?.map(token => (
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
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 font-bold rounded-xl glow-secondary border-none">
                Create New Listing
              </Button>
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
                <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Price/Unit</TableHead>
                <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Remaining</TableHead>
                <TableHead className="text-right"></TableHead>
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
              ) : (
                listingsData?.listings.map((listing) => (
                  <TableRow key={listing.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {listing.sellerId.toString().substring(0, 6)}...{listing.sellerId.toString().substring(listing.sellerId.toString().length-4)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tokenColors[listing.tokenType] }} />
                        <span className="text-white capitalize font-medium">{listing.tokenType.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-white font-bold">{listing.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-accent font-bold">${listing.pricePerUnit.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{listing.remainingAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleBuy(listing.id, listing.remainingAmount)}
                        className="bg-white text-background hover:bg-white/90 rounded-full font-bold px-6"
                      >
                        Buy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
