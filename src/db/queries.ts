// The only module that talks to the database (Supabase Postgres through its pooler). Every function takes the session user's id and filters by it.
import { cache } from "react";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { CATEGORIES, DEFAULT_RULES, rulesFromRows, rulesToRows, type RuleRow, type Rules } from "@/lib/default-rules";
import { mergeRules, planIndex, planMismatches, planMismatchWarning } from "@/lib/plan-suggest";
import { isKkegLine } from "@/lib/vehicle";
import { approvalProblem, RETIRED_WARNINGS, warn, type JournalLine, type Warning } from "@/lib/journal";
import { getDb } from "./index";
import { accountRules, billingProfiles, creditBalances, creditLedger, extensionTokens, firmAccounts, firmRules, firms, gibLoginReads, gibLogins, gibScanGrants, journalLines, noticeScans, payments, rateLimitHits, receipts, taxNotices, vendorRules } from "./schema";

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

// fromLuca: brought in by the extension from Luca (it has Luca's own id); the setup is done once one firm is.
export type Firm = { id: string; name: string; taxNumber: string | null; fromLuca?: boolean };
const firmColumns = { id: firms.id, name: firms.name, taxNumber: firms.taxNumber, fromLuca: sql<boolean>`(${firms.lucaSirketId} is not null)` };

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

/**
 * A firm Luca lists, with its chart of accounts: matched to the user's firm by VKN, else by Luca's id, else added. The plan is
 * replaced whole, so a second import only refreshes. Null when a new firm would pass `maxFirms`.
 */
export async function importLucaFirm(userId: string, f: { lucaId: string; name: string; taxNumber: string | null; accounts: readonly { code: string; name: string }[] }, maxFirms: number): Promise<{ id: string; created: boolean } | null> {
  return getDb().transaction(async (tx) => {
    const mine = await tx.select({ id: firms.id, taxNumber: firms.taxNumber, lucaSirketId: firms.lucaSirketId }).from(firms).where(eq(firms.userId, userId));
    // Luca's id first: two Luca firms with one VKN stay two firms. The VKN only ties a firm made by hand (no Luca id) to Luca.
    const found = mine.find((m) => m.lucaSirketId === f.lucaId) ?? (f.taxNumber ? mine.find((m) => !m.lucaSirketId && m.taxNumber === f.taxNumber) : undefined);
    if (!found && mine.length >= maxFirms) return null;
    const id = found?.id ?? (await tx.insert(firms).values({ userId, name: f.name, taxNumber: f.taxNumber, lucaSirketId: f.lucaId }).returning({ id: firms.id }))[0].id;
    if (found) await tx.update(firms).set({ lucaSirketId: f.lucaId, taxNumber: found.taxNumber ?? f.taxNumber }).where(and(eq(firms.id, id), eq(firms.userId, userId)));
    await tx.delete(firmAccounts).where(and(eq(firmAccounts.firmId, id), eq(firmAccounts.userId, userId)));
    // In parts: one insert of a 20.000-account plan would pass Postgres' 65.535 parameters.
    for (let i = 0; i < f.accounts.length; i += 5000) {
      await tx.insert(firmAccounts).values(f.accounts.slice(i, i + 5000).map((a) => ({ code: a.code, name: a.name, userId, firmId: id }))).onConflictDoNothing();
    }
    return { id, created: !found };
  });
}

/** Luca ids of the user's firms whose plan is in: the extension then reads only the firms Luca has and Accountie lacks. */
export async function listImportedLucaIds(userId: string): Promise<string[]> {
  const rows = await getDb().selectDistinct({ id: firms.lucaSirketId }).from(firms).innerJoin(firmAccounts, eq(firmAccounts.firmId, firms.id))
    .where(and(eq(firms.userId, userId), isNotNull(firms.lucaSirketId)));
  return rows.flatMap((r) => (r.id ? [r.id] : []));
}

/** Each Luca firm's VKN/TCKN in Accountie: the e-Tebligat scan checks the GİB login opened that very firm. */
export async function listLucaFirmTaxNumbers(userId: string): Promise<{ lucaId: string; taxNumber: string }[]> {
  const rows = await getDb().select({ lucaId: firms.lucaSirketId, taxNumber: firms.taxNumber }).from(firms)
    .where(and(eq(firms.userId, userId), isNotNull(firms.lucaSirketId), isNotNull(firms.taxNumber)));
  return rows.flatMap((r) => (r.lucaId && r.taxNumber ? [{ lucaId: r.lucaId, taxNumber: r.taxNumber }] : []));
}

/** The firm's Luca chart of accounts by code; empty until the extension has imported it. */
export async function listFirmAccounts(userId: string, firmId: string): Promise<{ code: string; name: string }[]> {
  return getDb().select({ code: firmAccounts.code, name: firmAccounts.name }).from(firmAccounts)
    .where(and(eq(firmAccounts.userId, userId), eq(firmAccounts.firmId, firmId))).orderBy(asc(firmAccounts.code));
}

