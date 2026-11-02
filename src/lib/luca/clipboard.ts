import type { JournalLine } from "../journal";
import { formatTrAmount } from "../money";

const lucaDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

/** Tab-separated rows in Luca "Fiş Detayı" order: Hesap Kodu, Evrak No, Evrak Tarihi, BT, Açıklama, Borç, Alacak. */
export function clipboardText(lines: readonly JournalLine[]): string {
  return lines.map((l) => [l.accountCode, l.documentNo, lucaDate(l.documentDate), l.documentType, l.description,
    l.debitKurus ? formatTrAmount(l.debitKurus) : "", l.creditKurus ? formatTrAmount(l.creditKurus) : ""].join("\t")).join("\n");
}
