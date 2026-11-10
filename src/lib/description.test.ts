import { describe, expect, it } from "vitest";
import { descriptionFromVendor } from "./description";

describe("descriptionFromVendor", () => {
  it("müşavirin yazdığı gibi tam unvanı verir: şirket ekleri kesilmez", () => {
    expect(descriptionFromVendor("ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ")).toBe("ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ");
  });
  it("Türkçe i ve ı harflerini doğru büyütür", () => {
    expect(descriptionFromVendor("ışık inşaat ltd.şti.")).toBe("IŞIK İNŞAAT LTD.ŞTİ.");
  });
  it("boşlukları temizler", () => {
    expect(descriptionFromVendor("  KÖŞE   BÜFE  ")).toBe("KÖŞE BÜFE");
  });
  it("120 karakteri aşmaz", () => {
    expect(descriptionFromVendor("A".repeat(200))).toHaveLength(120);
  });
  it("boş unvan boş açıklama", () => {
    expect(descriptionFromVendor(null)).toBe("");
  });
});
