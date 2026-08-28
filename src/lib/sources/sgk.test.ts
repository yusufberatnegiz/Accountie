import { describe, expect, it } from "vitest";
import { parseSgkAnnouncements } from "./sgk";

describe("parseSgkAnnouncements", () => {
  it("resmî SGK duyuru kartını ayrıştırır", () => {
    const html = `<a href="/duyuru/detay/Prim-Odeme-2026-08-26" class="announcement-card">
      <div class="date-day">26</div><div class="date-month">Ağustos</div><div class="date-year">2026</div>
      <div class="announcement-title">Prim Ödeme Duyurusu</div>
      <div class="announcement-link">SİGORTA PRİMLERİ GENEL MÜDÜRLÜĞÜ</div>
    </a>`;

    expect(parseSgkAnnouncements(html)).toEqual([{
      externalKey: "/duyuru/detay/prim-odeme-2026-08-26",
      title: "Prim Ödeme Duyurusu",
      department: "SİGORTA PRİMLERİ GENEL MÜDÜRLÜĞÜ",
      publishedOn: "2026-08-26",
      sourceUrl: "https://www.sgk.gov.tr/duyuru/detay/Prim-Odeme-2026-08-26",
    }]);
  });

  it("beklenen kartlar yoksa sessizce boş veri üretmez", () => {
    expect(() => parseSgkAnnouncements("<html></html>")).toThrow("sayfa yapısı");
  });
});
