import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, oracleFeedsTable, aiRecommendationsTable, usersTable } from "@workspace/db";
import { SubmitOracleFeedBody } from "@workspace/api-zod";

const router = Router();

router.get("/oracle/feeds", async (req, res) => {
  const feedType = req.query.feedType as string | undefined;
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  let rows;
  if (feedType && userId) {
    rows = await db.select().from(oracleFeedsTable).where(eq(oracleFeedsTable.feedType, feedType as any)).orderBy(desc(oracleFeedsTable.createdAt)).limit(50);
  } else if (feedType) {
    rows = await db.select().from(oracleFeedsTable).where(eq(oracleFeedsTable.feedType, feedType as any)).orderBy(desc(oracleFeedsTable.createdAt)).limit(50);
  } else if (userId) {
    rows = await db.select().from(oracleFeedsTable).where(eq(oracleFeedsTable.userId, userId)).orderBy(desc(oracleFeedsTable.createdAt)).limit(50);
  } else {
    rows = await db.select().from(oracleFeedsTable).orderBy(desc(oracleFeedsTable.createdAt)).limit(50);
  }
  res.json(rows.map(f => ({ ...f, value: Number(f.value) })));
});

router.post("/oracle/feeds", async (req, res) => {
  const body = SubmitOracleFeedBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const [feed] = await db.insert(oracleFeedsTable).values({
    feedType: body.data.feedType as any,
    userId: body.data.userId ?? null,
    value: String(body.data.value),
    source: body.data.source,
    metadata: body.data.metadata ?? null,
    verified: false,
  }).returning();
  res.status(201).json({ ...feed, value: Number(feed.value) });
});

router.get("/ai/recommendations/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const stored = await db.select().from(aiRecommendationsTable).where(eq(aiRecommendationsTable.userId, userId)).orderBy(desc(aiRecommendationsTable.createdAt)).limit(10);
  if (stored.length > 0) {
    res.json(stored.map(r => ({ ...r, confidence: Number(r.confidence) })));
    return;
  }
  const generated = [
    { userId, recommendationType: "stake", title: "Stake your Happiness tokens", description: "Your Happiness balance is growing. Stake now to earn Beautiful tokens at 36.5% APY.", confidence: "0.92", tokenType: "happiness", actionUrl: "/staking" },
    { userId, recommendationType: "mint", title: "Mint Intelligence tokens", description: "Your oracle score suggests high cognitive engagement. Mint Intelligence to boost your vault.", confidence: "0.87", tokenType: "intelligence", actionUrl: "/vaults" },
    { userId, recommendationType: "vote", title: "Vote on Bear Market Incentive Proposal", description: "An active governance proposal could boost staking rewards by 2x during market downturns.", confidence: "0.78", tokenType: null, actionUrl: "/governance" },
  ];
  const inserted = await db.insert(aiRecommendationsTable).values(generated).returning();
  res.json(inserted.map(r => ({ ...r, confidence: Number(r.confidence) })));
});

export default router;
