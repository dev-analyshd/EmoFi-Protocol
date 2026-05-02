import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, attributeTokensTable } from "@workspace/db";

const router = Router();

router.get("/tokens", async (_req, res) => {
  const tokens = await db.select().from(attributeTokensTable).orderBy(attributeTokensTable.id);
  res.json(tokens.map(t => ({
    tokenType: t.tokenType,
    name: t.name,
    description: t.description,
    currentSupply: Number(t.currentSupply),
    maxSupply: t.maxSupply ? Number(t.maxSupply) : null,
    priceEmo: Number(t.priceEmo),
    color: t.color,
    icon: t.icon,
    positiveAttribute: t.positiveAttribute,
    totalStaked: Number(t.totalStaked),
    totalBurned: Number(t.totalBurned),
    volume24h: Number(t.volume24h),
  })));
});

router.get("/tokens/:tokenType", async (req, res) => {
  const [token] = await db.select().from(attributeTokensTable)
    .where(eq(attributeTokensTable.tokenType, req.params.tokenType as any))
    .limit(1);
  if (!token) { res.status(404).json({ error: "Not found", message: "Token type not found" }); return; }
  res.json({
    tokenType: token.tokenType,
    name: token.name,
    description: token.description,
    currentSupply: Number(token.currentSupply),
    maxSupply: token.maxSupply ? Number(token.maxSupply) : null,
    priceEmo: Number(token.priceEmo),
    color: token.color,
    icon: token.icon,
    positiveAttribute: token.positiveAttribute,
    totalStaked: Number(token.totalStaked),
    totalBurned: Number(token.totalBurned),
    volume24h: Number(token.volume24h),
  });
});

export default router;
