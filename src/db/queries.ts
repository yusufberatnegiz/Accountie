// The only module that talks to the database (Supabase Postgres through its pooler). Every function takes the session user's id and filters by it.
import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { DEFAULT_RULES, rulesFromRows, rulesToRows, type RuleRow, type Rules } from "@/lib/default-rules";
import type { JournalLine, Warning } from "@/lib/journal";
import { getDb } from "./index";
import { accountRules, billingProfiles, creditBalances, creditLedger, extensionTokens, firmAccounts, firmRules, firms, journalLines, payments, rateLimitHits, receipts, vendorRules } from "./schema";

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

export type Firm = { id: string; name: string; taxNumber: string | null };
const firmColumns = { id: firms.id, name: firms.name, taxNumber: firms.taxNumber };

/**
 * The user's firms by name. A user with none gets a first one, and receipts saved before firms existed move into it, so no
 * receipt is ever without a firm on screen.
 */
export async function listFirms(userId: string): Promise<Firm[]> {
  const db = getDb();
  const rows = await db.select(firmColumns).from(firms).where(eq(firms.userId, userId)).orderBy(asc(firms.name));
  if (rows.length > 0) return rows;
  const [first] = await db.insert(firms).values({ userId, name: "Firmam" }).returning(firmColumns);
  await db.update(receipts).set({ firmId: first.id }).where(and(eq(receipts.userId, userId), isNull(receipts.firmId)));
  return [first];
}

export async function createFirm(userId: string, name: string, taxNumber: string | null): Promise<Firm> {
  const [row] = await getDb().insert(firms).values({ userId, name, taxNumber }).returning(firmColumns);
  return row;
}

/**
 * A firm Luca lists, with its chart of accounts: matched to the user's firm by VKN, else by Luca's id, else added. The plan is
 * replaced whole, so a second import only refreshes. Null when a new firm would pass `maxFirms`.
 */
export async function importLucaFirm(userId: string, f: { lucaId: string; name: string; taxNumber: string | null; accounts: readonly { code: string; name: string }[] }, maxFirms: number): Promise<{ id: string; created: boolean } | null> {
  return getDb().transaction(async (tx) => {
    const mine = await tx.select({ id: firms.id, taxNumber: firms.taxNumber, lucaSirketId: firms.lucaSirketId }).from(firms).where(eq(firms.userId, userId));
    const found = (f.taxNumber ? mine.find((m) => m.taxNumber === f.taxNumber) : undefined) ?? mine.find((m) => m.lucaSirketId === f.lucaId);
    if (!found && mine.length >= maxFirms) return null;
    const id = found?.id ?? (await tx.insert(firms).values({ userId, name: f.name, taxNumber: f.taxNumber, lucaSirketId: f.lucaId }).returning({ id: firms.id }))[0].id;
    if (found) await tx.update(firms).set({ lucaSirketId: f.lucaId, taxNumber: found.taxNumber ?? f.taxNumber }).where(and(eq(firms.id, id), eq(firms.userId, userId)));
    await tx.delete(firmAccounts).where(and(eq(firmAccounts.firmId, id), eq(firmAccounts.userId, userId)));
    await tx.insert(firmAccounts).values(f.accounts.map((a) => ({ code: a.code, name: a.name, userId, firmId: id }))).onConflictDoNothing();
    return { id, created: !found };
  });
}

/** The firm's Luca chart of accounts by code; empty until the extension has imported it. */
export async function listFirmAccounts(userId: string, firmId: string): Promise<{ code: string; name: string }[]> {
  return getDb().select({ code: firmAccounts.code, name: firmAccounts.name }).from(firmAccounts)
    .where(and(eq(firmAccounts.userId, userId), eq(firmAccounts.firmId, firmId))).orderBy(asc(firmAccounts.code));
}

