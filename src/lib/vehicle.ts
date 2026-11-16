import type { Account } from "./default-rules";

/**
 * A passenger car's (binek otomobil) costs: 30% is not an accepted expense (GVK 40/5, KVK 11/1-b) and, being KKEG, the KDV on that
 * share is not deductible either (KDVK 30/d). Both go to the KKEG account; 70% of the expense and of the KDV stay where they were.
 */
export const PASSENGER_CAR_KKEG_PERCENT = 30;

type Line = { accountCode: string; accountName: string; debitKurus: number; creditKurus: number };

/**
 * A KKEG line: the firm's KKEG account, or a 689 account. Never by name: an expense account named "... KKEG" or "Gider Kısıtlamasına
 * Tabi" is an ordinary expense line. The server knows the choice from the receipt itself (extraction.vehicle, src/db/queries.ts).
 */
export const isKkegLine = (l: { accountCode: string }, kkeg?: Account) => (!!kkeg?.code && l.accountCode === kkeg.code) || l.accountCode.startsWith("689");

/** The KKEG debit and the other debits; a split is one only when KKEG is a share (at most 30/70) of the rest, never the whole expense. */
function shares(lines: readonly Line[], kkeg: Account) {
  let kk = 0, rest = 0;
  for (const l of lines) if (l.debitKurus > 0) { if (isKkegLine(l, kkeg)) kk += l.debitKurus; else rest += l.debitKurus; }
  return { kk, rest, split: kk > 0 && rest > 0 && kk * (100 - PASSENGER_CAR_KKEG_PERCENT) <= rest * PASSENGER_CAR_KKEG_PERCENT + 100 };
}

export const isPassengerCar = (lines: readonly Line[], kkeg: Account) => shares(lines, kkeg).split;

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
  // The KKEG line by the same test that found it, so Ticari takes back what Binek put there; never a line that is the expense itself.
  if (!shares(lines, kkeg).split) return [...lines];
  const kept = lines.filter((l) => !(l.debitKurus > 0 && isKkegLine(l, kkeg)));
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