/** The user's rules, with the firm's own rows laid over them when a firm is given. */
export async function getRules(userId: string, firmId?: string | null): Promise<{ rules: Rules; rows: RuleRow[]; plan: { code: string; name: string }[] }> {
  const db = getDb();
  let rows: RuleRow[] = await db.select({ kind: accountRules.kind, key: accountRules.key, label: accountRules.label, accountCode: accountRules.accountCode, accountName: accountRules.accountName })
    .from(accountRules).where(eq(accountRules.userId, userId));
  if (rows.length === 0) {
    rows = rulesToRows(DEFAULT_RULES);
    await db.insert(accountRules).values(rows.map((r) => ({ ...r, userId }))).onConflictDoNothing();
  }
  const own = firmId ? await db.select({ kind: firmRules.kind, key: firmRules.key, label: firmRules.label, accountCode: firmRules.accountCode, accountName: firmRules.accountName })
    .from(firmRules).where(and(eq(firmRules.userId, userId), eq(firmRules.firmId, firmId))) : [];
  // Read once here and handed back, so callers that also check codes against the plan do not read it again.
  const plan = firmId ? await listFirmAccounts(userId, firmId) : [];
  const merged = mergeRules(rows, own, plan);
  return { rules: rulesFromRows(merged), rows: merged, plan };
}

/** Deletes the firm's own rules (Kurallar's "Varsayılanlara dön" on a firm). */
export async function clearFirmRules(userId: string, firmId: string): Promise<void> {
  await getDb().delete(firmRules).where(and(eq(firmRules.userId, userId), eq(firmRules.firmId, firmId)));
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
  const sweep = Math.random() < 0.05;
  const results = await getDb().transaction(async (tx) => {
    // One key at a time: under READ COMMITTED parallel requests would not see each other's uncommitted hit and all pass.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    // Sweep of rows older than any window (a day), on the created_at index, now and then rather than on every call.
    if (sweep) await tx.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, new Date(now - 24 * 60 * 60_000)));
    const counts = await Promise.all(windows.map(([, ms]) =>
      tx.select({ n: count() }).from(rateLimitHits).where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.createdAt, new Date(now - ms))))));
    const ok = windows.every(([limit], i) => (counts[i][0]?.n ?? 0) < limit);
    if (ok) await tx.insert(rateLimitHits).values({ key });
    return ok;
  });
  // Same chance, apart from the limit (it never fails one): a checkout that never opened (no token) and is a day old is
  // closed with its invoice details. An opened one is closed only by settlePayment, after asking iyzico (it may be paid).
  if (sweep) {
    await getDb().update(payments).set({ status: "failed", billing: {} })
      .where(and(eq(payments.status, "pending"), isNull(payments.token), lt(payments.createdAt, new Date(now - 24 * 60 * 60_000))))
      .catch(() => {});
  }
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

/**
 * Same seller, receipt number, date and total already saved for this firm: the same paper receipt photographed twice. The firm and the
 * total keep two firms' receipts from one chain store (one VKN, numbers restarting per till) apart.
 */
export async function hasDuplicateReceipt(userId: string, firmId: string, taxNumber: string, receiptNo: string, receiptDate: string, totalKurus: number | null): Promise<boolean> {
  const rows = await getDb().select({ id: receipts.id }).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(receipts.firmId, firmId), eq(receipts.taxNumber, taxNumber), eq(receipts.receiptNo, receiptNo), eq(receipts.receiptDate, receiptDate),
      totalKurus === null ? undefined : eq(receipts.totalKurus, totalKurus)))
    .limit(1);
  return rows.length > 0;
}

/** The firm's Z reports, newest 400 by date: each one's Evrak No as kept (a corrected number), else as read, for src/lib/z-sequence.ts. */
export async function listZNumbers(userId: string, firmId: string): Promise<{ no: string; date: string }[]> {
  const rows = await getDb().select({
    no: sql<string | null>`coalesce((select nullif(jl.document_no, '') from journal_lines jl where jl.receipt_id = "receipts"."id" and jl.user_id = "receipts"."user_id" order by jl.line_no limit 1), ${receipts.receiptNo})`,
    date: receipts.receiptDate,
  }).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(receipts.firmId, firmId), eq(receipts.category, "z_report"), isNotNull(receipts.receiptDate)))
    .orderBy(desc(receipts.receiptDate)).limit(400);
  return rows.flatMap((r) => (r.no && r.date ? [{ no: r.no, date: r.date }] : []));
}

