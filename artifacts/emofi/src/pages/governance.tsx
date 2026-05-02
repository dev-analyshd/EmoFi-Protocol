import React from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useListProposals, useGetGovernanceStats, useCastVote, useCreateProposal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, MessageSquare, Users, FileText, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { ProposalType, ProposalStatus } from "@workspace/api-client-react";

export default function Governance() {
  const { data: stats, isLoading: statsLoading } = useGetGovernanceStats();
  const { data: proposalsData, isLoading: proposalsLoading, refetch } = useListProposals();
  const castVoteMutation = useCastVote();
  const createProposalMutation = useCreateProposal();

  const handleVote = async (proposalId: number, choice: "for" | "against") => {
    try {
      await castVoteMutation.mutateAsync({ 
        proposalId: proposalId as any, 
        data: { voterId: 1, support: choice === "for", weight: 1 } 
      });
      toast({ title: "Vote Cast", description: `Successfully voted ${choice} on proposal` });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to cast vote", variant: "destructive" });
    }
  };

  const handleCreateProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createProposalMutation.mutateAsync({
        data: {
          proposerId: 1,
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          proposalType: formData.get("type") as ProposalType,
        }
      });
      toast({ title: "Proposal Created", description: "Your proposal is now active for voting" });
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create proposal", variant: "destructive" });
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    passed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    executed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
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
                EmoFi DAO — <span className="text-primary">Govern the Protocol</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                The decentralized brain of EmoFi. Shape the future of reality integration.
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full gap-2 px-8 py-6 text-lg font-bold glow-primary border-none">
                  <Plus className="w-5 h-5" />
                  New Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Create Proposal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProposal} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input name="title" placeholder="e.g. Adjust Staking Yield for Happiness" className="bg-white/5 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select name="type" required>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10 text-white">
                        <SelectItem value="new_attribute">New Attribute</SelectItem>
                        <SelectItem value="staking_adjustment">Staking Adjustment</SelectItem>
                        <SelectItem value="marketplace_fee">Marketplace Fee</SelectItem>
                        <SelectItem value="oracle_policy">Oracle Policy</SelectItem>
                        <SelectItem value="bear_market_incentive">Bear Market Incentive</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea name="description" placeholder="Describe your proposal in detail..." className="bg-white/5 border-white/10 min-h-[150px]" required />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold rounded-xl glow-primary">
                    Launch Proposal
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />)
          ) : (
            <>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Proposals</div>
                <div className="text-2xl font-black text-white">{stats?.totalProposals}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Active</div>
                <div className="text-2xl font-black text-green-500">{stats?.activeProposals}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Passed</div>
                <div className="text-2xl font-black text-blue-500">{stats?.passedProposals}</div>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl p-6">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Voters</div>
                <div className="text-2xl font-black text-primary">{stats?.uniqueVoters?.toLocaleString()}</div>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          {proposalsLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />)
          ) : (
            proposalsData?.proposals.map((prop, i) => (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors group">
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <Badge className={`${statusColors[prop.status] || ""} uppercase font-mono text-[10px]`}>
                          {prop.status}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 text-muted-foreground uppercase font-mono text-[10px]">
                          {prop.proposalType.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">End: {new Date(prop.endsAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                        <Users className="w-4 h-4" />
                        {prop.totalVoters?.toLocaleString()} VOTES
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3">{prop.title}</h3>
                    <p className="text-muted-foreground mb-8 leading-relaxed max-w-3xl">{prop.description}</p>

                    <div className="grid md:grid-cols-2 gap-12 mb-8">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-mono">
                          <span className="text-white flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> FOR
                          </span>
                          <span className="text-white">{prop.forVotes?.toLocaleString()} ({((prop.forVotes / (prop.forVotes + prop.againstVotes || 1)) * 100).toFixed(1)}%)</span>
                        </div>
                        <Progress value={(prop.forVotes / (prop.forVotes + prop.againstVotes || 1)) * 100} className="h-2" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-mono">
                          <span className="text-white flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" /> AGAINST
                          </span>
                          <span className="text-white">{prop.againstVotes?.toLocaleString()} ({((prop.againstVotes / (prop.forVotes + prop.againstVotes || 1)) * 100).toFixed(1)}%)</span>
                        </div>
                        <Progress value={(prop.againstVotes / (prop.forVotes + prop.againstVotes || 1)) * 100} className="h-2" />
                      </div>
                    </div>

                    {prop.status === "active" && (
                      <div className="flex gap-4">
                        <Button 
                          onClick={() => handleVote(prop.id, "for")}
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/30 py-6 rounded-xl font-bold"
                        >
                          Vote For
                        </Button>
                        <Button 
                          onClick={() => handleVote(prop.id, "against")}
                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 py-6 rounded-xl font-bold"
                        >
                          Vote Against
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
