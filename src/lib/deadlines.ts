export type Urgency = "past" | "today" | "urgent" | "near" | "safe";

const DAY_MS = 86_400_000;

function toUtcDay(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Geçersiz tarih: ${date}`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_MS;
}

export function todayInIstanbul(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function daysUntil(dueDate: string, today = todayInIstanbul()): number {
  return toUtcDay(dueDate) - toUtcDay(today);
}

export function getUrgency(dueDate: string, today = todayInIstanbul()): Urgency {
  const days = daysUntil(dueDate, today);
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days <= 3) return "urgent";
  if (days <= 7) return "near";
  return "safe";
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function urgencyLabel(dueDate: string, today = todayInIstanbul()): string {
  const days = daysUntil(dueDate, today);
  if (days < 0) return `${Math.abs(days)} gün geçti`;
  if (days === 0) return "Son gün";
  if (days === 1) return "Yarın";
  return `${days} gün kaldı`;
}
