import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, governanceProposalsTable, votesTable, usersTable } from "@workspace/db";
import { CreateProposalBody, CastVoteBody } from "@workspace/api-zod";

const router = Router();

router.get("/governance/proposals", async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = status
    ? await db.select().from(governanceProposalsTable).where(eq(governanceProposalsTable.status, status as any)).orderBy(desc(governanceProposalsTable.createdAt)).limit(50)
    : await db.select().from(governanceProposalsTable).orderBy(desc(governanceProposalsTable.createdAt)).limit(50);
  res.json({
    proposals: rows.map(p => ({ ...p, forVotes: Number(p.forVotes), againstVotes: Number(p.againstVotes), quorumRequired: Number(p.quorumRequired) })),
    total: rows.length,
  });
});

router.post("/governance/proposals", async (req, res) => {
  const body = CreateProposalBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const [proposer] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.proposerId)).limit(1);
  if (!proposer) { res.status(404).json({ error: "Proposer not found" }); return; }
  if (Number(proposer.emoBalance) < 1000) { res.status(403).json({ error: "Insufficient EMO balance. Need 1,000 EMO to propose." }); return; }
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [proposal] = await db.insert(governanceProposalsTable).values({
    proposerId: body.data.proposerId,
    title: body.data.title,
    description: body.data.description,
    proposalType: body.data.proposalType as any,
    status: "active",
    forVotes: "0",
    againstVotes: "0",
    quorumRequired: "1000",
    totalVoters: 0,
    endsAt,
  }).returning();
  res.status(201).json({ ...proposal, forVotes: Number(proposal.forVotes), againstVotes: Number(proposal.againstVotes), quorumRequired: Number(proposal.quorumRequired) });
});

router.get("/governance/proposals/:proposalId", async (req, res) => {
  const [proposal] = await db.select().from(governanceProposalsTable).where(eq(governanceProposalsTable.id, Number(req.params.proposalId))).limit(1);
  if (!proposal) { res.status(404).json({ error: "Not found" }); return; }
  const votes = await db.select().from(votesTable).where(eq(votesTable.proposalId, proposal.id)).limit(50);
  res.json({
    ...proposal,
    forVotes: Number(proposal.forVotes),
    againstVotes: Number(proposal.againstVotes),
    quorumRequired: Number(proposal.quorumRequired),
    votes: votes.map(v => ({ ...v, weight: Number(v.weight) })),
  });
});

router.post("/governance/proposals/:proposalId/vote", async (req, res) => {
  const body = CastVoteBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const proposalId = Number(req.params.proposalId);
  const [proposal] = await db.select().from(governanceProposalsTable).where(eq(governanceProposalsTable.id, proposalId)).limit(1);
  if (!proposal) { res.status(404).json({ error: "Proposal not found" }); return; }
  if (proposal.status !== "active") { res.status(400).json({ error: "Proposal not active" }); return; }
  if (new Date() > proposal.endsAt) { res.status(400).json({ error: "Voting period ended" }); return; }
  const existing = await db.select().from(votesTable).where(eq(votesTable.proposalId, proposalId)).limit(1);
  const alreadyVoted = existing.find(v => v.voterId === body.data.voterId);
  if (alreadyVoted) { res.status(409).json({ error: "Already voted" }); return; }
  const [voter] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.voterId)).limit(1);
  if (!voter) { res.status(404).json({ error: "Voter not found" }); return; }
  const weight = Math.max(1, Math.sqrt(Number(voter.emoBalance)));
  const [vote] = await db.insert(votesTable).values({ proposalId, voterId: body.data.voterId, support: body.data.support, weight: String(weight) }).returning();
  if (body.data.support) {
    await db.update(governanceProposalsTable).set({ forVotes: sql`for_votes + ${String(weight)}`, totalVoters: sql`total_voters + 1` }).where(eq(governanceProposalsTable.id, proposalId));
  } else {
    await db.update(governanceProposalsTable).set({ againstVotes: sql`against_votes + ${String(weight)}`, totalVoters: sql`total_voters + 1` }).where(eq(governanceProposalsTable.id, proposalId));
  }
  res.status(201).json({ ...vote, weight: Number(vote.weight) });
});

router.get("/governance/stats", async (_req, res) => {
  const proposals = await db.select().from(governanceProposalsTable);
  const active = proposals.filter(p => p.status === "active").length;
  const passed = proposals.filter(p => p.status === "passed").length;
  const totalVoters = await db.select({ count: sql<number>`COUNT(DISTINCT voter_id)` }).from(votesTable);
  res.json({ totalProposals: proposals.length, activeProposals: active, passedProposals: passed, totalVoters: Number(totalVoters[0]?.count ?? 0) });
});

export default router;
