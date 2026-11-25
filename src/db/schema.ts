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

// Kontör (src/lib/credits.ts): one balance per user, every firm draws on it. Changed only together with a credit_ledger row.
export const creditBalances = pgTable("credit_balances", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
}, () => [ownerPolicy("credit_balances_owner")]);

// Every change to a balance: a purchase (+), a read document (-1 or -2). The per-firm usage and any dispute are read from here.
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firmId: uuid("firm_id"),
  receiptId: uuid("receipt_id"),
  paymentId: uuid("payment_id"),
  delta: integer("delta").notNull(),
  reason: text("reason", { enum: ["purchase", "receipt", "invoice"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("credit_ledger_user_created_idx").on(t.userId, t.createdAt),
  ownerPolicy("credit_ledger_owner"),
]);

// What the buyer's invoice is made out to; iyzico requires a name, an identity number, a phone and an address too.
export const billingProfiles = pgTable("billing_profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  taxNumber: text("tax_number").notNull(),
  taxOffice: text("tax_office"),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [ownerPolicy("billing_profiles_owner")]);

// One iyzico checkout. Kept when the account is deleted: a sale's record must be kept by law (VUK). Credited once: only the
// pending -> paid update adds the credits, so a callback that arrives twice never pays twice.
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  packageId: text("package_id").notNull(),
  credits: integer("credits").notNull(),
  amountKurus: integer("amount_kurus").notNull(),
  status: text("status", { enum: ["pending", "paid", "failed"] }).notNull().default("pending"),
  token: text("token"),
  providerPaymentId: text("provider_payment_id"),
  billing: jsonb("billing").notNull(),
  // The Kullanım Koşulları version shown beside the pay button (TERMS_VERSION): what the buyer accepted by paying.
  termsVersion: text("terms_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("payments_token_idx").on(t.token),
  index("payments_user_created_idx").on(t.userId, t.createdAt),
  ownerPolicy("payments_owner"),
]);

// e-Tebligat list rows the extension read from the user's own Dijital Vergi Dairesi session (docs/e-tebligat-arastirma-plan.md).
// Only the list's header fields: the envelope is never opened, nothing of the document is kept. seen_at null = new to the user.
export const taxNotices = pgTable("tax_notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firmId: uuid("firm_id").notNull().references(() => firms.id),
  // GİB's tarafId: one notice to this taxpayer.
  gibId: text("gib_id").notNull(),
  institution: text("institution").notNull(),
  subUnit: text("sub_unit"),
  docType: text("doc_type"),
  docNo: text("doc_no"),
  // As GİB writes them (dd/mm/yyyy...), shown as they are.
  sentAt: text("sent_at"),
  servedAt: text("served_at"),
  readOnGib: boolean("read_on_gib").notNull().default(false),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  seenAt: timestamp("seen_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("tax_notices_firm_gib_idx").on(t.firmId, t.gibId),
  index("tax_notices_user_idx").on(t.userId, t.firstSeenAt),
  // The menu's count of new notices runs on every panel page.
  index("tax_notices_new_idx").on(t.userId).where(sql`${t.seenAt} is null`),
  ownerPolicy("tax_notices_owner"),
]);

// When a firm's e-Tebligat list was last read. A firm's first read is the baseline (only GİB-unread notices count as new).
export const noticeScans = pgTable("notice_scans", {
  firmId: uuid("firm_id").primaryKey().references(() => firms.id),
  userId: text("user_id").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("notice_scans_user_idx").on(t.userId),
  ownerPolicy("notice_scans_owner"),
]);

// A firm's Dijital Vergi Dairesi login (kullanıcı kodu, şifre), read once from the müşavir's Luca when firms are imported, for the
// e-Tebligat scan. Sealed with AES-256-GCM (src/lib/gib/secret.ts); the key lives only in the server's environment. Each value is
// bound to its user, firm and field, so a row copied elsewhere does not open. Unsealed one firm at a time, only while the user's
// own approval (gib_scan_grants) runs, and every unsealing is written to gib_login_reads.
export const gibLogins = pgTable("gib_logins", {
  firmId: uuid("firm_id").primaryKey().references(() => firms.id),
  userId: text("user_id").notNull(),
  usernameSealed: text("username_sealed").notNull(),
  passwordSealed: text("password_sealed").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("gib_logins_user_idx").on(t.userId),
  ownerPolicy("gib_logins_owner"),
]);

// Until when the user allowed the extension to unseal GİB logins: given from the signed-in site (fresh sign-in), a few hours.
// Bound to the network it was given from (keyed hash) and to the user's one extension key, and sealed with a MAC under the
// server's key: a row written into the database without that key, used from another network or with another key, opens nothing.
export const gibScanGrants = pgTable("gib_scan_grants", {
  userId: text("user_id").primaryKey(),
  until: timestamp("until", { withTimezone: true }).notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  network: text("network").notNull(),
  // The one extension key the user had when approving: a key added to the database later opens nothing with this approval.
  tokenHash: text("token_hash").notNull(),
  mac: text("mac").notNull(),
  // The firms (Luca ids) the user chose to scan; null: every firm with a stored login. Outside the MAC on purpose: it can only
  // narrow the approval, and a null written into the database opens no more than the approval already does.
  firms: text("firms").array(),
}, () => [ownerPolicy("gib_scan_grants_owner")]);

// Every unsealing of a GİB login: which firm, when, from which network (hashed). Shown to the user; never holds the login.
export const gibLoginReads = pgTable("gib_login_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firmId: uuid("firm_id").notNull().references(() => firms.id),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  network: text("network"),
}, (t) => [
  index("gib_login_reads_user_idx").on(t.userId, t.readAt),
  ownerPolicy("gib_login_reads_owner"),
]);
