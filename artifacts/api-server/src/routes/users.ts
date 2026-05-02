import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, userTokenBalancesTable, vaultsTable, stakingPositionsTable, vaultTransactionsTable } from "@workspace/db";
import { CreateUserBody, GetUserParams, GetUserPortfolioParams, GetUserActivityParams } from "@workspace/api-zod";

const router = Router();

router.post("/users", async (req, res) => {
  const body = CreateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", message: body.error.message });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.walletAddress, body.data.walletAddress)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Wallet address already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values(body.data).returning();
  res.status(201).json(user);
});

router.get("/users/wallet/:address", async (req, res) => {
  const address = req.params.address?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/i.test(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, address)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found", message: "No user registered for this address" }); return; }
  res.json({ ...user, emoBalance: Number(user.emoBalance) });
});

router.get("/users/:userId", async (req, res) => {
  const params = GetUserParams.safeParse({ userId: Number(req.params.userId) });
  if (!params.success) { res.status(400).json({ error: "Invalid userId" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }
  res.json({
    ...user,
    emoBalance: Number(user.emoBalance),
    reputationScore: user.reputationScore,
  });
});

router.get("/users/:userId/portfolio", async (req, res) => {
  const params = GetUserPortfolioParams.safeParse({ userId: Number(req.params.userId) });
  if (!params.success) { res.status(400).json({ error: "Invalid userId" }); return; }
  const { userId } = params.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }
  const tokenBalances = await db.select().from(userTokenBalancesTable).where(eq(userTokenBalancesTable.userId, userId));
  const vaults = await db.select().from(vaultsTable).where(eq(vaultsTable.userId, userId));
  const stakingPositions = await db.select().from(stakingPositionsTable).where(eq(stakingPositionsTable.userId, userId));
  res.json({
    userId,
    emoBalance: Number(user.emoBalance),
    tokenBalances: tokenBalances.map(b => ({ tokenType: b.tokenType, balance: Number(b.balance), lockedBalance: Number(b.lockedBalance) })),
    vaults: vaults.map(v => ({ id: v.id, name: v.name, tokenType: v.tokenType, balance: Number(v.balance) })),
    stakingPositions: stakingPositions.map(p => ({ id: p.id, stakedTokenType: p.stakedTokenType, amountStaked: Number(p.amountStaked), pendingRewards: Number(p.pendingRewards), isActive: p.isActive })),
  });
});

router.get("/users/:userId/activity", async (req, res) => {
  const params = GetUserActivityParams.safeParse({ userId: Number(req.params.userId) });
  if (!params.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const activities = await db.select().from(vaultTransactionsTable)
    .where(eq(vaultTransactionsTable.userId, params.data.userId))
    .orderBy(desc(vaultTransactionsTable.createdAt))
    .limit(limit).offset(offset);
  res.json(activities.map(a => ({
    id: a.id,
    type: a.txType,
    tokenType: a.tokenType,
    amount: Number(a.amount),
    timestamp: a.createdAt,
    note: a.note,
  })));
});

export default router;
