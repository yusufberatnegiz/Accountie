// The only module that talks to the database (Supabase Postgres through its pooler). Every function takes the session user's id and filters by it.
import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { DEFAULT_RULES, rulesFromRows, rulesToRows, type RuleRow, type Rules } from "@/lib/default-rules";
import type { JournalLine, Warning } from "@/lib/journal";
import { getDb } from "./index";
import { accountRules, extensionTokens, firmAccounts, firmRules, firms, gibCredentials, journalLines, rateLimitHits, receipts, vendorRules } from "./schema";

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
  warnings: receipts.warnings,
  expenseCode: sql<string | null>`(select jl.account_code from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.debit_kurus > 0 and jl.account_code not like '191%' order by jl.line_no limit 1)`,
  lineCount: sql<number>`(select count(*)::int from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId})`,
  // Debits as they go to Luca: the expense side (matrah) and the 191 VAT side, so the list never sums gross amounts into 770.
  expenseKurus: sql<number>`(select coalesce(sum(jl.debit_kurus), 0)::bigint from journal_lines jl where jl.receipt_id = ${receipts.id} and jl.user_id = ${receipts.userId} and jl.account_code not like '191%')`.mapWith(Number),
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
  const [receipt] = await db.select({ ...summaryColumns, firmId: receipts.firmId, taxNumber: receipts.taxNumber, paymentMethod: receipts.paymentMethod, category: receipts.category, warnings: receipts.warnings, model: receipts.model })
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
  const rows = await db.select({ id: receipts.id, firmName: firms.name }).from(receipts).leftJoin(firms, eq(firms.id, receipts.firmId))
    .where(ids?.length
      ? and(mine, inArray(receipts.id, [...ids]), inArray(receipts.status, ["approved", "exported"]))
      : and(mine, eq(receipts.status, "approved"), month ? eq(RECEIPT_MONTH, month) : undefined))
    .orderBy(asc(receipts.receiptDate), asc(receipts.createdAt));
  if (rows.length === 0) return [];
  const lines = await db.select({ ...lineColumns, receiptId: journalLines.receiptId }).from(journalLines)
    .where(and(eq(journalLines.userId, userId), inArray(journalLines.receiptId, rows.map((r) => r.id))))
    .orderBy(asc(journalLines.lineNo));
  return rows.map((r) => ({ id: r.id, firmName: r.firmName, lines: lines.filter((l) => l.receiptId === r.id).map(({ receiptId, ...l }) => l) }));
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

export async function revokeExtensionTokens(userId: string): Promise<void> {
  await getDb().delete(extensionTokens).where(eq(extensionTokens.userId, userId));
}

/** Owner of a live (unexpired) token, or null. */
export async function userIdForTokenHash(tokenHash: string): Promise<string | null> {
  const [row] = await getDb().select({ userId: extensionTokens.userId }).from(extensionTokens)
    .where(and(eq(extensionTokens.tokenHash, tokenHash), gt(extensionTokens.expiresAt, new Date())));
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

/** The firm's sealed GİB login (src/lib/gib/secret.ts), or null. Sealed values only: they are opened in the route that uses them. */
export async function getGibCredential(userId: string, firmId: string): Promise<{ usernameSealed: string; passwordSealed: string; lastUsedAt: Date | null } | null> {
  const [row] = await getDb().select({ usernameSealed: gibCredentials.usernameSealed, passwordSealed: gibCredentials.passwordSealed, lastUsedAt: gibCredentials.lastUsedAt })
    .from(gibCredentials).where(and(eq(gibCredentials.userId, userId), eq(gibCredentials.firmId, firmId)));
  return row ?? null;
}

export async function saveGibCredential(userId: string, firmId: string, usernameSealed: string, passwordSealed: string): Promise<void> {
  const rows = await getDb().insert(gibCredentials).values({ userId, firmId, usernameSealed, passwordSealed })
    .onConflictDoUpdate({ target: gibCredentials.firmId, set: { usernameSealed, passwordSealed, updatedAt: new Date(), lastUsedAt: null, failedLogins: 0 }, setWhere: eq(gibCredentials.userId, userId) })
    .returning({ id: gibCredentials.id });
  if (rows.length === 0) throw new Error("gib credential not saved"); // another user's row for this firm id: never report success
}

export async function deleteGibCredential(userId: string, firmId: string): Promise<void> {
  await getDb().delete(gibCredentials).where(and(eq(gibCredentials.userId, userId), eq(gibCredentials.firmId, firmId)));
}

export async function touchGibCredential(userId: string, firmId: string): Promise<void> {
  await getDb().update(gibCredentials).set({ lastUsedAt: new Date(), failedLogins: 0 }).where(and(eq(gibCredentials.userId, userId), eq(gibCredentials.firmId, firmId)));
}

/** One more GİB refusal for the stored login; returns the count since its last successful login. */
export async function countGibFailure(userId: string, firmId: string): Promise<number> {
  const [row] = await getDb().update(gibCredentials).set({ failedLogins: sql`${gibCredentials.failedLogins} + 1` })
    .where(and(eq(gibCredentials.userId, userId), eq(gibCredentials.firmId, firmId))).returning({ n: gibCredentials.failedLogins });
  return row?.n ?? 0;
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
