import { pgTable, text, serial, numeric, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tokenTypeEnum = pgEnum("token_type", [
  "happiness",
  "sadness",
  "beautiful",
  "good_thought",
  "bad_thought",
  "intelligence",
  "talent",
  "spirituality",
  "situational",
]);

export const attributeTokensTable = pgTable("attribute_tokens", {
  id: serial("id").primaryKey(),
  tokenType: tokenTypeEnum("token_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  currentSupply: numeric("current_supply", { precision: 18, scale: 6 }).notNull().default("0"),
  maxSupply: numeric("max_supply", { precision: 18, scale: 6 }),
  priceEmo: numeric("price_emo", { precision: 18, scale: 6 }).notNull().default("1.000000"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  positiveAttribute: boolean("positive_attribute").notNull().default(true),
  totalStaked: numeric("total_staked", { precision: 18, scale: 6 }).notNull().default("0"),
  totalBurned: numeric("total_burned", { precision: 18, scale: 6 }).notNull().default("0"),
  volume24h: numeric("volume_24h", { precision: 18, scale: 6 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userTokenBalancesTable = pgTable("user_token_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  balance: numeric("balance", { precision: 18, scale: 6 }).notNull().default("0"),
  lockedBalance: numeric("locked_balance", { precision: 18, scale: 6 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAttributeTokenSchema = createInsertSchema(attributeTokensTable).omit({ id: true, updatedAt: true });
export type InsertAttributeToken = z.infer<typeof insertAttributeTokenSchema>;
export type AttributeToken = typeof attributeTokensTable.$inferSelect;

export const insertUserTokenBalanceSchema = createInsertSchema(userTokenBalancesTable).omit({ id: true, updatedAt: true });
export type InsertUserTokenBalance = z.infer<typeof insertUserTokenBalanceSchema>;
export type UserTokenBalance = typeof userTokenBalancesTable.$inferSelect;
