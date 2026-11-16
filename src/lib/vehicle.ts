import type { Account } from "./default-rules";

/**
 * A passenger car's (binek otomobil) costs: 30% is not an accepted expense (GVK 40/5, KVK 11/1-b) and, being KKEG, the KDV on that
 * share is not deductible either (KDVK 30/d). Both go to the KKEG account; 70% of the expense and of the KDV stay where they were.
 */
export const PASSENGER_CAR_KKEG_PERCENT = 30;

type Line = { accountCode: string; accountName: string; debitKurus: number; creditKurus: number };

/**
 * A KKEG line: the firm's KKEG account, or any 689 account or one named as KKEG. The same test runs on the server (src/db/queries.ts)
 * and on the screen, so a receipt split once is never split again, whatever the firm's KKEG rule says.
 */
export const isKkegLine = (l: { accountCode: string; accountName: string }, kkeg?: Account) =>
  (!!kkeg?.code && l.accountCode === kkeg.code) || l.accountCode.startsWith("689") || KKEG_NAME.test(l.accountName.toLocaleLowerCase("tr"));
// Only names that say KKEG: "Binek Araç Giderleri" is an ordinary expense account. Compared in Turkish lower case ("İ").
export const KKEG_NAME = /kanunen kabul|kkeg|gider kısıtlama/;

export const isPassengerCar = (lines: readonly Line[], kkeg: Account) => lines.some((l) => l.debitKurus > 0 && isKkegLine(l, kkeg));

/** Moves 30% of every debit line into one KKEG line, put just before the credit. `make` builds that line from a debit line. */
export function toPassengerCar<L extends Line>(lines: readonly L[], kkeg: Account, make: (from: L) => L): L[] {
  if (!kkeg.code || isPassengerCar(lines, kkeg)) return [...lines];
  let moved = 0;
  const out = lines.map((l) => {
    if (l.debitKurus <= 0) return l;
    const part = Math.round((l.debitKurus * PASSENGER_CAR_KKEG_PERCENT) / 100);
    moved += part;
    return { ...l, debitKurus: l.debitKurus - part };
  });
  const first = lines.find((l) => l.debitKurus > 0);
  if (!moved || !first) return [...lines];
  const at = out.findIndex((l) => l.creditKurus > 0);
  out.splice(at < 0 ? out.length : at, 0, { ...make(first), accountCode: kkeg.code, accountName: kkeg.name, debitKurus: moved, creditKurus: 0 });
  return out;
}

/**
 * Back to a commercial vehicle: each debit line gets its 30% back from the KKEG line. The 30% is rounded per line, so two amounts
 * can give the same share; when `original` (the lines as read) turned binek gives exactly these lines, its amounts come back as they
 * were. Otherwise each line is grown back by 100/70 and any kuruş left over goes to the largest.
 */
export function fromPassengerCar<L extends Line>(lines: readonly L[], kkeg: Account, original?: readonly Line[]): L[] {
  const removable = (l: Line) => l.debitKurus > 0 && ((!!kkeg.code && l.accountCode === kkeg.code) || l.accountCode.startsWith("689"));
  const kept = lines.filter((l) => !removable(l));
  if (kept.length === lines.length) return [...lines];
  if (original && !isPassengerCar(original, kkeg)) {
    const turned = toPassengerCar(original.map((l) => ({ ...l })), kkeg, (from) => ({ ...from }));
    const amounts = (ls: readonly Line[]) => JSON.stringify(ls.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]));
    if (amounts(turned) === amounts(lines)) return kept.map((l, i) => ({ ...l, debitKurus: original[i].debitKurus, creditKurus: original[i].creditKurus }));
  }
  const debitBefore = lines.reduce((s, l) => s + l.debitKurus, 0);
  const out = kept.map((l) => (l.debitKurus > 0 ? { ...l, debitKurus: Math.round((l.debitKurus * 100) / (100 - PASSENGER_CAR_KKEG_PERCENT)) } : l));
  const left = debitBefore - out.reduce((s, l) => s + l.debitKurus, 0);
  const largest = out.reduce((best, l, i) => (l.debitKurus > (out[best]?.debitKurus ?? -1) ? i : best), -1);
  if (left && largest >= 0) out[largest] = { ...out[largest], debitKurus: out[largest].debitKurus + left };
  return out;
}