/** The user's rules, with the firm's own rows laid over them when a firm is given. */
export async function getRules(userId: string, firmId?: string | null): Promise<{ rules: Rules; rows: RuleRow[] }> {
  const db = getDb();
  let rows: RuleRow[] = await db.select({ kind: accountRules.kind, key: accountRules.key, label: accountRules.label, accountCode: accountRules.accountCode, accountName: accountRules.accountName })
    .from(accountRules).where(eq(accountRules.userId, userId));
  if (rows.length === 0) {
    rows = rulesToRows(DEFAULT_RULES);
    await db.insert(accountRules).values(rows.map((r) => ({ ...r, userId }))).onConflictDoNothing();
  }
  if (firmId) {
    const own: RuleRow[] = await db.select({ kind: firmRules.kind, key: firmRules.key, label: firmRules.label, accountCode: firmRules.accountCode, accountName: firmRules.accountName })
      .from(firmRules).where(and(eq(firmRules.userId, userId), eq(firmRules.firmId, firmId)));
    const same = (a: RuleRow, b: RuleRow) => a.kind === b.kind && a.key === b.key;
    rows = [...rows.map((r) => own.find((o) => same(o, r)) ?? r), ...own.filter((o) => !rows.some((r) => same(o, r)))];
  }
  // Rules added after the user's table was made (foreign invoice, Z report) show with their defaults until saved.
  const missing = rulesToRows(DEFAULT_RULES).filter((d) => !rows.some((r) => r.kind === d.kind && r.key === d.key));
  rows = [...rows, ...missing];
  return { rules: rulesFromRows(rows), rows };
}

/** Saves the rows as the firm's own rules when a firm is given, else as the user's. */
export async function saveRules(userId: string, rows: readonly RuleRow[], firmId?: string): Promise<void> {
  if (rows.length === 0) return;
  await getDb().transaction(async (tx) => {
    for (const r of rows) {
      if (firmId) {
        const set = { accountCode: r.accountCode, accountName: r.accountName, label: r.label };
        await tx.insert(firmRules).values({ ...r, userId, firmId })
          .onConflictDoUpdate({ target: [firmRules.firmId, firmRules.kind, firmRules.key], set, setWhere: eq(firmRules.userId, userId) });
        continue;
      }
      await tx.insert(accountRules).values({ ...r, userId })
        .onConflictDoUpdate({ target: [accountRules.userId, accountRules.kind, accountRules.key], set: { accountCode: r.accountCode, accountName: r.accountName, label: r.label } });
    }
  });
}

/**
 * Says whether every `[limit, windowMs]` still has room for `key` and, if so, records this attempt. A refused request writes
 * nothing, so a flood of refused calls cannot grow the table. Counting and recording happen under one lock per key.
 */
export async function hitRateLimit(key: string, windows: readonly (readonly [limit: number, windowMs: number])[]): Promise<boolean> {
  const now = Date.now();
  const results = await getDb().transaction(async (tx) => {
    // One key at a time: under READ COMMITTED parallel requests would not see each other's uncommitted hit and all pass.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    // Sweep of rows older than any window (a day), on the created_at index, now and then rather than on every call.
    if (Math.random() < 0.05) await tx.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, new Date(now - 24 * 60 * 60_000)));
    const counts = await Promise.all(windows.map(([, ms]) =>
      tx.select({ n: count() }).from(rateLimitHits).where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.createdAt, new Date(now - ms))))));
    const ok = windows.every(([limit], i) => (counts[i][0]?.n ?? 0) < limit);
    if (ok) await tx.insert(rateLimitHits).values({ key });
    return ok;
  });
  return results;
}

/** Whether every window still has room for `key`, without recording an attempt. */
export async function rateLimitOk(key: string, windows: readonly (readonly [limit: number, windowMs: number])[]): Promise<boolean> {
  const now = Date.now();
  const counts = await Promise.all(windows.map(([, ms]) =>
    getDb().select({ n: count() }).from(rateLimitHits).where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.createdAt, new Date(now - ms))))));
  return windows.every(([limit], i) => (counts[i][0]?.n ?? 0) < limit);
}

