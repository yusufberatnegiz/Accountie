import { load } from "cheerio";
import { fetchOfficialText } from "./official-fetch";

const SGK_URL = "https://www.sgk.gov.tr/Duyuru";
const MONTHS: Record<string, string> = {
  Ocak: "01",
  Şubat: "02",
  Mart: "03",
  Nisan: "04",
  Mayıs: "05",
  Haziran: "06",
  Temmuz: "07",
  Ağustos: "08",
  Eylül: "09",
  Ekim: "10",
  Kasım: "11",
  Aralık: "12",
};

export type SgkAnnouncement = {
  externalKey: string;
  title: string;
  department: string;
  publishedOn: string;
  sourceUrl: string;
};

export function parseSgkAnnouncements(html: string): SgkAnnouncement[] {
  const $ = load(html);
  const items = $("a.announcement-card").map((_, element) => {
    const card = $(element);
    const href = card.attr("href")?.trim();
    const title = card.find(".announcement-title").text().replace(/\s+/g, " ").trim();
    const department = card.find(".announcement-link").text().replace(/\s+/g, " ").trim();
    const day = card.find(".date-day").text().trim().padStart(2, "0");
    const monthName = card.find(".date-month").text().trim();
    const year = card.find(".date-year").text().trim();
    const month = MONTHS[monthName];
    if (!href || !title || !department || !month || !/^\d{2}$/.test(day) || !/^\d{4}$/.test(year)) return null;
    const sourceUrl = new URL(href, SGK_URL).toString();
    return {
      externalKey: new URL(sourceUrl).pathname.toLocaleLowerCase("tr-TR"),
      title,
      department,
      publishedOn: `${year}-${month}-${day}`,
      sourceUrl,
    };
  }).get().filter((item): item is SgkAnnouncement => item !== null);

  if (!items.length) throw new Error("SGK duyuru sayfa yapısı doğrulanamadı.");
  return items;
}

export async function fetchSgkAnnouncements(): Promise<SgkAnnouncement[]> {
  const html = await fetchOfficialText(SGK_URL, { cache: "no-store", headers: { Accept: "text/html" } });
  return parseSgkAnnouncements(html);
}
