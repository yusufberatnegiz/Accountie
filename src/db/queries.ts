// The only module that talks to the database. Every function takes the session user's id and filters by it.
import { and, asc, count, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { DEFAULT_RULES, rulesFromRows, rulesToRows, type RuleRow, type Rules } from "@/lib/default-rules";
import type { JournalLine, Warning } from "@/lib/journal";
import { getDb } from "./index";
import { accountRules, extensionTokens, journalLines, rateLimitHits, receipts } from "./schema";

export type ReceiptStatus = "draft" | "approved" | "exported";

export type NewReceipt = {
  vendorName: string | null;
  taxNumber: string | null;
  receiptNo: string | null;
  receiptDate: string | null;
  totalKurus: number | null;
  paymentMethod: string | null;
  category: string | null;
  extraction: unknown;
  warnings: Warning[];
  model: string | null;
  inputTokens: number;
  outputTokens: number;
};

const lineColumns = {
  accountCode: journalLines.accountCode,
  accountName: journalLines.accountName,
  debitKurus: journalLines.debitKurus,
  creditKurus: journalLines.creditKurus,
  description: journalLines.description,
  documentNo: journalLines.documentNo,
  documentDate: journalLines.documentDate,
  documentType: journalLines.documentType,
  quantity: journalLines.quantity,
  babs: journalLines.babs,
};

const summaryColumns = {
  id: receipts.id,
  status: receipts.status,
  vendorName: receipts.vendorName,
  receiptNo: receipts.receiptNo,
  receiptDate: receipts.receiptDate,
  totalKurus: receipts.totalKurus,
  createdAt: receipts.createdAt,
};

const lineRows = (userId: string, receiptId: string, lines: readonly JournalLine[]) =>
  lines.map((l, i) => ({ ...l, userId, receiptId, lineNo: i + 1 }));

export async function getRules(userId: string): Promise<{ rules: Rules; rows: RuleRow[] }> {
  const db = getDb();
  let rows: RuleRow[] = await db.select({ kind: accountRules.kind, key: accountRules.key, label: accountRules.label, accountCode: accountRules.accountCode, accountName: accountRules.accountName })
    .from(accountRules).where(eq(accountRules.userId, userId));
  if (rows.length === 0) {
    rows = rulesToRows(DEFAULT_RULES);
    await db.insert(accountRules).values(rows.map((r) => ({ ...r, userId }))).onConflictDoNothing();
  }
  return { rules: rulesFromRows(rows), rows };
}

export async function saveRules(userId: string, rows: readonly RuleRow[]): Promise<void> {
  const db = getDb();
  const [first, ...rest] = rows.map((r) =>
    db.insert(accountRules).values({ ...r, userId })
      .onConflictDoUpdate({ target: [accountRules.userId, accountRules.kind, accountRules.key], set: { accountCode: r.accountCode, accountName: r.accountName, label: r.label } }));
  if (first) await db.batch([first, ...rest]);
}

/**
 * Records one attempt for `key` and says whether every `[limit, windowMs]` still holds.
 * The attempt is stored before the work starts, so parallel requests count against each other.
 */
export async function hitRateLimit(key: string, windows: readonly (readonly [limit: number, windowMs: number])[]): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const counts = windows.map(([, ms]) =>
    db.select({ n: count() }).from(rateLimitHits).where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.createdAt, new Date(now - ms)))));
  const [, , ...results] = await db.batch([
    // Global sweep so one-off keys (other e-mails/IPs) do not pile up; no LIMITS window is longer than a day.
    // shortcut: no index on created_at alone, so this scans the (one day of hits) table; add one if it grows large.
    db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, new Date(now - 24 * 60 * 60_000))),
    db.insert(rateLimitHits).values({ key }),
    ...counts,
  ]);
  return windows.every(([limit], i) => ((results[i] as { n: number }[])[0]?.n ?? 0) <= limit);
}

export async function createReceipt(userId: string, receipt: NewReceipt, lines: readonly JournalLine[]): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(receipts).values({ ...receipt, id, userId }),
    db.insert(journalLines).values(lineRows(userId, id, lines)),
  ]);
  return id;
}

/** Same seller, receipt number and date already saved by this user: the same paper receipt photographed twice. */
export async function hasDuplicateReceipt(userId: string, taxNumber: string, receiptNo: string, receiptDate: string): Promise<boolean> {
  const rows = await getDb().select({ id: receipts.id }).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(receipts.taxNumber, taxNumber), eq(receipts.receiptNo, receiptNo), eq(receipts.receiptDate, receiptDate)))
    .limit(1);
  return rows.length > 0;
}

