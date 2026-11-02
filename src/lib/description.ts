const CUT_TOKENS = [" VE ", "LTD", "ŞTİ", "A.Ş.", " AŞ", "TİC.", "SAN.", "İŞL.", "RES.", "KOLL.", "ŞUBESİ"];
const MAX_LENGTH = 60;

/** Vendor title -> Luca line description: cut at company suffix, Turkish lowercase, max 60 chars. */
export function descriptionFromVendor(vendorName: string | null): string {
  const title = (vendorName ?? "").replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
  const cuts = CUT_TOKENS.map((t) => title.indexOf(t)).filter((i) => i > 0);
  // Cuts at index 0 are ignored, so the result is never empty for a non-empty title.
  const text = cuts.length ? title.slice(0, Math.min(...cuts)) : title;
  return text.trim().toLocaleLowerCase("tr-TR").slice(0, MAX_LENGTH).trim();
}
