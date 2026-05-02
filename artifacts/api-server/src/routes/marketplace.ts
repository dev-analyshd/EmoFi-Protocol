import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, marketplaceListingsTable, tradesTable, usersTable, attributeTokensTable } from "@workspace/db";
import { CreateListingBody, BuyListingBody, CancelListingBody } from "@workspace/api-zod";

const router = Router();

router.get("/marketplace/listings", async (req, res) => {
  const status = (req.query.status as string) || "active";
  const tokenType = req.query.tokenType as string | undefined;
  const conditions = [eq(marketplaceListingsTable.status, status as any)];
  if (tokenType) conditions.push(eq(marketplaceListingsTable.tokenType, tokenType as any));
  const rows = await db.select().from(marketplaceListingsTable).where(and(...conditions)).orderBy(desc(marketplaceListingsTable.createdAt)).limit(50);
  res.json({
    listings: rows.map(l => ({ ...l, amount: Number(l.amount), remainingAmount: Number(l.remainingAmount), pricePerUnit: Number(l.pricePerUnit) })),
    total: rows.length,
  });
});

router.post("/marketplace/listings", async (req, res) => {
  const body = CreateListingBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.sellerId)).limit(1);
  if (!seller) { res.status(404).json({ error: "Not found", message: "Seller not found" }); return; }
  const [listing] = await db.insert(marketplaceListingsTable).values({
    sellerId: body.data.sellerId,
    tokenType: body.data.tokenType as any,
    amount: String(body.data.amount),
    remainingAmount: String(body.data.amount),
    pricePerUnit: String(body.data.pricePerUnit),
    expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
  }).returning();
  res.status(201).json({ ...listing, amount: Number(listing.amount), remainingAmount: Number(listing.remainingAmount), pricePerUnit: Number(listing.pricePerUnit) });
});

router.get("/marketplace/listings/:listingId", async (req, res) => {
  const [listing] = await db.select().from(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, Number(req.params.listingId))).limit(1);
  if (!listing) { res.status(404).json({ error: "Not found", message: "Listing not found" }); return; }
  res.json({ ...listing, amount: Number(listing.amount), remainingAmount: Number(listing.remainingAmount), pricePerUnit: Number(listing.pricePerUnit) });
});

router.post("/marketplace/listings/:listingId/buy", async (req, res) => {
  const body = BuyListingBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request", message: body.error.message }); return; }
  const listingId = Number(req.params.listingId);
  const [listing] = await db.select().from(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, listingId)).limit(1);
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  if (listing.status !== "active") { res.status(400).json({ error: "Listing not active" }); return; }
  const amount = body.data.amount;
  if (Number(listing.remainingAmount) < amount) { res.status(400).json({ error: "Insufficient remaining amount" }); return; }
  const remaining = Number(listing.remainingAmount) - amount;
  const newStatus = remaining <= 0 ? "sold" : "active";
  await db.update(marketplaceListingsTable).set({ remainingAmount: String(remaining), status: newStatus as any }).where(eq(marketplaceListingsTable.id, listingId));
  const pricePerUnit = Number(listing.pricePerUnit);
  const totalPrice = pricePerUnit * amount;
  const [trade] = await db.insert(tradesTable).values({
    listingId,
    buyerId: body.data.buyerId,
    sellerId: listing.sellerId,
    tokenType: listing.tokenType,
    amount: String(amount),
    pricePerUnit: String(pricePerUnit),
    totalPrice: String(totalPrice),
  }).returning();
  await db.update(attributeTokensTable).set({ volume24h: sql`volume_24h + ${String(totalPrice)}` }).where(eq(attributeTokensTable.tokenType, listing.tokenType));
  res.json({ ...trade, amount: Number(trade.amount), pricePerUnit: Number(trade.pricePerUnit), totalPrice: Number(trade.totalPrice) });
});

router.post("/marketplace/listings/:listingId/cancel", async (req, res) => {
  const listingId = Number(req.params.listingId);
  const [listing] = await db.select().from(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, listingId)).limit(1);
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  if (listing.status !== "active") { res.status(400).json({ error: "Listing not active" }); return; }
  await db.update(marketplaceListingsTable).set({ status: "cancelled" }).where(eq(marketplaceListingsTable.id, listingId));
  res.json({ success: true });
});

router.get("/marketplace/stats", async (_req, res) => {
  const trades = await db.select().from(tradesTable);
  const totalVolume = trades.reduce((sum, t) => sum + Number(t.totalPrice), 0);
  const totalTrades = trades.length;
  const tokenVolumes: Record<string, number> = {};
  for (const t of trades) {
    tokenVolumes[t.tokenType] = (tokenVolumes[t.tokenType] ?? 0) + Number(t.totalPrice);
  }
  const activeListings = await db.select().from(marketplaceListingsTable).where(eq(marketplaceListingsTable.status, "active"));
  res.json({ totalVolume, totalTrades, activeListings: activeListings.length, tokenVolumes: Object.entries(tokenVolumes).map(([tokenType, volume]) => ({ tokenType, volume })) });
});

export default router;
