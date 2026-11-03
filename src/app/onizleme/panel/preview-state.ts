// Dev previews only: receipt statuses changed by PreviewApi, kept in a session cookie so a refresh shows them.
export const PREVIEW_COOKIE = "onizleme-durum";

export function withStatuses<T extends { id: string; status: string }>(rows: T[], raw: string | undefined): T[] {
  let map: Record<string, string> = {};
  try {
    map = raw ? JSON.parse(decodeURIComponent(raw)) : {};
  } catch {}
  return rows.map((r) => (map[r.id] ? { ...r, status: map[r.id] as T["status"] } : r));
}
