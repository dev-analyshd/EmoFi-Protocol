import React, { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { useListVaults, useCreateVault, useGetProtocolStats } from "@workspace/api-client-react";
import { useWallet } from "@/contexts/WalletContext";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, VAULT_ABI, ARBISCAN } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Database, TrendingUp, Star, ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { TokenType } from "@workspace/api-client-react";

const tokenColors: Record<string, string> = {
  happiness: "#FFD700", sadness: "#4A90D9", beautiful: "#FF69B4",
  good_thought: "#7CFC00", bad_thought: "#8B0000", intelligence: "#9B59B6",
  talent: "#E67E22", spirituality: "#1ABC9C", situational: "#95A5A6",
};
const tokenEmojis: Record<string, string> = {
  happiness: "😊", sadness: "😢", beautiful: "✨", good_thought: "💡",
  bad_thought: "🌪️", intelligence: "🧠", talent: "🎨", spirituality: "🧘", situational: "🌍",
};
const TOKEN_ID_MAP: Record<string, bigint> = {
  happiness: 0n, sadness: 1n, beautiful: 2n, good_thought: 3n,
  bad_thought: 4n, intelligence: 5n, talent: 6n, spirituality: 7n, situational: 8n,
};

export default function Vaults() {
  const { isConnected, userId } = useWallet();
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();
  const [vaultName, setVaultName] = useState("");
  const [vaultTokenType, setVaultTokenType] = useState("happiness");
  const [vaultPublic, setVaultPublic] = useState(false);

  const { data: stats, isLoading: statsLoading } = useGetProtocolStats();
  const { data: vaultsData, isLoading: vaultsLoading, refetch } = useListVaults(
    { userId: userId ?? 1 }
  );
  const createVaultMutation = useCreateVault();
  const { writeContractAsync } = useWriteContract();

  const { isLoading: txPending } = useWaitForTransactionReceipt({
    hash: pendingTx,
    query: {
      enabled: !!pendingTx,
      onSettled() {
        setPendingTx(undefined);
        refetch();
      },
    } as any,
  });

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;
    const tokenId = TOKEN_ID_MAP[vaultTokenType] ?? 0n;
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.RIVault,
        abi: VAULT_ABI,
        functionName: "createVault",
        args: [tokenId, vaultName, vaultPublic],
      });
      setPendingTx(hash);
      toast({
        title: "Vault Being Created On-Chain",
        description: (
          <a href={`${ARBISCAN}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary">
            View on Arbiscan <ExternalLink className="w-3 h-3" />
          </a>
        ) as any,
      });
      await createVaultMutation.mutateAsync({
        data: { name: vaultName, tokenType: vaultTokenType as TokenType, isPublic: vaultPublic, userId: userId ?? 1 },
      }).catch(() => {});
      setVaultName("");
    } catch (e: any) {
      toast({ title: "Error", description: e?.shortMessage ?? "Failed to create vault", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />

      <main className="container mx-auto pt-32 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
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
              <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
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
              <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
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
              <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="w-4 h-4 text-accent" />
                    <span className="text-xs font-mono uppercase tracking-widest">Contract</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <a
                    href={`${ARBISCAN}/address/${CONTRACTS.RIVault}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-mono text-sm flex items-center gap-1"
                  >
                    {CONTRACTS.RIVault.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                  </a>
                </CardContent>
              </Card>
            </>
          )}
        </div>

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

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Your Active Vaults</h2>
          {isConnected ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full gap-2 px-6 glow-primary border-none">
                  <Plus className="w-4 h-4" />
                  Create Vault
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Initialize New RI-Vault On-Chain</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateVault} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label>Vault Name</Label>
                    <Input
                      value={vaultName}
                      onChange={e => setVaultName(e.target.value)}
                      placeholder="e.g. Zen Meditation Alpha"
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attribute Type</Label>
                    <Select value={vaultTokenType} onValueChange={setVaultTokenType}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
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
                    <div>
                      <Label>Public Visibility</Label>
                      <p className="text-xs text-muted-foreground">Allow others to view vault stats</p>
                    </div>
                    <Switch checked={vaultPublic} onCheckedChange={setVaultPublic} />
                  </div>
                  <Button
                    type="submit"
                    disabled={txPending || !vaultName}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold rounded-xl glow-primary border-none disabled:opacity-50"
                  >
                    {txPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Initialize Vault On-Chain
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <ConnectPrompt title="Connect to Create Vaults" description="" />
          )}
        </div>

        {!isConnected ? (
          <ConnectPrompt
            title="Connect to View Your Vaults"
            description="Your RI-Vaults are linked to your wallet address. Connect to see and manage them."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vaultsLoading ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />)
            ) : vaultsData?.vaults.length ? (
              vaultsData.vaults.map((vault, i) => (
                <motion.div key={vault.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                  <Card className="bg-white/5 border-white/10 rounded-2xl h-full flex flex-col hover:border-white/20 transition-colors">
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
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-mono mb-1">Balance</p>
                          <p className="text-lg font-bold text-white">{vault.balance.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-mono mb-1">Staked</p>
                          <p className="text-lg font-bold text-secondary">{vault.stakedBalance.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-muted-foreground uppercase">Oracle Score</span>
                          <span className="text-white">{((vault.oracleScore ?? 0) * 100).toFixed(1)}%</span>
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
            ) : (
              <div className="col-span-full py-16 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No vaults yet. Create your first RI-Vault above.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
