export function reminderInIstanbul(date: string | undefined, time: string | undefined): Date | null {
  return date ? new Date(`${date}T${time || "09:00"}:00+03:00`) : null;
}

export function reminderInputParts(value: Date | null): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
  const [date, time] = local.split(" ");
  return { date, time };
}
