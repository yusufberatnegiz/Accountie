// shortcut: Luca's ACIKLAMA length limit was not seen on the real screen; 120 holds every unvan seen so far, lower it if Luca cuts.
const MAX_LENGTH = 120;

/** Vendor title -> Luca line description: the full unvan, as the müşavir types it (upper case, single spaces). */
export function descriptionFromVendor(vendorName: string | null): string {
  return (vendorName ?? "").replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR").slice(0, MAX_LENGTH).trim();
}
