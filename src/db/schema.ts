// New tables only. The live database also holds older app tables (profiles, notes, favorites...); never touch them.
import { sql } from "drizzle-orm";
import { bigint, boolean, date, index, integer, jsonb, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Warning } from "@/lib/journal";

// Defense in depth: the app connects as table owner (bypasses RLS), so every query also filters by user_id.
const ownerPolicy = (name: string) => pgPolicy(name, {
  for: "all",
  using: sql`user_id = current_setting('app.user_id', true)`,
  withCheck: sql`user_id = current_setting('app.user_id', true)`,
});

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  status: text("status", { enum: ["draft", "approved", "exported"] }).notNull().default("draft"),
  vendorName: text("vendor_name"),
  taxNumber: text("tax_number"),
  receiptNo: text("receipt_no"),
  receiptDate: date("receipt_date"),
  totalKurus: bigint("total_kurus", { mode: "number" }),
  paymentMethod: text("payment_method"),
  category: text("category"),
  extraction: jsonb("extraction"),
  warnings: jsonb("warnings").$type<Warning[]>().notNull().default([]),
  model: text("model"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  exportedAt: timestamp("exported_at", { withTimezone: true }),
}, (t) => [
  index("receipts_user_created_idx").on(t.userId, t.createdAt),
  ownerPolicy("receipts_owner"),
]);

export const journalLines = pgTable("journal_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptId: uuid("receipt_id").notNull().references(() => receipts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  lineNo: integer("line_no").notNull(),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  debitKurus: bigint("debit_kurus", { mode: "number" }).notNull().default(0),
  creditKurus: bigint("credit_kurus", { mode: "number" }).notNull().default(0),
  description: text("description").notNull(),
  documentNo: text("document_no").notNull(),
  documentDate: date("document_date"),
  documentType: text("document_type").notNull(),
  quantity: integer("quantity").notNull().default(0),
  babs: boolean("babs").notNull().default(false),
}, (t) => [
  index("journal_lines_receipt_idx").on(t.receiptId, t.lineNo),
  ownerPolicy("journal_lines_owner"),
]);

export const accountRules = pgTable("account_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  kind: text("kind", { enum: ["expense", "vat", "payment", "setting"] }).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
}, (t) => [
  uniqueIndex("account_rules_user_kind_key_idx").on(t.userId, t.kind, t.key),
  ownerPolicy("account_rules_owner"),
]);
