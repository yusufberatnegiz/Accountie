import { describe, expect, it } from "vitest";
import { descriptionFromVendor } from "./description";

describe("descriptionFromVendor", () => {
  it("örnek unvanı Luca açıklamasına çevirir", () => {
    expect(descriptionFromVendor("ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ")).toBe("örnek alabalık üretim çiftliği");
  });
  it("Türkçe I ve İ harflerini doğru küçültür", () => {
    expect(descriptionFromVendor("IŞIK İNŞAAT LTD.ŞTİ.")).toBe("ışık inşaat");
  });
  it("şirket eki yoksa tamamını alır ve boşlukları temizler", () => {
    expect(descriptionFromVendor("  KÖŞE   BÜFE  ")).toBe("köşe büfe");
  });
  it("60 karakteri aşmaz", () => {
    expect(descriptionFromVendor("A".repeat(100))).toHaveLength(60);
  });
  it("unvan ekle başlıyorsa baştaki eki kesmez", () => {
    expect(descriptionFromVendor("LTD ŞTİ ÖRNEK")).toBe("ltd");
  });
  it("boş unvan boş açıklama", () => {
    expect(descriptionFromVendor(null)).toBe("");
  });
});
