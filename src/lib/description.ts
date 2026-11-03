const CUT_TOKENS = ["VE", "LTD", "ŞTİ", "A\\.Ş", "AŞ", "TİC", "SAN", "İŞL", "RES", "KOLL", "ŞUBESİ"];
// Whole words only (bounded by start, end, space or dot), so "ALTDAĞ" or "AŞÇI" are not cut.
const CUT_PATTERN = new RegExp(`(?<=^|[\\s.])(?:${CUT_TOKENS.join("|")})(?=$|[\\s.])`, "gu");
const MAX_LENGTH = 60;

/** Vendor title -> Luca line description: cut at company suffix, Turkish lowercase, max 60 chars. */
export function descriptionFromVendor(vendorName: string | null): string {
  const title = (vendorName ?? "").replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
  // Cuts at index 0 are ignored, so the result is never empty for a non-empty title.
  const cut = [...title.matchAll(CUT_PATTERN)].find((m) => m.index > 0);
  const text = cut ? title.slice(0, cut.index) : title;
  return text.trim().toLocaleLowerCase("tr-TR").slice(0, MAX_LENGTH).trim();
}