export async function createReceipt(userId: string, firmId: string, receipt: NewReceipt, lines: readonly JournalLine[]): Promise<string> {
  const id = crypto.randomUUID();
  await getDb().transaction(async (tx) => {
    await tx.insert(receipts).values({ ...receipt, id, userId, firmId });
    await tx.insert(journalLines).values(lineRows(userId, id, lines));
  });
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
  category: receipts.category,
  warnings: receipts.warnings,
  invoice: sql<boolean>`coalesce(${receipts.extraction}->>'documentKind' = 'domestic_invoice', false)`,
  expenseCode: sql<string | null>`(select jl.account_code from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.debit_kurus > 0 and jl.account_code not like '191%' order by jl.line_no limit 1)`,
  // The 191 VAT debits, so the list never sums gross amounts as KDV.
  vatKurus: sql<number>`(select coalesce(sum(jl.debit_kurus), 0)::bigint from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.account_code like '191%')`.mapWith(Number),
};

// A receipt's month (src/lib/month.ts): its date, or the Turkey-time upload day when the date was not read.
const RECEIPT_MONTH = sql<string>`to_char(coalesce(${receipts.receiptDate}, (${receipts.createdAt} at time zone 'Europe/Istanbul')::date), 'YYYY-MM')`;

/** The firm's receipts, newest first; `month` ("2026-09") keeps one month's. */
export async function listReceipts(userId: string, firmId: string, { status, month }: { status?: ReceiptStatus; month?: string } = {}) {
  return getDb().select(listColumns).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(receipts.firmId, firmId), status ? eq(receipts.status, status) : undefined, month ? eq(RECEIPT_MONTH, month) : undefined))
    .orderBy(desc(receipts.createdAt)).limit(200);
}

export async function getReceipt(userId: string, id: string) {
  const db = getDb();
  const [receipt] = await db.select({ ...summaryColumns, firmId: receipts.firmId, taxNumber: receipts.taxNumber, paymentMethod: receipts.paymentMethod, category: receipts.category, warnings: receipts.warnings, model: receipts.model, extraction: receipts.extraction })
    .from(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
  if (!receipt) return null;
  const lines: JournalLine[] = await db.select(lineColumns).from(journalLines)
    .where(and(eq(journalLines.receiptId, id), eq(journalLines.userId, userId))).orderBy(asc(journalLines.lineNo));
  return { ...receipt, lines };
}

export type ReceiptDetail = NonNullable<Awaited<ReturnType<typeof getReceipt>>>;

/** The firm's draft to open after this one (the newest other draft, as the list orders them) and how many other drafts wait. */
export async function nextDraft(userId: string, firmId: string | null, exceptId: string): Promise<{ id: string; left: number } | null> {
  const [row] = await getDb().select({ id: receipts.id, left: sql<number>`count(*) over ()::int` }).from(receipts)
    .where(and(eq(receipts.userId, userId), firmId ? eq(receipts.firmId, firmId) : isNull(receipts.firmId), eq(receipts.status, "draft"), ne(receipts.id, exceptId)))
    .orderBy(desc(receipts.createdAt)).limit(1);
  return row ?? null;
}

/** Replaces all lines of a draft. Caller must have checked the receipt is the user's draft. */
/** Rewrites a draft's lines; false when the receipt is no longer a draft (the row is locked, so a parallel approve waits). */
export async function replaceLines(userId: string, id: string, lines: readonly JournalLine[]): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [draft] = await tx.select({ id: receipts.id }).from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), eq(receipts.status, "draft"))).for("update");
    if (!draft) return false;
    await tx.delete(journalLines).where(and(eq(journalLines.receiptId, id), eq(journalLines.userId, userId)));
    await tx.insert(journalLines).values(lineRows(userId, id, lines));
    return true;
  });
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

