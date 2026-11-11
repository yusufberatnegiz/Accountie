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

// A mükellef the user keeps books for (a müşavir has hundreds). Receipts belong to one; its own rules (firm_rules) lie over the user's.
export const firms = pgTable("firms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  taxNumber: text("tax_number"),
  // Luca's own id for the firm (SIRKET_ID), set when the extension imports it; matches a re-import when the VKN is missing.
  lucaSirketId: text("luca_sirket_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("firms_user_name_idx").on(t.userId, t.name),
  ownerPolicy("firms_owner"),
]);

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  // Null only on receipts saved before firms existed; the app moves them to the user's first firm (queries.ts listFirms).
  firmId: uuid("firm_id").references(() => firms.id),
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
  index("receipts_firm_created_idx").on(t.firmId, t.createdAt),
  // From the removed e-Fatura import: an invoice was saved once even when two uploads raced; old rows keep it, photos are not limited.
  uniqueIndex("receipts_efatura_once_idx").on(t.userId, t.taxNumber, t.receiptNo, t.receiptDate).where(sql`model = 'e-fatura' and tax_number is not null`),
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
  kind: text("kind", { enum: ["expense", "vat", "payment", "setting", "foreign", "sales"] }).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
}, (t) => [
  uniqueIndex("account_rules_user_kind_key_idx").on(t.userId, t.kind, t.key),
  ownerPolicy("account_rules_owner"),
]);

// A firm's own rules, laid over the user's account_rules: the same kinds and keys, with the codes of that firm's Luca plan.
export const firmRules = pgTable("firm_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firmId: uuid("firm_id").notNull().references(() => firms.id),
  kind: text("kind", { enum: ["expense", "vat", "payment", "setting", "foreign", "sales"] }).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
}, (t) => [
  uniqueIndex("firm_rules_firm_kind_key_idx").on(t.firmId, t.kind, t.key),
  index("firm_rules_user_idx").on(t.userId),
  ownerPolicy("firm_rules_owner"),
]);

// The firm's chart of accounts as Luca lists it (codes differ per müşavir and per firm); replaced whole on each import.
export const firmAccounts = pgTable("firm_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firmId: uuid("firm_id").notNull().references(() => firms.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
}, (t) => [
  uniqueIndex("firm_accounts_firm_code_idx").on(t.firmId, t.code),
  index("firm_accounts_user_idx").on(t.userId),
  ownerPolicy("firm_accounts_owner"),
]);

// Chrome extension access. Only the SHA-256 of the token is stored; one live token per user, short expiry.
export const extensionTokens = pgTable("extension_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [
  uniqueIndex("extension_tokens_hash_idx").on(t.tokenHash),
  index("extension_tokens_user_idx").on(t.userId),
  ownerPolicy("extension_tokens_owner"),
]);

// Shared rate-limit counter (serverless instances share no memory). Keys hold only hashes, never e-mail or IP in clear.
// Server-only: the policy denies every non-owner role, so the Data API can never read it.
export const rateLimitHits = pgTable("rate_limit_hits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("rate_limit_hits_key_created_idx").on(t.key, t.createdAt),
  index("rate_limit_hits_created_idx").on(t.createdAt), // the sweep of rows older than a day
  pgPolicy("rate_limit_hits_server_only", { for: "all", using: sql`false`, withCheck: sql`false` }),
]);

// What a firm's approvals taught: this seller (VKN) goes to this expense account instead of its category's. Learned only when
// the approved account differs from the category rule, and forgotten when an approval goes back to it.
export const vendorRules = pgTable("vendor_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firmId: uuid("firm_id").notNull().references(() => firms.id),
  taxNumber: text("tax_number").notNull(),
  vendorName: text("vendor_name"),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("vendor_rules_firm_tax_idx").on(t.firmId, t.taxNumber),
  index("vendor_rules_user_idx").on(t.userId),
  ownerPolicy("vendor_rules_owner"),
]);
