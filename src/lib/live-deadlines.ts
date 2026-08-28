import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents, favorites, sources } from "@/lib/db/schema";
import { deadlineSource } from "@/lib/deadlines";

export type DeadlineItem = {
  id: string;
  dueDate: string;
  source: "GİB" | "SGK";
  type: string;
  action: string;
  period: string;
  title: string;
  sourceUrl: string;
  lastCheckedAt: string;
  favorite: boolean;
};

export async function loadLiveDeadlines(userId?: string): Promise<{ items: DeadlineItem[]; error: string | null }> {
  try {
    const rows = await db.select({
      id: calendarEvents.id,
      dueDate: calendarEvents.dueOn,
      kind: sources.kind,
      type: calendarEvents.taxType,
      action: calendarEvents.actionType,
      period: calendarEvents.periodDescription,
      title: calendarEvents.description,
      fallbackTitle: calendarEvents.title,
      sourceUrl: calendarEvents.sourceUrl,
      updatedAt: calendarEvents.updatedAt,
    }).from(calendarEvents)
      .innerJoin(sources, eq(calendarEvents.sourceId, sources.id))
      .where(eq(calendarEvents.reviewStatus, "approved"))
      .orderBy(asc(calendarEvents.dueOn));
    const favoriteRows = userId ? await db.select({ itemId: favorites.itemId }).from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, "calendar_event"))) : [];
    const favoriteIds = new Set(favoriteRows.map((row) => row.itemId));
    return {
      items: rows.map((row) => ({
        id: row.id,
        dueDate: row.dueDate,
        source: deadlineSource(row.kind, row.type, `${row.title} ${row.fallbackTitle}`),
        type: row.type,
        action: row.action,
        period: row.period,
        title: row.title || row.fallbackTitle,
        sourceUrl: row.sourceUrl,
        lastCheckedAt: row.updatedAt.toISOString(),
        favorite: favoriteIds.has(row.id),
      })),
      error: rows.length ? null : "Henüz senkronize edilmiş takvim kaydı yok. Şimdi Tara ile resmî kaynakları kontrol edin.",
    };
  } catch (cause) {
    console.error("Takvim veritabanı hatası", cause);
    return { items: [], error: "Takvim kayıtları şu anda yüklenemedi." };
  }
}
