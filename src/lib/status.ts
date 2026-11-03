import type { ReceiptStatus } from "@/db/queries";

export const STATUS_LABELS: Record<ReceiptStatus, string> = { draft: "Taslak", approved: "Onaylandı", exported: "Aktarıldı" };

/** The screen's finding: what waits for the user, computed from the rows. */
export function listFinding(drafts: number, ready: number): string {
  if (drafts === 0 && ready === 0) return "Bekleyen fiş yok. Yeni fişleri çektikçe burada kontrol edersiniz.";
  const parts = [];
  if (drafts) parts.push(`${drafts} taslak kontrol bekliyor.`);
  if (ready) parts.push(`${ready} onaylı fiş Luca dosyasına hazır.`);
  return parts.join(" ");
}
