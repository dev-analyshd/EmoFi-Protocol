import { pgTable, text, serial, numeric, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proposalTypeEnum = pgEnum("proposal_type", [
  "new_attribute",
  "staking_adjustment",
  "marketplace_fee",
  "oracle_policy",
  "bear_market_incentive",
  "general",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "active",
  "passed",
  "rejected",
  "executed",
]);

export const governanceProposalsTable = pgTable("governance_proposals", {
  id: serial("id").primaryKey(),
  proposerId: integer("proposer_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  proposalType: proposalTypeEnum("proposal_type").notNull(),
  status: proposalStatusEnum("status").notNull().default("active"),
  forVotes: numeric("for_votes", { precision: 18, scale: 6 }).notNull().default("0"),
  againstVotes: numeric("against_votes", { precision: 18, scale: 6 }).notNull().default("0"),
  quorumRequired: numeric("quorum_required", { precision: 18, scale: 6 }).notNull().default("1000"),
  totalVoters: integer("total_voters").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
  executedAt: timestamp("executed_at"),
});

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  voterId: integer("voter_id").notNull(),
  support: boolean("support").notNull(),
  weight: numeric("weight", { precision: 18, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProposalSchema = createInsertSchema(governanceProposalsTable).omit({ id: true, createdAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof governanceProposalsTable.$inferSelect;

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
