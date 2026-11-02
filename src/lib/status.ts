import type { ReceiptStatus } from "@/db/queries";

export const STATUS_LABELS: Record<ReceiptStatus, string> = { draft: "Taslak", approved: "Onaylandı", exported: "Aktarıldı" };