// The list shows each receipt's expense account (first debit line that is not VAT) and its line count (for Luca's 400-line file limit).
const listColumns = {
  // Subqueries name the outer table in full ("receipts"."id"): Drizzle writes a column of a one-table select without its table, and
  // journal_lines and firm_accounts have their own id, user_id and firm_id, which a bare "id" would silently (or ambiguously) mean.
  ...summaryColumns,
  // The Evrak No going to Luca (the user may have corrected it under the row), else the number as read.
  receiptNo: sql<string | null>`coalesce((select nullif(jl.document_no, '') from journal_lines jl where jl.receipt_id = "receipts"."id" and jl.user_id = "receipts"."user_id" order by jl.line_no limit 1), ${receipts.receiptNo})`,
  category: receipts.category,
  warnings: receipts.warnings,
  // A draft split to a 689 KKEG line before the choice was stored: its vehicle is chosen (src/lib/vehicle.ts isKkegLine without the
  // firm's code). A split to another KKEG code is made on the review screen, which stores the choice (vehicle).
  binek: sql<boolean>`exists (select 1 from journal_lines jl where jl.receipt_id = "receipts"."id" and jl.user_id = "receipts"."user_id" and jl.debit_kurus > 0 and jl.account_code like '689%')`,
  // "ticari" or "binek" once the user has said so on the review screen (setVehicleChoice).
  vehicle: sql<string | null>`${receipts.extraction}->>'vehicle'`,
  invoice: sql<boolean>`coalesce(${receipts.extraction}->>'documentKind' = 'domestic_invoice', false)`,
  expenseCode: sql<string | null>`(select jl.account_code from journal_lines jl where jl.receipt_id = "receipts"."id" and jl.user_id = "receipts"."user_id" and jl.debit_kurus > 0 and jl.account_code not like '191%' order by jl.line_no limit 1)`,
  // A draft's lines with the name the firm's Luca plan gives each code, for the same check the review screen makes (planMismatches).
  planLines: sql<{ accountCode: string; accountName: string; luca: string }[] | null>`(select jsonb_agg(jsonb_build_object('accountCode', jl.account_code, 'accountName', jl.account_name, 'luca', fa.name))
    from journal_lines jl join firm_accounts fa on fa.firm_id = "receipts"."firm_id" and fa.code = jl.account_code
    where jl.receipt_id = "receipts"."id" and jl.user_id = "receipts"."user_id" and "receipts"."status" = 'draft')`,
  // The 191 VAT debits, so the list never sums gross amounts as KDV.
  vatKurus: sql<number>`(select coalesce(sum(jl.debit_kurus), 0)::bigint from journal_lines jl where jl.receipt_id = "receipts"."id" and jl.user_id = "receipts"."user_id" and jl.account_code like '191%')`.mapWith(Number),
};

// A receipt's month (src/lib/month.ts): its date, or the Turkey-time upload day when the date was not read.
const RECEIPT_MONTH = sql<string>`to_char(coalesce(${receipts.receiptDate}, (${receipts.createdAt} at time zone 'Europe/Istanbul')::date), 'YYYY-MM')`;

/** The firm's receipts, newest first; `month` ("2026-09") keeps one month's. */
export async function listReceipts(userId: string, firmId: string, { status, month }: { status?: ReceiptStatus; month?: string } = {}) {
  const rows = await getDb().select(listColumns).from(receipts)
    .where(and(eq(receipts.userId, userId), eq(receipts.firmId, firmId), status ? eq(receipts.status, status) : undefined, month ? eq(RECEIPT_MONTH, month) : undefined))
    .orderBy(desc(receipts.createdAt)).limit(200);
  const shown = rows.map(({ binek, vehicle, planLines, ...r }) => {
    const warnings = current(r.warnings, r, binek || vehicle === "ticari" || vehicle === "binek");
    // A draft with a code that means another account in the firm's Luca plan says so in the list too, as on its screen.
    const off = planLines ? planMismatches(planLines, planLines.map((l) => ({ code: l.accountCode, name: l.luca }))) : [];
    return { ...r, warnings: off.length ? [planMismatchWarning(off), ...warnings] : warnings };
  });
  // "Uyarısız N fişi onayla" counts what the bulk approval approves (src/app/api/receipts/bulk-approve/route.ts): no warning, and
  // lines that pass the approval check against the firm's plan (balanced, dated, numbered, codes Luca books to).
  const quiet = shown.filter((r) => r.status === "draft" && r.warnings.length === 0).map((r) => r.id);
  const ready = new Set<string>();
  if (quiet.length) {
    const db = getDb();
    const [lines, plan] = await Promise.all([
      db.select({ ...lineColumns, receiptId: journalLines.receiptId }).from(journalLines)
        .where(and(eq(journalLines.userId, userId), inArray(journalLines.receiptId, quiet))).orderBy(asc(journalLines.lineNo)),
      listFirmAccounts(userId, firmId),
    ]);
    const index = planIndex(plan);
    for (const id of quiet) if (!approvalProblem(lines.filter((l) => l.receiptId === id), index)) ready.add(id);
  }
  return shown.map((r) => ({ ...r, ready: ready.has(r.id) }));
}

/**
 * The warnings a receipt shows now: retired ones dropped, and on a vehicle-cost draft whose vehicle is not chosen yet (no KKEG line)
 * the request to choose it, which also keeps it out of the bulk approval.
 */