/**
 * Approved receipts (or the given approved/exported ones) with their lines, oldest first. One Luca file is one firm's, so
 * `firmId` limits it; the extension passes null and gets every firm's, each tagged with its firm's name.
 */
export async function listForExport(userId: string, firmId: string | null, ids?: readonly string[], month?: string) {
  const db = getDb();
  const mine = firmId ? and(eq(receipts.userId, userId), eq(receipts.firmId, firmId)) : eq(receipts.userId, userId);
  const rows = await db.select({ id: receipts.id, firmName: firms.name, taxNumber: receipts.taxNumber }).from(receipts).leftJoin(firms, eq(firms.id, receipts.firmId))
    .where(ids?.length
      ? and(mine, inArray(receipts.id, [...ids]), inArray(receipts.status, ["approved", "exported"]))
      : and(mine, eq(receipts.status, "approved"), month ? eq(RECEIPT_MONTH, month) : undefined))
    .orderBy(asc(receipts.receiptDate), asc(receipts.createdAt));
  if (rows.length === 0) return [];
  const lines = await db.select({ ...lineColumns, receiptId: journalLines.receiptId }).from(journalLines)
    .where(and(eq(journalLines.userId, userId), inArray(journalLines.receiptId, rows.map((r) => r.id))))
    .orderBy(asc(journalLines.lineNo));
  return rows.map((r) => ({ id: r.id, firmName: r.firmName, taxNumber: r.taxNumber, lines: lines.filter((l) => l.receiptId === r.id).map(({ receiptId, ...l }) => l) }));
}

export async function markExported(userId: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().update(receipts).set({ status: "exported", exportedAt: new Date() })
    .where(and(eq(receipts.userId, userId), inArray(receipts.id, [...ids]), inArray(receipts.status, ["approved", "exported"])));
}

/** Replaces the user's extension token: creating a new one revokes the old. */
export async function createExtensionToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.delete(extensionTokens).where(eq(extensionTokens.userId, userId));
    await tx.insert(extensionTokens).values({ userId, tokenHash, expiresAt });
  });
}

/**
 * Every table holding a user's rows, children before parents (foreign keys). A test checks no user_id table is missing.
 * payments stays (KEPT_TABLES): a sale's record and the invoice details on it are kept by law after the account goes.
 */
export const USER_TABLES = [journalLines, receipts, vendorRules, firmRules, firmAccounts, accountRules, extensionTokens, creditLedger, creditBalances, billingProfiles, firms] as const;
export const KEPT_TABLES = [payments] as const;

/**
 * Deletes the account for good: every row of the user, then the Supabase Auth user (its sessions and identities go with it),
 * in one transaction, so a failure leaves the account whole. The app connects as the database owner, which may delete from auth.users.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    for (const table of USER_TABLES) await tx.delete(table).where(eq(table.userId, userId));
    // A checkout left open would credit a deleted account if its result came later; closed now, its details dropped.
    await tx.update(payments).set({ status: "failed", billing: {} }).where(and(eq(payments.userId, userId), eq(payments.status, "pending")));
    await tx.execute(sql`delete from auth.users where id = ${userId}::uuid`);
  });
}

export async function revokeExtensionTokens(userId: string): Promise<void> {
  await getDb().delete(extensionTokens).where(eq(extensionTokens.userId, userId));
}

/** Owner of a live (unexpired) token, or null; a live token's expiry moves to `extendMs` from now in the same statement. */
export async function userIdForTokenHash(tokenHash: string, extendMs: number): Promise<string | null> {
  const now = new Date();
  const [row] = await getDb().update(extensionTokens).set({ expiresAt: new Date(now.getTime() + extendMs) })
    .where(and(eq(extensionTokens.tokenHash, tokenHash), gt(extensionTokens.expiresAt, now))).returning({ userId: extensionTokens.userId });
  return row?.userId ?? null;
}

