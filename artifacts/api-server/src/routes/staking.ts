import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, stakingPositionsTable, rewardClaimsTable, usersTable } from "@workspace/db";
import { StakeTokensBody } from "@workspace/api-zod";

const router = Router();

const STAKING_RATES = [
  { stakedTokenType: "happiness",    rewardTokenType: "beautiful",    ratePerDay: 0.01,  apy: 36.5,  minStake: 1 },
  { stakedTokenType: "good_thought", rewardTokenType: "beautiful",    ratePerDay: 0.005, apy: 18.25, minStake: 1 },
  { stakedTokenType: "intelligence", rewardTokenType: "good_thought", ratePerDay: 0.02,  apy: 73.0,  minStake: 5 },
  { stakedTokenType: "talent",       rewardTokenType: "happiness",    ratePerDay: 0.015, apy: 54.75, minStake: 2 },
  { stakedTokenType: "spirituality", rewardTokenType: "good_thought", ratePerDay: 0.008, apy: 29.2,  minStake: 1 },
];

function calcPendingRewards(position: {
  amountStaked: string;
  rewardRate: string;
  lastClaimedAt: Date | null;
  startedAt: Date;
  pendingRewards: string;
}): number {
  const lastTime = position.lastClaimedAt ?? position.startedAt;
  const elapsedDays = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60 * 24);
  const earned = Number(position.amountStaked) * Number(position.rewardRate) * elapsedDays;
  return Number(position.pendingRewards) + earned;
}

router.get("/staking/positions", async (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const rows = userId
    ? await db.select().from(stakingPositionsTable)
        .where(and(eq(stakingPositionsTable.userId, userId), eq(stakingPositionsTable.isActive, true)))
        .orderBy(desc(stakingPositionsTable.startedAt))
    : await db.select().from(stakingPositionsTable)
        .where(eq(stakingPositionsTable.isActive, true))
        .orderBy(desc(stakingPositionsTable.startedAt));
  res.json(rows.map(p => ({
    ...p,
    amountStaked: Number(p.amountStaked),
    pendingRewards: calcPendingRewards(p),
    totalEarned: Number(p.totalEarned),
    rewardRate: Number(p.rewardRate),
  })));
});

router.post("/staking/stake", async (req, res) => {
  const body = StakeTokensBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const rate = STAKING_RATES.find(r =>
    r.stakedTokenType === body.data.stakedTokenType &&
    r.rewardTokenType === body.data.rewardTokenType
  );
  if (!rate) { res.status(400).json({ error: "Invalid staking pair" }); return; }
  if (body.data.amount < rate.minStake) {
    res.status(400).json({ error: `Minimum stake is ${rate.minStake}` }); return;
  }
  const [position] = await db.insert(stakingPositionsTable).values({
    userId: body.data.userId,
    stakedTokenType: body.data.stakedTokenType as any,
    rewardTokenType: body.data.rewardTokenType as any,
    amountStaked: String(body.data.amount),
    rewardRate: String(rate.ratePerDay),
    pendingRewards: "0",
    totalEarned: "0",
    isActive: true,
  }).returning();
  res.status(201).json({ ...position, amountStaked: Number(position.amountStaked), rewardRate: Number(position.rewardRate) });
});

router.post("/staking/positions/:positionId/unstake", async (req, res) => {
  const positionId = Number(req.params.positionId);
  const [position] = await db.select().from(stakingPositionsTable).where(eq(stakingPositionsTable.id, positionId)).limit(1);
  if (!position) { res.status(404).json({ error: "Position not found" }); return; }
  if (!position.isActive) { res.status(400).json({ error: "Position already unstaked" }); return; }
  const finalRewards = calcPendingRewards(position);
  await db.update(stakingPositionsTable).set({
    isActive: false,
    unstakedAt: new Date(),
    pendingRewards: "0",
    totalEarned: String(Number(position.totalEarned) + finalRewards),
  }).where(eq(stakingPositionsTable.id, positionId));
  if (finalRewards > 0) {
    await db.insert(rewardClaimsTable).values({
      userId: position.userId,
      positionId: position.id,
      amount: String(finalRewards),
      tokenType: position.rewardTokenType,
      source: "unstake",
    });
  }
  res.json({ positionId, amountReturned: Number(position.amountStaked), rewardsClaimed: finalRewards });
});

router.post("/staking/positions/:positionId/claim", async (req, res) => {
  const positionId = Number(req.params.positionId);
  const [position] = await db.select().from(stakingPositionsTable).where(eq(stakingPositionsTable.id, positionId)).limit(1);
  if (!position) { res.status(404).json({ error: "Position not found" }); return; }
  if (!position.isActive) { res.status(400).json({ error: "Position not active" }); return; }
  const rewards = calcPendingRewards(position);
  if (rewards <= 0) { res.status(400).json({ error: "No rewards to claim" }); return; }
  await db.update(stakingPositionsTable).set({
    pendingRewards: "0",
    totalEarned: String(Number(position.totalEarned) + rewards),
    lastClaimedAt: new Date(),
  }).where(eq(stakingPositionsTable.id, positionId));
  const [claim] = await db.insert(rewardClaimsTable).values({
    userId: position.userId,
    positionId: position.id,
    amount: String(rewards),
    tokenType: position.rewardTokenType,
    source: "manual_claim",
  }).returning();
  res.json({ ...claim, amount: Number(claim.amount) });
});

router.get("/staking/rates", async (_req, res) => {
  res.json(STAKING_RATES);
});

export default router;
