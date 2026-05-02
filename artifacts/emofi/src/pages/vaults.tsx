import React from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useListVaults, useCreateVault, useGetProtocolStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Database, TrendingUp, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
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

const tokenEmojis: Record<string, string> = {
  happiness: "😊",
  sadness: "😢",
  beautiful: "✨",
  good_thought: "💡",
  bad_thought: "🌪️",
  intelligence: "🧠",
  talent: "🎨",
  spirituality: "🧘",
  situational: "🌍",
};

export default function Vaults() {
  const { data: stats, isLoading: statsLoading } = useGetProtocolStats();
  const { data: vaultsData, isLoading: vaultsLoading, refetch } = useListVaults({ userId: 1 });
  const createVaultMutation = useCreateVault();

  const handleCreateVault = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const tokenType = formData.get("tokenType") as TokenType;
    const isPublic = formData.get("isPublic") === "on";

    try {
      await createVaultMutation.mutateAsync({
        data: { name, tokenType, isPublic, userId: 1 }
      });
      toast({ title: "Vault Created", description: `Successfully created vault ${name}` });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create vault", variant: "destructive" });
    }
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
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            RI-Vaults — <span className="text-primary">Reality-Integrated Emotion Storage</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Synthesize and store human emotional states as on-chain assets with cryptographic verification.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {statsLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />)
          ) : (
            <>
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl overflow-hidden group">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Database className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase tracking-widest">Total Vaults</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-white">{stats?.totalVaults?.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl overflow-hidden group">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-mono uppercase tracking-widest">TVL</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-white">${stats?.totalVolume?.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl overflow-hidden group">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="w-4 h-4 text-accent" />
                    <span className="text-xs font-mono uppercase tracking-widest">Popular State</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-white uppercase">Happiness</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Your Active Vaults</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-full gap-2 px-6 glow-primary border-none">
                <Plus className="w-4 h-4" />
                Create Vault
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Initialize New RI-Vault</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateVault} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Vault Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Zen Meditation Alpha" className="bg-white/5 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokenType">Attribute Type</Label>
                  <Select name="tokenType" required>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select attribute" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      {Object.keys(tokenColors).map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {tokenEmojis[type]} {type.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Public Visibility</Label>
                    <p className="text-xs text-muted-foreground">Allow others to view vault stats</p>
                  </div>
                  <Switch name="isPublic" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold rounded-xl glow-primary border-none">
                  Initialize Vault
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vaultsLoading ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />)
          ) : (
            vaultsData?.vaults.map((vault, i) => (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl h-full flex flex-col hover:border-white/20 transition-colors group">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${tokenColors[vault.tokenType]}20`, border: `1px solid ${tokenColors[vault.tokenType]}40` }}
                      >
                        {tokenEmojis[vault.tokenType]}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-muted-foreground uppercase">
                        {vault.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white capitalize">{vault.name}</CardTitle>
                    <p className="text-xs font-mono text-muted-foreground">ID: {vault.id.toString().substring(0, 8)}...{vault.id.toString().substring(vault.id.toString().length-4)}</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-mono mb-1">Balance</p>
                        <p className="text-lg font-bold text-white">{vault.balance.toLocaleString()} {vault.tokenType.split("_")[0]}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-mono mb-1">Staked</p>
                        <p className="text-lg font-bold text-secondary">{vault.stakedBalance.toLocaleString()} {vault.tokenType.split("_")[0]}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground uppercase">Oracle Score</span>
                        <span className="text-white">{( (vault.oracleScore ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(vault.oracleScore ?? 0) * 100} className="h-1.5" />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white">Mint</Button>
                      <Button variant="outline" className="flex-1 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white">Burn</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