export type VendorRule = { id: string; taxNumber: string; vendorName: string | null; accountCode: string; accountName: string };
const vendorRuleColumns = { id: vendorRules.id, taxNumber: vendorRules.taxNumber, vendorName: vendorRules.vendorName, accountCode: vendorRules.accountCode, accountName: vendorRules.accountName };

/** The expense account this firm's approvals taught for a seller, or null. */
export async function getVendorRule(userId: string, firmId: string, taxNumber: string): Promise<VendorRule | null> {
  const [row] = await getDb().select(vendorRuleColumns).from(vendorRules)
    .where(and(eq(vendorRules.userId, userId), eq(vendorRules.firmId, firmId), eq(vendorRules.taxNumber, taxNumber))).limit(1);
  return row ?? null;
}

/** Remembers the approved expense account for a seller, or forgets it when the approval went back to the category rule (`account` null). */
export async function learnVendorRule(userId: string, firmId: string, taxNumber: string, vendorName: string | null, account: { code: string; name: string } | null): Promise<void> {
  const db = getDb();
  if (!account) {
    await db.delete(vendorRules).where(and(eq(vendorRules.userId, userId), eq(vendorRules.firmId, firmId), eq(vendorRules.taxNumber, taxNumber)));
    return;
  }
  await db.insert(vendorRules).values({ userId, firmId, taxNumber, vendorName, accountCode: account.code, accountName: account.name })
    .onConflictDoUpdate({ target: [vendorRules.firmId, vendorRules.taxNumber], set: { vendorName, accountCode: account.code, accountName: account.name, updatedAt: new Date() }, setWhere: eq(vendorRules.userId, userId) });
}

export async function listVendorRules(userId: string, firmId: string): Promise<VendorRule[]> {
  return getDb().select(vendorRuleColumns).from(vendorRules)
    .where(and(eq(vendorRules.userId, userId), eq(vendorRules.firmId, firmId))).orderBy(asc(vendorRules.vendorName)).limit(1000);
}

export async function deleteVendorRule(userId: string, id: string): Promise<boolean> {
  const rows = await getDb().delete(vendorRules).where(and(eq(vendorRules.id, id), eq(vendorRules.userId, userId))).returning({ id: vendorRules.id });
  return rows.length > 0;
}

/** One month across all of the user's firms: receipts per firm and status, for the month close on the Firmalar screen. */
export async function monthCounts(userId: string, month: string): Promise<Map<string, { draft: number; approved: number; exported: number }>> {
  const rows = await getDb().select({ firmId: receipts.firmId, status: receipts.status, n: count() }).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(RECEIPT_MONTH, month))).groupBy(receipts.firmId, receipts.status);
  const out = new Map<string, { draft: number; approved: number; exported: number }>();
  for (const r of rows) {
    if (!r.firmId) continue;
    const c = out.get(r.firmId) ?? { draft: 0, approved: 0, exported: 0 };
    c[r.status] = Number(r.n);
    out.set(r.firmId, c);
  }
  return out;
}

/** The firm's receipts sent to Luca in one month, with the lines the muavin should show (Evrak No as written to Luca). */
export async function listExportedForCheck(userId: string, firmId: string, month: string) {
  const db = getDb();
  const rows = await db.select({ id: receipts.id, vendorName: receipts.vendorName }).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(receipts.firmId, firmId), eq(receipts.status, "exported"), eq(RECEIPT_MONTH, month)))
    .orderBy(asc(receipts.receiptDate), asc(receipts.createdAt)).limit(2000);
  if (rows.length === 0) return [];
  const lines = await db.select({ receiptId: journalLines.receiptId, accountCode: journalLines.accountCode, debitKurus: journalLines.debitKurus, creditKurus: journalLines.creditKurus, documentNo: journalLines.documentNo })
    .from(journalLines).where(and(eq(journalLines.userId, userId), inArray(journalLines.receiptId, rows.map((r) => r.id)))).orderBy(asc(journalLines.lineNo));
  return rows.map((r) => {
    const own = lines.filter((l) => l.receiptId === r.id);
    return { id: r.id, vendorName: r.vendorName, documentNo: own[0]?.documentNo ?? "", lines: own.map(({ accountCode, debitKurus, creditKurus }) => ({ accountCode, debitKurus, creditKurus })) };
  });
}

