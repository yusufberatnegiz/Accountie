import { describe, expect, it } from "vitest";
import { isValidTaxNumber, parseReceiptDate } from "./checks";

describe("isValidTaxNumber", () => {
  it("örnek fişin VKN'sini geçerli sayar", () => {
    expect(isValidTaxNumber("1111111114")).toBe(true);
  });
  it("kontrol hanesi yanlış VKN'yi reddeder", () => {
    expect(isValidTaxNumber("0790014527")).toBe(false);
  });
  it("geçerli TCKN kabul eder", () => {
    expect(isValidTaxNumber("10000000146")).toBe(true);
  });
  it("hatalı uzunluk ve harf reddedilir", () => {
    expect(isValidTaxNumber("12345")).toBe(false);
    expect(isValidTaxNumber("07900145a6")).toBe(false);
    expect(isValidTaxNumber("00000000000")).toBe(false);
  });
});

describe("parseReceiptDate", () => {
  it.each([
    ["05.09.2026", "2026-09-05"],
    ["05/09/2026", "2026-09-05"],
    ["5-9-2026", "2026-09-05"],
  ])("%s -> %s", (input, expected) => {
    expect(parseReceiptDate(input)).toBe(expected);
  });
  it.each(["31.02.2026", "2026", "", "05.13.2026"])("geçersiz: %s", (input) => {
    expect(parseReceiptDate(input)).toBeNull();
  });
});