export function current(warnings: Warning[], r: { status: string; category: string | null }, chosen: boolean): Warning[] {
  const kept = warnings.filter((w) => !RETIRED_WARNINGS.includes(w.code));
  const vehicle = CATEGORIES.some((c) => c.key === r.category && c.vehicle);
  // A document with no fiscal value is deleted, not booked: asking about its vehicle would send the user the wrong way.
  const noValue = kept.some((w) => w.code === "no_fiscal_value");
  return r.status === "draft" && vehicle && !chosen && !noValue ? [warn("vehicle_choice"), ...kept] : kept;
}

/** Remembers on a draft that its vehicle was chosen on the review screen ("ticari" leaves the lines as they are, so only this says it). */
export async function setVehicleChoice(userId: string, id: string, choice: "ticari" | "binek"): Promise<boolean> {
  const rows = await getDb().update(receipts)
    .set({ extraction: sql`coalesce(${receipts.extraction}, '{}'::jsonb) || jsonb_build_object('vehicle', ${choice}::text)` })
    .where(and(eq(receipts.id, id), eq(receipts.userId, userId), eq(receipts.status, "draft")))
    .returning({ id: receipts.id });
  return rows.length > 0;
}

export async function getReceipt(userId: string, id: string) {
  const db = getDb();
  const [receipt] = await db.select({ ...summaryColumns, firmId: receipts.firmId, taxNumber: receipts.taxNumber, paymentMethod: receipts.paymentMethod, category: receipts.category, warnings: receipts.warnings, model: receipts.model, extraction: receipts.extraction })
    .from(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
  if (!receipt) return null;
  const lines: JournalLine[] = await db.select(lineColumns).from(journalLines)
    .where(and(eq(journalLines.receiptId, id), eq(journalLines.userId, userId))).orderBy(asc(journalLines.lineNo));
  const saved = (receipt.extraction as { vehicle?: string } | null)?.vehicle;
  const chosen = lines.some((l) => l.debitKurus > 0 && isKkegLine(l)) || saved === "ticari" || saved === "binek";
  return { ...receipt, warnings: current(receipt.warnings, receipt, chosen), lines };
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
    const [draft] = await tx.select({ id: receipts.id, warnings: receipts.warnings }).from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), eq(receipts.status, "draft"))).for("update");
    if (!draft) return false;
    await tx.delete(journalLines).where(and(eq(journalLines.receiptId, id), eq(journalLines.userId, userId)));
    await tx.insert(journalLines).values(lineRows(userId, id, lines));
    // "No account in the plan for this line" goes once every line has a code, here and in the list.
    if (draft.warnings.some((w) => w.code === "plan_no_account") && lines.every((l) => l.accountCode.trim())) {
      await tx.update(receipts).set({ warnings: draft.warnings.filter((w) => w.code !== "plan_no_account") }).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    }
    return true;
  });
}

/**
 * Sends an approved receipt back to draft with new lines and warnings, in one step; the vehicle choice goes too (the new lines have
 * no binek split, so it is asked again). False when the receipt is no longer approved.
 */
export async function reopenRebuilt(userId: string, id: string, lines: readonly JournalLine[], warnings: readonly Warning[]): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.update(receipts)
      .set({ status: "draft", approvedAt: null, warnings: [...warnings], extraction: sql`${receipts.extraction} - 'vehicle'` })
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId), eq(receipts.status, "approved")))
      .returning({ id: receipts.id });
    if (!row) return false;
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

/** Deletes the given receipts that are the user's drafts; approved and transferred ones stay. Returns how many went. */
export async function deleteDrafts(userId: string, ids: readonly string[]): Promise<number> {
  const rows = await getDb().delete(receipts)
    .where(and(inArray(receipts.id, [...ids]), eq(receipts.userId, userId), eq(receipts.status, "draft")))
    .returning({ id: receipts.id });
  return rows.length;
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
  const rows = await db.select({ id: receipts.id, firmId: receipts.firmId, firmName: firms.name, firmLucaId: firms.lucaSirketId, firmTaxNumber: firms.taxNumber, taxNumber: receipts.taxNumber }).from(receipts).leftJoin(firms, eq(firms.id, receipts.firmId))
    .where(ids?.length
      ? and(mine, inArray(receipts.id, [...ids]), inArray(receipts.status, ["approved", "exported"]))
      : and(mine, eq(receipts.status, "approved"), month ? eq(RECEIPT_MONTH, month) : undefined))
    .orderBy(asc(receipts.receiptDate), asc(receipts.createdAt));
  if (rows.length === 0) return [];
  const lines = await db.select({ ...lineColumns, receiptId: journalLines.receiptId }).from(journalLines)
    .where(and(eq(journalLines.userId, userId), inArray(journalLines.receiptId, rows.map((r) => r.id))))
    .orderBy(asc(journalLines.lineNo));
  return rows.map((r) => ({ id: r.id, firmId: r.firmId, firmName: r.firmName, firmLucaId: r.firmLucaId, firmTaxNumber: r.firmTaxNumber, taxNumber: r.taxNumber, lines: lines.filter((l) => l.receiptId === r.id).map(({ receiptId, ...l }) => l) }));
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
    // A new key (perhaps minted with a stolen session) never inherits an open e-Tebligat approval: the scan is approved again.
    await tx.delete(gibScanGrants).where(eq(gibScanGrants.userId, userId));
  });
}

