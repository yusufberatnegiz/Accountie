import { describe, expect, it } from "vitest";
import { descriptionFromVendor } from "./description";

describe("descriptionFromVendor", () => {
  it("örnek unvanı Luca açıklamasına çevirir", () => {
    expect(descriptionFromVendor("ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ")).toBe("örnek balık lokantası");
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
  it("eki kelime içinde aramaz", () => {
    expect(descriptionFromVendor("ALTDAĞ GIDA")).toBe("altdağ gıda");
    expect(descriptionFromVendor("KARDEŞLER AŞÇI EVİ")).toBe("kardeşler aşçı evi");
    expect(descriptionFromVendor("YILDIZ SAN.TİC. LTD")).toBe("yıldız");
    expect(descriptionFromVendor("SANCAK RESTORAN VEZİR TİC.A.Ş.")).toBe("sancak restoran vezir");
  });
  it("boş unvan boş açıklama", () => {
    expect(descriptionFromVendor(null)).toBe("");
  });
});
