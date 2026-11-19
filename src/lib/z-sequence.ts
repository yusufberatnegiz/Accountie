/**
 * Whether a Z report's number fits the firm's earlier Z reports. A till's Z number goes up by one per day closed, so against some
 * earlier report it rose by at least one and at most the days between them plus one (a second report the same day); a firm with two
 * tills has two runs, and fitting either is enough. No earlier report, or a number or date that is not one, fits.
 * Measured on 117 live Z reports (2026-11-19): caught all three misreads, flagged one right read (a second till's first report).
 */
export function zNoFits(no: string, date: string, earlier: readonly { no: string; date: string }[]): boolean {
  const n = digits(no);
  const d = day(date);
  if (n === null || d === null) return true;
  const known = earlier.flatMap((e) => { const m = digits(e.no), dm = day(e.date); return m === null || dm === null ? [] : [{ m, dm }]; });
  if (!known.length) return true;
  return known.some(({ m, dm }) => {
    const days = d - dm;
    if (days > 0) return n - m >= 1 && n - m <= days + 1;
    if (days < 0) return m - n >= 1 && m - n <= -days + 1;
    return Math.abs(n - m) === 1;
  });
}

const digits = (s: string) => (/^\d{1,9}$/.test(s.trim()) ? Number(s.trim()) : null);
const day = (iso: string) => { const t = Date.parse(`${iso}T00:00:00Z`); return Number.isNaN(t) ? null : Math.round(t / 864e5); };