/**
 * Every table holding a user's rows, children before parents (foreign keys). A test checks no user_id table is missing.
 * payments stays (KEPT_TABLES): a sale's record and the invoice details on it are kept by law after the account goes.
 */
export const USER_TABLES = [gibLoginReads, gibLogins, gibScanGrants, taxNotices, noticeScans, journalLines, receipts, vendorRules, firmRules, firmAccounts, accountRules, extensionTokens, creditLedger, creditBalances, billingProfiles, firms] as const;
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

/** The departments the firm's Z reports have shown (name and KDV rate), for Kurallar to give each its sales account. */
export async function listZDepartments(userId: string, firmId: string): Promise<{ name: string; rate: number }[]> {
  const rows = await getDb().execute<{ name: string; rate: number }>(sql`
    select distinct d->>'name' as name, (d->>'rate')::int as rate
    from ${receipts}, jsonb_array_elements(coalesce(${receipts.extraction}->'departments', '[]'::jsonb)) d
    where ${receipts.userId} = ${userId} and ${receipts.firmId} = ${firmId} and ${receipts.category} = 'z_report' and d->>'name' is not null
    limit 200`);
  return [...rows].filter((r) => r.name.trim() && Number.isInteger(r.rate));
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
    // Only a row still unsettled (no receipt yet, -1) is settled: a retry after a lost commit reply changes nothing.
    const open = and(eq(creditLedger.id, entryId), eq(creditLedger.userId, userId), eq(creditLedger.delta, -1), isNull(creditLedger.receiptId));
    if (cost === 0) {
      const gone = await tx.delete(creditLedger).where(open).returning({ id: creditLedger.id });
      if (gone.length) await tx.update(creditBalances).set({ balance: sql`${creditBalances.balance} + 1` }).where(eq(creditBalances.userId, userId));
      return;
    }
    const [row] = await tx.update(creditLedger).set({ reason: cost === 2 ? "invoice" : "receipt", receiptId }).where(open).returning({ id: creditLedger.id });
    if (!row || cost !== 2) return;
    // An invoice's second credit only while the balance stays at or above the floor; at the floor the invoice costs 1.
    const extra = await tx.update(creditBalances).set({ balance: sql`${creditBalances.balance} - 1` })
      .where(and(eq(creditBalances.userId, userId), sql`${creditBalances.balance} - 1 >= ${floor}`)).returning({ balance: creditBalances.balance });
    if (extra.length) await tx.update(creditLedger).set({ delta: -2 }).where(eq(creditLedger.id, entryId));
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

/** The user's checkouts still waiting for a result (a review, an unreachable iyzico, a closed payment page), newest first. */
export async function listOpenPayments(userId: string, limit = 5) {
  return getDb().select({ id: payments.id, amountKurus: payments.amountKurus, status: payments.status, token: payments.token, createdAt: payments.createdAt })
    .from(payments).where(and(eq(payments.userId, userId), eq(payments.status, "pending"), sql`${payments.token} is not null`)).orderBy(desc(payments.createdAt)).limit(limit);
}

/** The user's purchase paid in the last `withinMs`, if any: what a "payment received" message may name. */
export async function recentPaid(userId: string, withinMs: number): Promise<{ credits: number } | null> {
  const [row] = await getDb().select({ credits: payments.credits }).from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.status, "paid"), gt(payments.paidAt, new Date(Date.now() - withinMs)))).orderBy(desc(payments.paidAt)).limit(1);
  return row ?? null;
}

/** The user's paid checkouts, newest first, for the purchase history. */
export async function listPayments(userId: string, limit = 24) {
  return getDb().select({ id: payments.id, packageId: payments.packageId, credits: payments.credits, amountKurus: payments.amountKurus, paidAt: payments.paidAt })
    .from(payments).where(and(eq(payments.userId, userId), eq(payments.status, "paid"))).orderBy(desc(payments.paidAt)).limit(limit);
}

/** What the order confirmation e-mail says about a paid checkout: the buyer's sign-in address, the purchase and the new balance. */
export async function paidPaymentForMail(id: string) {
  // The outer table named in full ("payments"."user_id"): a bare column (as Drizzle writes it here) would mean credit_balances'
  // own user_id, matching every row (see listColumns).
  const [row] = await getDb().select({
    email: sql<string | null>`(select u.email from auth.users u where u.id::text = "payments"."user_id")`,
    packageId: payments.packageId, credits: payments.credits, amountKurus: payments.amountKurus, paidAt: payments.paidAt,
    providerPaymentId: payments.providerPaymentId, billing: payments.billing,
    balance: sql<number>`coalesce((select b.balance from credit_balances b where b.user_id = "payments"."user_id"), 0)::int`,
  }).from(payments).where(and(eq(payments.id, id), eq(payments.status, "paid")));
  return row ?? null;
}

