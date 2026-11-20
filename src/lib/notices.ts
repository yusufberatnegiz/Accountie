/** GİB's dd/mm/yyyy (time after it ignored) as that day in Turkey, or null. */
export function gibDay(s: string | null): string | null {
  const m = /^(\d{2})[./](\d{2})[./](\d{4})/.exec(s?.trim() ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Today in Turkey as yyyy-mm-dd. */
export const turkeyDay = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);

/** Where the tebliğ day stands (tebliğ is made at that day's end): "past" after it, "today", "future" before it, null without a date. */
export function servedState(servedAt: string | null, now: Date): "past" | "today" | "future" | null {
  const day = gibDay(servedAt);
  if (!day) return null;
  const today = turkeyDay(now);
  return day < today ? "past" : day === today ? "today" : "future";
}

/** Whole days between a read and now. */
export const daysSince = (at: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - at.getTime()) / 86_400_000));
