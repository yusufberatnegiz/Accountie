// The only module that talks to the database. Every function takes the session user's id and filters by it.
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import { DEFAULT_RULES, rulesFromRows, rulesToRows, type RuleRow, type Rules } from "@/lib/default-rules";
import type { JournalLine, Warning } from "@/lib/journal";
import { getDb } from "./index";
import { accountRules, journalLines, receipts } from "./schema";

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

export async function countReceiptsSince(userId: string, since: Date): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(receipts).where(and(eq(receipts.userId, userId), gt(receipts.createdAt, since)));
  return row?.n ?? 0;
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

export async function listReceipts(userId: string, status?: ReceiptStatus) {
  return getDb().select(summaryColumns).from(receipts)
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