/** Where the first-run setup stands: an extension key exists (step 2) and how many firms came from Luca (step 3). */
export async function setupStatus(userId: string): Promise<{ connected: boolean; lucaFirms: number }> {
  const db = getDb();
  const [[token], [luca]] = await Promise.all([
    db.select({ n: count() }).from(extensionTokens).where(and(eq(extensionTokens.userId, userId), gt(extensionTokens.expiresAt, new Date()))),
    db.select({ n: count() }).from(firms).where(and(eq(firms.userId, userId), sql`${firms.lucaSirketId} is not null`)),
  ]);
  return { connected: (token?.n ?? 0) > 0, lucaFirms: luca?.n ?? 0 };
}

export type NoticeInput = { gibId: string; institution: string; subUnit: string | null; docType: string | null; docNo: string | null; sentAt: string | null; servedAt: string | null; readOnGib: boolean };

/**
 * One firm's e-Tebligat list as read from its Dijital Vergi Dairesi session, matched by the session's VKN or TCKN. New rows are
 * new to the user, except on the firm's first read: then only the ones not yet read on GİB are, so a first read of hundreds of
 * firms does not flag years of old notices. Rows seen again only update whether GİB shows them read: one opened in GİB by someone
 * else (the taxpayer) stays new here until the müşavir marks it, since its deadlines may already run. Null when no firm matches.
 */
export async function saveNotices(userId: string, idNumbers: readonly string[], items: readonly NoticeInput[]): Promise<{ firm: { id: string; name: string }; fresh: number; total: number } | null> {
  return getDb().transaction(async (tx) => {
    // The VKN first (idNumbers is in that order), then the TCKN. shortcut: two firms with one VKN get the older one's notices; split by Luca id if müşavirs report it.
    const found = await tx.select({ id: firms.id, name: firms.name, taxNumber: firms.taxNumber }).from(firms)
      .where(and(eq(firms.userId, userId), inArray(firms.taxNumber, [...idNumbers]))).orderBy(asc(firms.createdAt));
    const firm = idNumbers.map((n) => found.find((f) => f.taxNumber === n)).find(Boolean);
    if (!firm) return null;
    const [scanned] = await tx.select({ firmId: noticeScans.firmId }).from(noticeScans).where(and(eq(noticeScans.firmId, firm.id), eq(noticeScans.userId, userId)));
    const now = new Date();
    // One row per GİB id: Postgres refuses an upsert that touches a row twice in one statement.
    const unique = [...new Map(items.map((n) => [n.gibId, n])).values()];
    let fresh = 0;
    for (let i = 0; i < unique.length; i += 500) {
      const rows = await tx.insert(taxNotices)
        // A firm's first read: what GİB already shows as read is its history, seen before Accountie ever looked (the epoch keeps
        // it out of the week a seen notice stays listed). Only seenAt being null is ever read as "new".
        .values(unique.slice(i, i + 500).map((n) => ({ ...n, userId, firmId: firm.id, seenAt: !scanned && n.readOnGib ? new Date(0) : null })))
        .onConflictDoUpdate({ target: [taxNotices.firmId, taxNotices.gibId], set: { readOnGib: sql`excluded.read_on_gib` }, setWhere: eq(taxNotices.userId, userId) })
        // xmax = 0 only on a row this statement inserted.
        .returning({ inserted: sql<boolean>`(xmax = 0)`, seenAt: taxNotices.seenAt });
      fresh += rows.filter((r) => r.inserted && !r.seenAt).length;
    }
    await tx.insert(noticeScans).values({ firmId: firm.id, userId, scannedAt: now })
      .onConflictDoUpdate({ target: noticeScans.firmId, set: { scannedAt: now }, setWhere: eq(noticeScans.userId, userId) });
    return { firm: { id: firm.id, name: firm.name }, fresh, total: unique.length };
  });
}

export const NOTICE_LIST_LIMIT = 500;

// A notice the user has marked seen leaves the list this long after "Gördüm". The row stays: every scan reads GİB's
// whole list, so a deleted row would come back as new.
export const NOTICE_KEEP_DAYS = 7;

