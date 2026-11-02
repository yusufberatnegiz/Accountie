// All money is integer kuruş. Floats never enter arithmetic.

/** Turkish receipt amount ("8.725,00", "*793,18") -> kuruş. Throws on anything ambiguous. */
export function parseTrAmount(text: string): number {
  const s = text.trim().replace(/^\*/, "").replace(/\s/g, "");
  const m = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(s);
  if (!m) throw new Error(`Tutar okunamadı: ${text}`);
  const lira = Number(m[1].replace(/\./g, ""));
  const kurus = lira * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
  if (!Number.isSafeInteger(kurus)) throw new Error(`Tutar çok büyük: ${text}`);
  return kurus;
}

export function formatTrAmount(kurus: number): string {
  const lira = Math.trunc(kurus / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${lira},${String(kurus % 100).padStart(2, "0")}`;
}

/** VAT inside a VAT-inclusive gross, rounded half up to the kuruş. */
export function vatFromGross(grossKurus: number, rate: number): number {
  return Math.floor((grossKurus * rate * 2 + (100 + rate)) / (2 * (100 + rate)));
}