// ---------- Kontör and payments (src/lib/credits.ts, src/lib/iyzico.ts) ----------

export async function getBalance(userId: string): Promise<number> {
  const [row] = await getDb().select({ balance: creditBalances.balance }).from(creditBalances).where(eq(creditBalances.userId, userId));
  return row?.balance ?? 0;
}

/**
 * Takes 1 credit before a document is read, in one statement, so uploads running at once never pass `floor` together.
 * Returns the ledger row that settleCredit finishes, or null when the balance cannot go that low.
 */
export async function reserveCredit(userId: string, firmId: string, floor: number): Promise<string | null> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.update(creditBalances).set({ balance: sql`${creditBalances.balance} - 1` })
      .where(and(eq(creditBalances.userId, userId), sql`${creditBalances.balance} - 1 >= ${floor}`)).returning({ balance: creditBalances.balance });
    if (!row) return null;
    const [entry] = await tx.insert(creditLedger).values({ userId, firmId, delta: -1, reason: "receipt" }).returning({ id: creditLedger.id });
    return entry.id;
  });
}

/**
 * After the read, the real cost: 0 gives the reserved credit back (nothing was read or saved), 2 takes one more (an invoice)
 * unless that would pass the floor. The ledger row then names the receipt it paid for.
 */
export async function settleCredit(userId: string, entryId: string, cost: number, receiptId: string | null, floor: number): Promise<void> {
  await getDb().transaction(async (tx) => {
    const mine = and(eq(creditLedger.id, entryId), eq(creditLedger.userId, userId));
    if (cost === 0) {
      await tx.update(creditBalances).set({ balance: sql`${creditBalances.balance} + 1` }).where(eq(creditBalances.userId, userId));
      await tx.delete(creditLedger).where(mine);
      return;
    }
    // An invoice's second credit only while the balance stays at or above the floor; at the floor the invoice costs 1.
    const extra = cost === 2 ? await tx.update(creditBalances).set({ balance: sql`${creditBalances.balance} - 1` })
      .where(and(eq(creditBalances.userId, userId), sql`${creditBalances.balance} - 1 >= ${floor}`)).returning({ balance: creditBalances.balance }) : [];
    await tx.update(creditLedger).set({ delta: -1 - extra.length, reason: cost === 2 ? "invoice" : "receipt", receiptId }).where(mine);
  });
}

/** Credits used this month (Turkey time) per firm, most first; a firm deleted since shows no name. */
export async function creditUseByFirm(userId: string) {
  const since = sql`date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'`;
  const rows = await getDb().select({ firmId: creditLedger.firmId, name: firms.name, used: sql<number>`-sum(${creditLedger.delta})::int`, documents: sql<number>`count(*)::int` })
    .from(creditLedger).leftJoin(firms, eq(firms.id, creditLedger.firmId))
    .where(and(eq(creditLedger.userId, userId), lt(creditLedger.delta, 0), sql`${creditLedger.createdAt} >= ${since}`))
    .groupBy(creditLedger.firmId, firms.name);
  return rows.sort((a, b) => b.used - a.used);
}

export type Billing = { name: string; taxNumber: string; taxOffice: string | null; phone: string; address: string; city: string };
const billingColumns = { name: billingProfiles.name, taxNumber: billingProfiles.taxNumber, taxOffice: billingProfiles.taxOffice, phone: billingProfiles.phone, address: billingProfiles.address, city: billingProfiles.city };

