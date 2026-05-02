import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, usersTable, userTokenBalancesTable, vaultsTable, stakingPositionsTable, governanceProposalsTable, marketplaceListingsTable, tradesTable, attributeTokensTable } from "@workspace/db";

const router = Router();

router.get("/dashboard/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const tokenBalances = await db.select().from(userTokenBalancesTable).where(eq(userTokenBalancesTable.userId, userId));
  const userVaults = await db.select().from(vaultsTable).where(eq(vaultsTable.userId, userId));
  const activeStaking = await db.select().from(stakingPositionsTable).where(eq(stakingPositionsTable.userId, userId)).then(rows => rows.filter(r => r.isActive));
  const activeProposals = await db.select().from(governanceProposalsTable).where(eq(governanceProposalsTable.status, "active")).orderBy(desc(governanceProposalsTable.createdAt)).limit(3);
  const recentTrades = await db.select().from(tradesTable).where(eq(tradesTable.buyerId, userId)).orderBy(desc(tradesTable.createdAt)).limit(5);
  const totalStaked = activeStaking.reduce((sum, p) => sum + Number(p.amountStaked), 0);
  const totalPendingRewards = activeStaking.reduce((sum, p) => {
    const lastTime = p.lastClaimedAt ?? p.startedAt;
    const elapsedDays = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60 * 24);
    return sum + Number(p.amountStaked) * Number(p.rewardRate) * elapsedDays + Number(p.pendingRewards);
  }, 0);
  const totalVaultValue = userVaults.reduce((sum, v) => sum + Number(v.balance), 0);
  res.json({
    userId,
    emoBalance: Number(user.emoBalance),
    reputationScore: user.reputationScore,
    tokenBalances: tokenBalances.map(b => ({ tokenType: b.tokenType, balance: Number(b.balance), lockedBalance: Number(b.lockedBalance) })),
    vaults: userVaults.map(v => ({ id: v.id, name: v.name, tokenType: v.tokenType, balance: Number(v.balance), stakedBalance: Number(v.stakedBalance) })),
    stakingPositions: activeStaking.map(p => ({ id: p.id, stakedTokenType: p.stakedTokenType, rewardTokenType: p.rewardTokenType, amountStaked: Number(p.amountStaked), pendingRewards: Number(p.pendingRewards), isActive: p.isActive })),
    activeProposals: activeProposals.map(p => ({ id: p.id, title: p.title, status: p.status, forVotes: Number(p.forVotes), againstVotes: Number(p.againstVotes), endsAt: p.endsAt })),
    recentTrades: recentTrades.map(t => ({ id: t.id, tokenType: t.tokenType, amount: Number(t.amount), totalPrice: Number(t.totalPrice), createdAt: t.createdAt })),
    summary: { totalVaultValue, totalStaked, totalPendingRewards, activeVaults: userVaults.length, activePositions: activeStaking.length },
  });
});

router.get("/stats", async (_req, res) => {
  const tokens = await db.select().from(attributeTokensTable);
  const users = await db.select({ count: sql<number>`COUNT(*)` }).from(usersTable);
  const vaults = await db.select({ count: sql<number>`COUNT(*)` }).from(vaultsTable);
  const trades = await db.select().from(tradesTable);
  const activeStaking = await db.select({ count: sql<number>`COUNT(*)` }).from(stakingPositionsTable).where(eq(stakingPositionsTable.isActive, true));
  const totalVolume = trades.reduce((sum, t) => sum + Number(t.totalPrice), 0);
  const tokenSupplies = tokens.map(t => ({ tokenType: t.tokenType, supply: Number(t.currentSupply), totalStaked: Number(t.totalStaked) }));
  res.json({
    totalUsers: Number(users[0]?.count ?? 0),
    totalVaults: Number(vaults[0]?.count ?? 0),
    totalVolume,
    totalTrades: trades.length,
    activeStakingPositions: Number(activeStaking[0]?.count ?? 0),
    tokenSupplies,
  });
});

export default router;
