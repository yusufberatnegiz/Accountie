/** VKN (10 digits, check digit) or TCKN (11 digits, two check digits). */
export function isValidTaxNumber(value: string): boolean {
  if (/^\d{10}$/.test(value)) {
    const d = [...value].map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const t = (d[i] + 9 - i) % 10;
      let p = (t * 2 ** (9 - i)) % 9;
      if (t !== 0 && p === 0) p = 9;
      sum += p;
    }
    return (10 - (sum % 10)) % 10 === d[9];
  }
  if (/^[1-9]\d{10}$/.test(value)) {
    const d = [...value].map(Number);
    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    const d10 = (((odd * 7 - even) % 10) + 10) % 10;
    const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
    return d10 === d[9] && d11 === d[10];
  }
  return false;
}

/** "05.09.2026" (also / or -) -> "2026-09-05", null when not a real date. */
export function parseReceiptDate(text: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}
