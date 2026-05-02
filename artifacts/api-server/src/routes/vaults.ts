import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, vaultsTable, vaultTransactionsTable, usersTable, userTokenBalancesTable } from "@workspace/db";
import { CreateVaultBody, GetVaultTransactionsParams } from "@workspace/api-zod";

const router = Router();

router.get("/vaults", async (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const tokenType = req.query.tokenType as string | undefined;
  const conditions = [];
  if (userId) conditions.push(eq(vaultsTable.userId, userId));
  if (tokenType) conditions.push(eq(vaultsTable.tokenType, tokenType as any));
  const rows = conditions.length
    ? await db.select().from(vaultsTable).where(and(...conditions)).orderBy(desc(vaultsTable.createdAt))
    : await db.select().from(vaultsTable).orderBy(desc(vaultsTable.createdAt));
  res.json({ vaults: rows.map(v => ({ ...v, balance: Number(v.balance), stakedBalance: Number(v.stakedBalance), oracleScore: v.oracleScore ? Number(v.oracleScore) : null })), total: rows.length });
});

router.post("/vaults", async (req, res) => {
  const body = CreateVaultBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }
  const [vault] = await db.insert(vaultsTable).values({
    userId: body.data.userId,
    name: body.data.name,
    tokenType: body.data.tokenType as any,
    description: body.data.description ?? null,
    isPublic: body.data.isPublic ?? true,
  }).returning();
  res.status(201).json({ ...vault, balance: Number(vault.balance), stakedBalance: Number(vault.stakedBalance) });
});

router.get("/vaults/:vaultId", async (req, res) => {
  const vaultId = Number(req.params.vaultId);
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) { res.status(404).json({ error: "Not found", message: "Vault not found" }); return; }
  const [owner] = await db.select({ username: usersTable.username, walletAddress: usersTable.walletAddress }).from(usersTable).where(eq(usersTable.id, vault.userId)).limit(1);
  res.json({ ...vault, balance: Number(vault.balance), stakedBalance: Number(vault.stakedBalance), oracleScore: vault.oracleScore ? Number(vault.oracleScore) : null, owner: owner ?? null });
});

router.post("/vaults/:vaultId/mint", async (req, res) => {
  const vaultId = Number(req.params.vaultId);
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) { res.status(404).json({ error: "Not found", message: "Vault not found" }); return; }
  const amount = Number(req.body.amount ?? 0);
  if (!amount || amount <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
  const newBalance = Number(vault.balance) + amount;
  const [updated] = await db.update(vaultsTable).set({ balance: String(newBalance), updatedAt: new Date() }).where(eq(vaultsTable.id, vaultId)).returning();
  await db.insert(vaultTransactionsTable).values({ vaultId, userId: vault.userId, txType: "mint", tokenType: vault.tokenType, amount: String(amount), balanceAfter: String(newBalance) });
  res.json({ ...updated, balance: Number(updated.balance), newBalance });
});

router.post("/vaults/:vaultId/burn", async (req, res) => {
  const vaultId = Number(req.params.vaultId);
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) { res.status(404).json({ error: "Not found", message: "Vault not found" }); return; }
  const amount = Number(req.body.amount ?? 0);
  if (!amount || amount <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
  if (Number(vault.balance) < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }
  const newBalance = Number(vault.balance) - amount;
  const [updated] = await db.update(vaultsTable).set({ balance: String(newBalance), updatedAt: new Date() }).where(eq(vaultsTable.id, vaultId)).returning();
  await db.insert(vaultTransactionsTable).values({ vaultId, userId: vault.userId, txType: "burn", tokenType: vault.tokenType, amount: String(amount), balanceAfter: String(newBalance) });
  res.json({ ...updated, balance: Number(updated.balance), newBalance });
});

router.get("/vaults/:vaultId/transactions", async (req, res) => {
  const vaultId = Number(req.params.vaultId);
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const txs = await db.select().from(vaultTransactionsTable)
    .where(eq(vaultTransactionsTable.vaultId, vaultId))
    .orderBy(desc(vaultTransactionsTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(txs.map(t => ({ ...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter) })));
});

export default router;