export async function getBillingProfile(userId: string): Promise<Billing | null> {
  const [row] = await getDb().select(billingColumns).from(billingProfiles).where(eq(billingProfiles.userId, userId));
  return row ?? null;
}

export async function saveBillingProfile(userId: string, billing: Billing): Promise<void> {
  await getDb().insert(billingProfiles).values({ userId, ...billing })
    .onConflictDoUpdate({ target: billingProfiles.userId, set: { ...billing, updatedAt: new Date() } });
}

/** A checkout about to start; the invoice details are copied onto it, so the record stays right if the profile changes later. */
export async function createPayment(userId: string, p: { packageId: string; credits: number; amountKurus: number; termsVersion: string }, billing: Billing): Promise<string> {
  const [row] = await getDb().insert(payments).values({ userId, ...p, billing }).returning({ id: payments.id });
  return row.id;
}

export async function setPaymentToken(userId: string, id: string, token: string): Promise<void> {
  await getDb().update(payments).set({ token }).where(and(eq(payments.id, id), eq(payments.userId, userId)));
}

/**
 * The checkout iyzico's callback names. The callback has no session (iyzico posts it cross-site, the cookie is SameSite=Lax),
 * so the token is the key; the result itself is always fetched from iyzico, never taken from the callback.
 */
export async function paymentByToken(token: string): Promise<{ id: string; userId: string; amountKurus: number; credits: number; status: "pending" | "paid" | "failed" } | null> {
  const [row] = await getDb().select({ id: payments.id, userId: payments.userId, amountKurus: payments.amountKurus, credits: payments.credits, status: payments.status })
    .from(payments).where(eq(payments.token, token));
  return row ?? null;
}

/** pending -> paid and the credits, in one transaction; false when it was already settled (a second callback). */
export async function markPaymentPaid(id: string, providerPaymentId: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [p] = await tx.update(payments).set({ status: "paid", providerPaymentId, paidAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.status, "pending"))).returning({ userId: payments.userId, credits: payments.credits });
    if (!p) return false;
    await tx.insert(creditBalances).values({ userId: p.userId, balance: p.credits })
      .onConflictDoUpdate({ target: creditBalances.userId, set: { balance: sql`${creditBalances.balance} + ${p.credits}` } });
    await tx.insert(creditLedger).values({ userId: p.userId, paymentId: id, delta: p.credits, reason: "purchase" });
    return true;
  });
}

/** A checkout that did not pay: closed, and its invoice details dropped (nothing was sold, nothing has to be kept). */
export async function markPaymentFailed(id: string): Promise<void> {
  await getDb().update(payments).set({ status: "failed", billing: {} }).where(and(eq(payments.id, id), eq(payments.status, "pending")));
}

export async function getPaymentStatus(id: string): Promise<"pending" | "paid" | "failed" | null> {
  const [row] = await getDb().select({ status: payments.status }).from(payments).where(eq(payments.id, id));
  return row?.status ?? null;
}

/** The user's checkouts still waiting for a result (a review, an unreachable iyzico, a closed payment page), oldest first. */
export async function listOpenPayments(userId: string, limit = 5) {
  return getDb().select({ id: payments.id, amountKurus: payments.amountKurus, status: payments.status, token: payments.token, createdAt: payments.createdAt })
    .from(payments).where(and(eq(payments.userId, userId), eq(payments.status, "pending"), sql`${payments.token} is not null`)).orderBy(asc(payments.createdAt)).limit(limit);
}

/** The user's paid checkouts, newest first, for the purchase history. */
export async function listPayments(userId: string, limit = 24) {
  return getDb().select({ id: payments.id, packageId: payments.packageId, credits: payments.credits, amountKurus: payments.amountKurus, paidAt: payments.paidAt })
    .from(payments).where(and(eq(payments.userId, userId), eq(payments.status, "paid"))).orderBy(desc(payments.paidAt)).limit(limit);
}
