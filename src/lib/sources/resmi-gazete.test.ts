import { describe, expect, it } from "vitest";
import { parseOfficialGazette } from "./resmi-gazete";

const fixture = `
  <span id="spanGazeteTarih">28 Ağustos 2026 Tarihli ve 33354 Sayılı Resmî Gazete</span>
  <a id="btnPdfGoruntule" href="https://www.resmigazete.gov.tr/eskiler/2026/08/20260828.pdf">PDF</a>
  <div id="html-content">
    <div class="html-title">YÜRÜTME VE İDARE BÖLÜMÜ</div>
    <div class="html-subtitle">YÖNETMELİKLER</div>
    <div class="fihrist-item"><a href="https://www.resmigazete.gov.tr/eskiler/2026/08/20260828-7.htm">–– Örnek Yönetmelik</a></div>
  </div>`;

describe("Resmî Gazete parser", () => {
  it("normalizes the official daily index", () => {
    const issue = parseOfficialGazette(fixture, "2026-08-28", "https://www.resmigazete.gov.tr/28.08.2026");
    expect(issue.title).toContain("33354");
    expect(issue.items[0]).toEqual(expect.objectContaining({ title: "Örnek Yönetmelik", category: "YÖNETMELİKLER" }));
  });

  it("rejects links outside the official host", () => {
    expect(() => parseOfficialGazette(fixture.replace("www.resmigazete.gov.tr/eskiler", "example.com/eskiler"), "2026-08-28", "https://www.resmigazete.gov.tr/28.08.2026")).toThrow("İzin verilmeyen kaynak");
  });
});
