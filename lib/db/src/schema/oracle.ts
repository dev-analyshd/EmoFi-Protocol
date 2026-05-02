import { pgTable, text, serial, numeric, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const oracleFeedTypeEnum = pgEnum("oracle_feed_type", [
  "mood",
  "achievement",
  "talent_score",
  "intelligence_score",
  "spiritual_index",
  "situational_event",
]);

export const oracleFeedsTable = pgTable("oracle_feeds", {
  id: serial("id").primaryKey(),
  feedType: oracleFeedTypeEnum("feed_type").notNull(),
  userId: integer("user_id"),
  value: numeric("value", { precision: 10, scale: 4 }).notNull(),
  source: text("source").notNull(),
  verified: boolean("verified").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiRecommendationsTable = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  recommendationType: text("recommendation_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
  tokenType: text("token_type"),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOracleFeedSchema = createInsertSchema(oracleFeedsTable).omit({ id: true, createdAt: true });
export type InsertOracleFeed = z.infer<typeof insertOracleFeedSchema>;
export type OracleFeed = typeof oracleFeedsTable.$inferSelect;

export const insertAiRecommendationSchema = createInsertSchema(aiRecommendationsTable).omit({ id: true, createdAt: true });
export type InsertAiRecommendation = z.infer<typeof insertAiRecommendationSchema>;
export type AiRecommendation = typeof aiRecommendationsTable.$inferSelect;
