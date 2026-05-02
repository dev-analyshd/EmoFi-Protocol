import { pgTable, text, serial, numeric, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tokenTypeEnum } from "./tokens";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "mint",
  "burn",
  "stake",
  "unstake",
  "transfer",
  "buy",
  "sell",
]);

export const vaultsTable = pgTable("vaults", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  description: text("description"),
  balance: numeric("balance", { precision: 18, scale: 6 }).notNull().default("0"),
  stakedBalance: numeric("staked_balance", { precision: 18, scale: 6 }).notNull().default("0"),
  oracleScore: numeric("oracle_score", { precision: 5, scale: 2 }),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vaultTransactionsTable = pgTable("vault_transactions", {
  id: serial("id").primaryKey(),
  vaultId: integer("vault_id").notNull(),
  userId: integer("user_id").notNull(),
  txType: transactionTypeEnum("tx_type").notNull(),
  tokenType: tokenTypeEnum("token_type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 18, scale: 6 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVaultSchema = createInsertSchema(vaultsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVault = z.infer<typeof insertVaultSchema>;
export type Vault = typeof vaultsTable.$inferSelect;

export const insertVaultTransactionSchema = createInsertSchema(vaultTransactionsTable).omit({ id: true, createdAt: true });
export type InsertVaultTransaction = z.infer<typeof insertVaultTransactionSchema>;
export type VaultTransaction = typeof vaultTransactionsTable.$inferSelect;
