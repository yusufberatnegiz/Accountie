import { describe, expect, it } from "vitest";
import { formatTrAmount, parseTrAmount, vatFromGross } from "./money";

describe("parseTrAmount", () => {
  it.each([
    ["8.725,00", 872500],
    ["793,18", 79318],
    ["1.234.567,89", 123456789],
    ["12,5", 1250],
    ["*8.725,00", 872500],
    ["8725", 872500],
    [" 0,07 ", 7],
  ])("%s -> %i kuruş", (input, expected) => {
    expect(parseTrAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "1,234", "8.72,00", "1.2.3", "-5,00", "12,345"])("geçersiz: %s", (input) => {
    expect(() => parseTrAmount(input)).toThrow();
  });
});

describe("formatTrAmount", () => {
  it.each([
    [793182, "7.931,82"],
    [79318, "793,18"],
    [872500, "8.725,00"],
    [7, "0,07"],
    [0, "0,00"],
    [123456789, "1.234.567,89"],
    [-150, "-1,50"],
  ])("%i -> %s", (input, expected) => {
    expect(formatTrAmount(input)).toBe(expected);
  });
});

describe("vatFromGross", () => {
  it("örnek fişin KDV'sini verir", () => {
    expect(vatFromGross(872500, 10)).toBe(79318);
  });
  it("yarım kuruşu yukarı yuvarlar", () => {
    // 11 * 10 / 110 = 1 exactly; 55 * 10 / 110 = 5; 165 * 1 / 101 = 1.633 -> 2
    expect(vatFromGross(165, 1)).toBe(2);
    // 105 * 10 / 110 = 9.545 -> 10
    expect(vatFromGross(105, 10)).toBe(10);
    // 99 * 10 / 110 = 9.0 exactly
    expect(vatFromGross(99, 10)).toBe(9);
  });
  it("%0 için sıfır", () => {
    expect(vatFromGross(10000, 0)).toBe(0);
  });
});