/** The user's notices (every new one, seen ones for NOTICE_KEEP_DAYS after Gördüm), new first, and when each firm was last read. */
export async function listNotices(userId: string, now = new Date()) {
  const db = getDb();
  const kept = new Date(now.getTime() - NOTICE_KEEP_DAYS * 86_400_000);
  const [notices, scans, newRows] = await Promise.all([
    db.select({
      id: taxNotices.id, firmId: taxNotices.firmId, firmName: firms.name, institution: taxNotices.institution, subUnit: taxNotices.subUnit,
      docType: taxNotices.docType, docNo: taxNotices.docNo, sentAt: taxNotices.sentAt, servedAt: taxNotices.servedAt,
      readOnGib: taxNotices.readOnGib, firstSeenAt: taxNotices.firstSeenAt, isNew: sql<boolean>`(${taxNotices.seenAt} is null)`,
    }).from(taxNotices).innerJoin(firms, eq(firms.id, taxNotices.firmId))
      .where(and(eq(taxNotices.userId, userId), or(isNull(taxNotices.seenAt), gt(taxNotices.seenAt, kept))))
      .orderBy(sql`${taxNotices.seenAt} is null desc`, desc(taxNotices.firstSeenAt), asc(firms.name), desc(taxNotices.gibId)).limit(NOTICE_LIST_LIMIT),
    db.select({ firmId: noticeScans.firmId, firmName: firms.name, scannedAt: noticeScans.scannedAt }).from(noticeScans)
      .innerJoin(firms, eq(firms.id, noticeScans.firmId)).where(eq(noticeScans.userId, userId)).orderBy(asc(noticeScans.scannedAt)),
    // New ones beyond the list's limit are still counted.
    countNewNotices(userId),
  ]);
  return { notices, scans, newCount: newRows };
}

/** Notices not yet marked seen: the count beside e-Tebligat in the panel's menu. Once per server render (the page asks too). */
export const countNewNotices = cache(async (userId: string): Promise<number> => {
  const [row] = await getDb().select({ n: count() }).from(taxNotices).where(and(eq(taxNotices.userId, userId), isNull(taxNotices.seenAt)));
  return row?.n ?? 0;
});

/** Marks the given new notices as seen by the user: only ids the screen showed, never ones that arrived since. */
export async function markNoticesSeen(userId: string, ids: readonly string[]): Promise<number> {
  const rows = await getDb().update(taxNotices).set({ seenAt: new Date() })
    .where(and(eq(taxNotices.userId, userId), isNull(taxNotices.seenAt), inArray(taxNotices.id, [...ids]))).returning({ id: taxNotices.id });
  return rows.length;
}

// ---- GİB logins for the e-Tebligat scan (sealed; src/lib/gib/secret.ts). Nothing here ever holds a login in clear. ----

/** The user's firms by Luca id, for matching logins read from Luca: only firms imported from Luca. */
export async function firmsByLucaId(userId: string, lucaIds: readonly string[]): Promise<Map<string, string>> {
  if (!lucaIds.length) return new Map();
  const rows = await getDb().select({ id: firms.id, lucaId: firms.lucaSirketId }).from(firms)
    .where(and(eq(firms.userId, userId), inArray(firms.lucaSirketId, [...lucaIds])));
  return new Map(rows.flatMap((r) => (r.lucaId ? [[r.lucaId, r.id] as const] : [])));
}

/** Stores sealed logins, replacing a firm's earlier one. Every firm id was matched to this user before sealing. */
export async function saveGibLogins(userId: string, rows: readonly { firmId: string; usernameSealed: string; passwordSealed: string }[]): Promise<void> {
  if (!rows.length) return;
  const now = new Date();
  await getDb().insert(gibLogins).values(rows.map((r) => ({ ...r, userId, updatedAt: now })))
    .onConflictDoUpdate({ target: gibLogins.firmId, set: { usernameSealed: sql`excluded.username_sealed`, passwordSealed: sql`excluded.password_sealed`, updatedAt: now }, setWhere: eq(gibLogins.userId, userId) });
}

/** Firms with a stored login (Luca id, name, VKN): what the scan may ask for. Never the login itself. */
export async function listGibLoginFirms(userId: string): Promise<{ lucaId: string; name: string; taxNumber: string; updatedAt: Date }[]> {
  const rows = await getDb().select({ lucaId: firms.lucaSirketId, name: firms.name, taxNumber: firms.taxNumber, updatedAt: gibLogins.updatedAt })
    .from(gibLogins).innerJoin(firms, eq(firms.id, gibLogins.firmId))
    .where(and(eq(gibLogins.userId, userId), eq(firms.userId, userId))).orderBy(asc(firms.name));
  return rows.flatMap((r) => (r.lucaId && r.taxNumber ? [{ lucaId: r.lucaId, name: r.name, taxNumber: r.taxNumber, updatedAt: r.updatedAt }] : []));
}

/**
 * One firm's sealed login by Luca id, and the read written to the log in the same transaction: no unsealing goes unrecorded.
 * null when the firm has no stored login.
 */
export async function takeGibLogin(userId: string, lucaId: string, network: string, since: Date, maxPerFirm: number): Promise<{ firmId: string; usernameSealed: string; passwordSealed: string } | "spent" | null> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select({ firmId: gibLogins.firmId, usernameSealed: gibLogins.usernameSealed, passwordSealed: gibLogins.passwordSealed })
      .from(gibLogins).innerJoin(firms, eq(firms.id, gibLogins.firmId))
      .where(and(eq(gibLogins.userId, userId), eq(firms.userId, userId), eq(firms.lucaSirketId, lucaId))).limit(1);
    if (!row) return null;
    // A firm's login is opened a few times per approval at most (a stop and resume, a page that did not load): a run through every
    // firm again and again is someone else's.
    const [{ n }] = await tx.select({ n: count() }).from(gibLoginReads)
      .where(and(eq(gibLoginReads.userId, userId), eq(gibLoginReads.firmId, row.firmId), gt(gibLoginReads.readAt, since)));
    if (Number(n) >= maxPerFirm) return "spent";
    await tx.insert(gibLoginReads).values({ userId, firmId: row.firmId, network });
    return row;
  });
}

