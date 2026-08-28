import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents, sourceItems, sources, syncRuns, updates } from "@/lib/db/schema";
import { todayInIstanbul } from "@/lib/deadlines";
import { fetchGibCalendar } from "./gib";
import { fetchOfficialGazette } from "./resmi-gazete";
import { fetchSgkAnnouncements } from "./sgk";

export type SyncTrigger = "cron" | "manual";
export type SyncResult = { source: string; ok: boolean; found: number; changed: number; error?: string };

export function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function publishedDate(value: string): Date {
  return new Date(`${value}T12:00:00+03:00`);
}

async function inBatches<T>(items: T[], worker: (item: T) => Promise<boolean>): Promise<number> {
  let changed = 0;
  for (let index = 0; index < items.length; index += 20) {
    const results = await Promise.all(items.slice(index, index + 20).map(worker));
    changed += results.filter(Boolean).length;
  }
  return changed;
}

async function saveSourceItem(input: {
  sourceId: string;
  externalKey: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: Date | null;
  rawPayload: unknown;
}) {
  const hash = contentHash(input.rawPayload);
  const [existing] = await db.select({ id: sourceItems.id, contentHash: sourceItems.contentHash })
    .from(sourceItems)
    .where(and(eq(sourceItems.sourceId, input.sourceId), eq(sourceItems.externalKey, input.externalKey)))
    .limit(1);
  const changed = !existing || existing.contentHash !== hash;
  const [saved] = await db.insert(sourceItems).values({
    ...input,
    contentHash: hash,
    rawPayload: input.rawPayload,
    reviewStatus: "approved",
    reviewedAt: new Date(),
  }).onConflictDoUpdate({
    target: [sourceItems.sourceId, sourceItems.externalKey],
    set: {
      title: input.title,
      summary: input.summary,
      sourceUrl: input.sourceUrl,
      publishedAt: input.publishedAt,
      contentHash: hash,
      rawPayload: input.rawPayload,
      reviewStatus: "approved",
      reviewedAt: new Date(),
      lastSeenAt: new Date(),
    },
  }).returning({ id: sourceItems.id });
  return { id: saved.id, changed };
}

async function sourceByKind(kind: "gib" | "sgk" | "resmi_gazete") {
  const [source] = await db.select().from(sources).where(eq(sources.kind, kind)).limit(1);
  if (!source || !source.enabled) throw new Error(`${kind} kaynağı etkin değil.`);
  return source;
}

async function runSource(
  kind: "gib" | "sgk" | "resmi_gazete",
  trigger: SyncTrigger,
  worker: (sourceId: string) => Promise<{ found: number; changed: number }>,
): Promise<SyncResult> {
  const source = await sourceByKind(kind);
  const [run] = await db.insert(syncRuns).values({ sourceId: source.id, trigger }).returning({ id: syncRuns.id });
  try {
    const result = await worker(source.id);
    const now = new Date();
    await db.update(syncRuns).set({ status: "succeeded", finishedAt: now, foundCount: result.found, changedCount: result.changed }).where(eq(syncRuns.id, run.id));
    await db.update(sources).set({ lastSuccessAt: now, lastError: null }).where(eq(sources.id, source.id));
    return { source: source.name, ok: true, ...result };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 1000) : "Bilinmeyen kaynak hatası";
    const now = new Date();
    await db.update(syncRuns).set({ status: "failed", finishedAt: now, errorMessage: message }).where(eq(syncRuns.id, run.id));
    await db.update(sources).set({ lastErrorAt: now, lastError: message }).where(eq(sources.id, source.id));
    return { source: source.name, ok: false, found: 0, changed: 0, error: message };
  }
}

