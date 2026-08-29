import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents, favorites, notes, readItems, sourceItems, sources, updates } from "@/lib/db/schema";

export type UpdateItem = {
  id: string;
  source: "GİB" | "SGK" | "Resmî Gazete";
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string | null;
  favorite: boolean;
  read: boolean;
};

function sourceName(kind: string): UpdateItem["source"] {
  if (kind === "sgk") return "SGK";
  if (kind === "resmi_gazete") return "Resmî Gazete";
  return "GİB";
}

export async function loadUpdates(userId: string, kind?: "gib" | "sgk" | "resmi_gazete"): Promise<UpdateItem[]> {
  const rows = await db.select({
    id: updates.id,
    kind: sources.kind,
    title: updates.title,
    summary: updates.summary,
    sourceUrl: updates.sourceUrl,
    publishedAt: updates.publishedAt,
  }).from(updates)
    .innerJoin(sourceItems, eq(updates.sourceItemId, sourceItems.id))
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(kind ? and(eq(updates.reviewStatus, "approved"), eq(sources.kind, kind)) : eq(updates.reviewStatus, "approved"))
    .orderBy(desc(updates.publishedAt))
    .limit(300);
  const [favoriteRows, readRows] = await Promise.all([
    db.select({ itemId: favorites.itemId }).from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.itemType, "update"))),
    db.select({ updateId: readItems.updateId }).from(readItems).where(eq(readItems.userId, userId)),
  ]);
  const favoriteIds = new Set(favoriteRows.map((row) => row.itemId));
  const readIds = new Set(readRows.map((row) => row.updateId));
  return rows.map((row) => ({
    id: row.id,
    source: sourceName(row.kind),
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    favorite: favoriteIds.has(row.id),
    read: readIds.has(row.id),
  }));
}

export async function loadSourceHealth() {
  const rows = await db.select({ name: sources.name, lastSuccessAt: sources.lastSuccessAt, lastErrorAt: sources.lastErrorAt, lastError: sources.lastError })
    .from(sources).where(eq(sources.enabled, true)).orderBy(asc(sources.name));
  const healthy = rows.filter((row) => row.lastSuccessAt && (!row.lastErrorAt || row.lastSuccessAt >= row.lastErrorAt)).length;
  return { rows, healthy, total: rows.length };
}

export async function loadUpcomingReminders(userId: string) {
  return db.select().from(notes).where(and(eq(notes.ownerId, userId), isNull(notes.completedAt), gte(notes.reminderAt, new Date())))
    .orderBy(asc(notes.reminderAt)).limit(6);
}

export async function loadFavoriteItems(userId: string) {
  const favoriteRows = await db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
  const calendarIds = favoriteRows.filter((row) => row.itemType === "calendar_event").map((row) => row.itemId);
  const updateIds = favoriteRows.filter((row) => row.itemType === "update").map((row) => row.itemId);
  const calendar = calendarIds.length ? await db.select({ id: calendarEvents.id, title: calendarEvents.title, summary: calendarEvents.description, sourceUrl: calendarEvents.sourceUrl, date: calendarEvents.dueOn })
    .from(calendarEvents).where(inArray(calendarEvents.id, calendarIds)) : [];
  const updateRows = updateIds.length ? await db.select({ id: updates.id, title: updates.title, summary: updates.summary, sourceUrl: updates.sourceUrl, date: updates.publishedAt })
    .from(updates).where(inArray(updates.id, updateIds)) : [];
  return [
    ...calendar.map((row) => ({ ...row, itemType: "calendar_event" as const, date: row.date })),
    ...updateRows.map((row) => ({ ...row, itemType: "update" as const, date: row.date?.toISOString().slice(0, 10) ?? "" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadRelationChoices() {
  const [calendar, updateRows] = await Promise.all([
    db.select({ id: calendarEvents.id, title: calendarEvents.title }).from(calendarEvents).where(eq(calendarEvents.reviewStatus, "approved")).orderBy(asc(calendarEvents.dueOn)).limit(30),
    db.select({ id: updates.id, title: updates.title }).from(updates).where(eq(updates.reviewStatus, "approved")).orderBy(desc(updates.publishedAt)).limit(30),
  ]);
  return [
    ...calendar.map((row) => ({ value: `calendar_event:${row.id}`, label: `Takvim · ${row.title}` })),
    ...updateRows.map((row) => ({ value: `update:${row.id}`, label: `Akış · ${row.title}` })),
  ];
}