/** The user's scan approval as stored (its MAC and network are checked by the caller with the server's key), or null. */
export async function gibScanGrant(userId: string): Promise<{ until: Date; grantedAt: Date; network: string; tokenHash: string; mac: string; firms: string[] | null } | null> {
  const [row] = await getDb().select({ until: gibScanGrants.until, grantedAt: gibScanGrants.grantedAt, network: gibScanGrants.network, tokenHash: gibScanGrants.tokenHash, mac: gibScanGrants.mac, firms: gibScanGrants.firms })
    .from(gibScanGrants).where(eq(gibScanGrants.userId, userId));
  return row ?? null;
}

/** The user's live extension keys (hashes): the approval binds to the one there should be. */
export async function liveTokenHashes(userId: string): Promise<string[]> {
  const rows = await getDb().select({ tokenHash: extensionTokens.tokenHash }).from(extensionTokens)
    .where(and(eq(extensionTokens.userId, userId), gt(extensionTokens.expiresAt, new Date())));
  return rows.map((r) => r.tokenHash);
}

export async function setGibScanGrant(userId: string, grant: { until: Date; grantedAt: Date; network: string; tokenHash: string; mac: string; firms: string[] | null }): Promise<void> {
  await getDb().insert(gibScanGrants).values({ userId, ...grant })
    .onConflictDoUpdate({ target: gibScanGrants.userId, set: grant, setWhere: eq(gibScanGrants.userId, userId) });
}

/** Ends the approval now (the site, the extension at the end of a scan, a new extension key). */
export async function endGibScan(userId: string, until?: Date): Promise<void> {
  const owned = eq(gibScanGrants.userId, userId);
  await getDb().delete(gibScanGrants).where(until ? and(owned, eq(gibScanGrants.until, until)) : owned);
}

/** The panel's view: how many logins are stored, the approval, and the last unsealings (firm and time). */
export async function gibLoginStatus(userId: string): Promise<{ stored: number; until: Date | null; day: { reads: number; networks: number }; reads: { firmName: string; readAt: Date }[] }> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [[{ n }], grant, reads, [day]] = await Promise.all([
    db.select({ n: count() }).from(gibLogins).where(eq(gibLogins.userId, userId)),
    gibScanGrant(userId),
    db.select({ firmName: firms.name, readAt: gibLoginReads.readAt }).from(gibLoginReads).innerJoin(firms, eq(firms.id, gibLoginReads.firmId))
      .where(eq(gibLoginReads.userId, userId)).orderBy(desc(gibLoginReads.readAt)).limit(50),
    db.select({ reads: count(), networks: sql<number>`count(distinct ${gibLoginReads.network})` }).from(gibLoginReads)
      .where(and(eq(gibLoginReads.userId, userId), gt(gibLoginReads.readAt, since))),
  ]);
  return { stored: Number(n), until: grant?.until ?? null, day: { reads: Number(day?.reads ?? 0), networks: Number(day?.networks ?? 0) }, reads };
}

/** Deletes the stored logins of these Luca firms (closed ones: no period this year). Only this user's firms. */
export async function deleteGibLoginsFor(userId: string, lucaIds: readonly string[]): Promise<number> {
  if (!lucaIds.length) return 0;
  const ids = getDb().select({ id: firms.id }).from(firms).where(and(eq(firms.userId, userId), inArray(firms.lucaSirketId, [...lucaIds])));
  const gone = await getDb().delete(gibLogins).where(and(eq(gibLogins.userId, userId), inArray(gibLogins.firmId, ids))).returning({ firmId: gibLogins.firmId });
  return gone.length;
}

/** Deletes every stored login and ends the approval; the read log stays (it holds no login). */
export async function deleteGibLogins(userId: string): Promise<number> {
  return getDb().transaction(async (tx) => {
    const gone = await tx.delete(gibLogins).where(eq(gibLogins.userId, userId)).returning({ firmId: gibLogins.firmId });
    await tx.delete(gibScanGrants).where(eq(gibScanGrants.userId, userId));
    return gone.length;
  });
}

/** The account's e-mail, shown by the extension so the user sees which Accountie account a key belongs to before logins go there. */
export async function accountEmail(userId: string): Promise<string | null> {
  const rows = await getDb().execute(sql`select email from auth.users where id::text = ${userId} limit 1`);
  const row = (rows as unknown as { email?: string | null }[])[0];
  return row?.email ?? null;
}