// The list shows each receipt's expense account (first debit line that is not VAT) and its line count (for Luca's 400-line file limit).
const listColumns = {
  ...summaryColumns,
  warnings: receipts.warnings,
  expenseCode: sql<string | null>`(select jl.account_code from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.debit_kurus > 0 and jl.account_code not like '191%' order by jl.line_no limit 1)`,
  lineCount: sql<number>`(select count(*)::int from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId})`,
  // Debits as they go to Luca: the expense side (matrah) and the 191 VAT side, so the list never sums gross amounts into 770.
  expenseKurus: sql<number>`(select coalesce(sum(jl.debit_kurus), 0)::int from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.account_code not like '191%')`,
  vatKurus: sql<number>`(select coalesce(sum(jl.debit_kurus), 0)::int from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.account_code like '191%')`,
};

export async function listReceipts(userId: string, status?: ReceiptStatus) {
  return getDb().select(listColumns).from(receipts)
    .where(status ? and(eq(receipts.userId, userId), eq(receipts.status, status)) : eq(receipts.userId, userId))
    .orderBy(desc(receipts.createdAt)).limit(200);
}

export async function getReceipt(userId: string, id: string) {
  const db = getDb();
  const [receipt] = await db.select({ ...summaryColumns, taxNumber: receipts.taxNumber, paymentMethod: receipts.paymentMethod, category: receipts.category, warnings: receipts.warnings })
    .from(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
  if (!receipt) return null;
  const lines: JournalLine[] = await db.select(lineColumns).from(journalLines)
    .where(and(eq(journalLines.receiptId, id), eq(journalLines.userId, userId))).orderBy(asc(journalLines.lineNo));
  return { ...receipt, lines };
}

export type ReceiptDetail = NonNullable<Awaited<ReturnType<typeof getReceipt>>>;

/** Replaces all lines of a draft. Caller must have checked the receipt is the user's draft. */
export async function replaceLines(userId: string, id: string, lines: readonly JournalLine[]): Promise<void> {
  const db = getDb();
  await db.batch([
    db.delete(journalLines).where(and(eq(journalLines.receiptId, id), eq(journalLines.userId, userId))),
    db.insert(journalLines).values(lineRows(userId, id, lines)),
  ]);
}

/** Moves one receipt between states; false when it is not the user's or not in `from`. */
export async function transitionReceipt(userId: string, id: string, from: ReceiptStatus, to: ReceiptStatus): Promise<boolean> {
  const rows = await getDb().update(receipts)
    .set({ status: to, approvedAt: to === "approved" ? new Date() : to === "draft" ? null : undefined })
    .where(and(eq(receipts.id, id), eq(receipts.userId, userId), eq(receipts.status, from)))
    .returning({ id: receipts.id });
  return rows.length > 0;
}

export async function deleteDraft(userId: string, id: string): Promise<boolean> {
  const rows = await getDb().delete(receipts)
    .where(and(eq(receipts.id, id), eq(receipts.userId, userId), eq(receipts.status, "draft")))
    .returning({ id: receipts.id });
  return rows.length > 0;
}

/** Approved receipts (or the given approved/exported ones) with their lines, oldest first. */
export async function listForExport(userId: string, ids?: readonly string[]) {
  const db = getDb();
  const rows = await db.select({ id: receipts.id }).from(receipts)
    .where(ids?.length
      ? and(eq(receipts.userId, userId), inArray(receipts.id, [...ids]), inArray(receipts.status, ["approved", "exported"]))
      : and(eq(receipts.userId, userId), eq(receipts.status, "approved")))
    .orderBy(asc(receipts.receiptDate), asc(receipts.createdAt));
  if (rows.length === 0) return [];
  const lines = await db.select({ ...lineColumns, receiptId: journalLines.receiptId }).from(journalLines)
    .where(and(eq(journalLines.userId, userId), inArray(journalLines.receiptId, rows.map((r) => r.id))))
    .orderBy(asc(journalLines.lineNo));
  return rows.map((r) => ({ id: r.id, lines: lines.filter((l) => l.receiptId === r.id).map(({ receiptId, ...l }) => l) }));
}

export async function markExported(userId: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().update(receipts).set({ status: "exported", exportedAt: new Date() })
    .where(and(eq(receipts.userId, userId), inArray(receipts.id, [...ids]), inArray(receipts.status, ["approved", "exported"])));
}

/** Replaces the user's extension token: creating a new one revokes the old. */
export async function createExtensionToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  const db = getDb();
  await db.batch([
    db.delete(extensionTokens).where(eq(extensionTokens.userId, userId)),
    db.insert(extensionTokens).values({ userId, tokenHash, expiresAt }),
  ]);
}

export async function revokeExtensionTokens(userId: string): Promise<void> {
  await getDb().delete(extensionTokens).where(eq(extensionTokens.userId, userId));
}

/** Owner of a live (unexpired) token, or null. */
export async function userIdForTokenHash(tokenHash: string): Promise<string | null> {
  const [row] = await getDb().select({ userId: extensionTokens.userId }).from(extensionTokens)
    .where(and(eq(extensionTokens.tokenHash, tokenHash), gt(extensionTokens.expiresAt, new Date())));
  return row?.userId ?? null;
}
