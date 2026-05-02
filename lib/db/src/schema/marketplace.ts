import { pgTable, serial, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tokenTypeEnum } from "./tokens";

export const listingStatusEnum = pgEnum("listing_status", ["active", "sold", "cancelled"]);

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  remainingAmount: numeric("remaining_amount", { precision: 18, scale: 6 }).notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 18, scale: 6 }).notNull(),
  status: listingStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 18, scale: 6 }).notNull(),
  totalPrice: numeric("total_price", { precision: 18, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertListingSchema = createInsertSchema(marketplaceListingsTable).omit({ id: true, createdAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof marketplaceListingsTable.$inferSelect;

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
