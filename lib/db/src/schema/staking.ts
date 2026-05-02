import { pgTable, text, serial, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tokenTypeEnum } from "./tokens";

export const stakingPositionsTable = pgTable("staking_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stakedTokenType: tokenTypeEnum("staked_token_type").notNull(),
  rewardTokenType: tokenTypeEnum("reward_token_type").notNull(),
  amountStaked: numeric("amount_staked", { precision: 18, scale: 6 }).notNull(),
  rewardRate: numeric("reward_rate", { precision: 10, scale: 6 }).notNull(),
  pendingRewards: numeric("pending_rewards", { precision: 18, scale: 6 }).notNull().default("0"),
  totalEarned: numeric("total_earned", { precision: 18, scale: 6 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastClaimedAt: timestamp("last_claimed_at"),
  unstakedAt: timestamp("unstaked_at"),
});

export const rewardClaimsTable = pgTable("reward_claims", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  positionId: integer("position_id"),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  source: text("source").notNull(),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

export const insertStakingPositionSchema = createInsertSchema(stakingPositionsTable).omit({ id: true, startedAt: true });
export type InsertStakingPosition = z.infer<typeof insertStakingPositionSchema>;
export type StakingPosition = typeof stakingPositionsTable.$inferSelect;

export const insertRewardClaimSchema = createInsertSchema(rewardClaimsTable).omit({ id: true, claimedAt: true });
export type InsertRewardClaim = z.infer<typeof insertRewardClaimSchema>;
export type RewardClaim = typeof rewardClaimsTable.$inferSelect;