async function syncGib(sourceId: string, date: string) {
  const items = await fetchGibCalendar(date);
  const changed = await inBatches(items, async (item) => {
    const saved = await saveSourceItem({
      sourceId,
      externalKey: item.externalKey,
      title: item.title,
      summary: item.description,
      sourceUrl: item.sourceUrl,
      publishedAt: publishedDate(item.dueOn),
      rawPayload: item,
    });
    await db.insert(calendarEvents).values({
      sourceItemId: saved.id,
      sourceId,
      externalKey: item.externalKey,
      title: item.title,
      description: item.description,
      taxType: item.taxType,
      actionType: item.actionType,
      periodDescription: item.periodDescription,
      startsOn: item.startsOn,
      dueOn: item.dueOn,
      priority: Math.min(3, Math.max(1, item.priority)),
      sourceUrl: item.sourceUrl,
      reviewStatus: "approved",
      reviewedAt: new Date(),
    }).onConflictDoUpdate({
      target: [calendarEvents.sourceId, calendarEvents.externalKey],
      set: {
        sourceItemId: saved.id,
        title: item.title,
        description: item.description,
        taxType: item.taxType,
        actionType: item.actionType,
        periodDescription: item.periodDescription,
        startsOn: item.startsOn,
        dueOn: item.dueOn,
        priority: Math.min(3, Math.max(1, item.priority)),
        sourceUrl: item.sourceUrl,
        reviewStatus: "approved",
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await db.insert(updates).values({
      sourceItemId: saved.id,
      title: item.title,
      summary: item.description || `${item.taxType} · ${item.periodDescription}`,
      sourceUrl: item.sourceUrl,
      publishedAt: publishedDate(item.dueOn),
      reviewStatus: "approved",
      reviewedAt: new Date(),
    }).onConflictDoUpdate({
      target: updates.sourceItemId,
      set: { title: item.title, summary: item.description, sourceUrl: item.sourceUrl, publishedAt: publishedDate(item.dueOn), reviewStatus: "approved", reviewedAt: new Date() },
    });
    return saved.changed;
  });
  return { found: items.length, changed };
}

async function syncSgk(sourceId: string) {
  const items = await fetchSgkAnnouncements();
  const changed = await inBatches(items, async (item) => {
    const saved = await saveSourceItem({
      sourceId,
      externalKey: item.externalKey,
      title: item.title,
      summary: item.department,
      sourceUrl: item.sourceUrl,
      publishedAt: publishedDate(item.publishedOn),
      rawPayload: item,
    });
    await db.insert(updates).values({
      sourceItemId: saved.id,
      title: item.title,
      summary: item.department,
      sourceUrl: item.sourceUrl,
      publishedAt: publishedDate(item.publishedOn),
      reviewStatus: "approved",
      reviewedAt: new Date(),
    }).onConflictDoUpdate({
      target: updates.sourceItemId,
      set: { title: item.title, summary: item.department, sourceUrl: item.sourceUrl, publishedAt: publishedDate(item.publishedOn), reviewStatus: "approved", reviewedAt: new Date() },
    });
    return saved.changed;
  });
  return { found: items.length, changed };
}

async function syncGazette(sourceId: string, date: string) {
  const issue = await fetchOfficialGazette(date);
  const changed = await inBatches(issue.items, async (item) => {
    const saved = await saveSourceItem({
      sourceId,
      externalKey: `${date}:${new URL(item.sourceUrl).pathname}`,
      title: item.title,
      summary: [item.section, item.category].filter(Boolean).join(" · "),
      sourceUrl: item.sourceUrl,
      publishedAt: publishedDate(date),
      rawPayload: item,
    });
    await db.insert(updates).values({
      sourceItemId: saved.id,
      title: item.title,
      summary: [item.section, item.category].filter(Boolean).join(" · "),
      sourceUrl: item.sourceUrl,
      publishedAt: publishedDate(date),
      reviewStatus: "approved",
      reviewedAt: new Date(),
    }).onConflictDoUpdate({
      target: updates.sourceItemId,
      set: { title: item.title, summary: [item.section, item.category].filter(Boolean).join(" · "), sourceUrl: item.sourceUrl, publishedAt: publishedDate(date), reviewStatus: "approved", reviewedAt: new Date() },
    });
    return saved.changed;
  });
  return { found: issue.items.length, changed };
}

export async function syncAllSources(trigger: SyncTrigger = "cron", date = todayInIstanbul()): Promise<SyncResult[]> {
  return Promise.all([
    runSource("gib", trigger, (sourceId) => syncGib(sourceId, date)),
    runSource("sgk", trigger, syncSgk),
    runSource("resmi_gazete", trigger, (sourceId) => syncGazette(sourceId, date)),
  ]);
}
