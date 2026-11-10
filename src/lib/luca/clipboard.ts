import type { JournalLine } from "../journal";
import { formatTrAmount } from "../money";

const lucaDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

/** One Luca "Fiş Detayı" grid row as the user would type it. Shared by the clipboard view and the Chrome extension. */
export type LucaGridRow = {
  accountCode: string; documentNo: string; documentDate: string; documentType: string; description: string; debit: string; credit: string;
  taxNumber: string;
};

// The müşavir puts the seller's VKN on the expense line only (not on KDV or payment lines).
const isExpense = (l: JournalLine) => l.debitKurus > 0 && !l.accountCode.startsWith("191");

export const lucaGridRows = (lines: readonly JournalLine[], taxNumber: string | null = null): LucaGridRow[] => lines.map((l) => ({
  accountCode: l.accountCode,
  documentNo: l.documentNo,
  documentDate: lucaDate(l.documentDate),
  documentType: l.documentType,
  description: l.description,
  debit: l.debitKurus ? formatTrAmount(l.debitKurus) : "",
  credit: l.creditKurus ? formatTrAmount(l.creditKurus) : "",
  taxNumber: taxNumber && isExpense(l) ? taxNumber : "",
}));

/** Tab-separated rows in Luca "Fiş Detayı" order: Hesap Kodu, Evrak No, Evrak Tarihi, BT, Açıklama, Borç, Alacak. */
export function clipboardText(lines: readonly JournalLine[]): string {
  return lucaGridRows(lines).map((r) => [r.accountCode, r.documentNo, r.documentDate, r.documentType, r.description, r.debit, r.credit].join("\t")).join("\n");
}
