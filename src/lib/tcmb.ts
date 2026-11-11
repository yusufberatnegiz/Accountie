import type { FxRate } from "./journal-kinds";

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** TCMB's bulletin file for a day: https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml */
export function bulletinUrl(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`;
}

/** TL per one unit of the currency (ForexBuying / Unit, as JPY is quoted per 100) from one bulletin, or null. */
export function rateFromBulletin(xml: string, currency: string): number | null {
  const block = new RegExp(`<Currency[^>]*CurrencyCode="${currency}"[^>]*>([\\s\\S]*?)</Currency>`).exec(xml)?.[1];
  if (!block) return null;
  const buying = Number(/<ForexBuying>([\d.]+)<\/ForexBuying>/.exec(block)?.[1]);
  const unit = Number(/<Unit>(\d+)<\/Unit>/.exec(block)?.[1] ?? 1);
  return buying > 0 && unit > 0 ? buying / unit : null;
}

/**
 * The rate in force on the invoice date: TCMB's döviz alış kuru from the bulletin of the business day before it (the one
 * announced the day before and in force that day). Weekends and holidays have no bulletin, so it steps back up to a week.
 * Null when TCMB cannot be reached or does not quote the currency; the reviewer then enters TL amounts by hand.
 */
export async function tcmbRate(currency: string, invoiceDate: string, fetcher: Fetch = fetch): Promise<FxRate | null> {
  if (!/^[A-Z]{3}$/.test(currency) || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) return null;
  const start = Date.parse(`${invoiceDate}T00:00:00Z`);
  for (let back = 1; back <= 7; back++) {
    const day = new Date(start - back * DAY_MS);
    const iso = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
    const res = await fetcher(bulletinUrl(iso), { signal: AbortSignal.timeout(4000), cache: "force-cache" }).catch(() => null);
    if (!res) return null; // unreachable: stepping back would only repeat the wait
    if (!res.ok) continue; // no bulletin that day
    const rate = rateFromBulletin(await res.text(), currency);
    return rate === null ? null : { rate, bulletinDate: iso };
  }
  return null;
}
