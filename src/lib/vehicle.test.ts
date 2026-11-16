import { describe, expect, it } from "vitest";
import { fromPassengerCar, isPassengerCar, toPassengerCar } from "./vehicle";

const KKEG = { code: "689.02", name: "Kanunen Kabul Edilmeyen Giderler" };
const l = (accountCode: string, debitKurus: number, creditKurus = 0) => ({ accountCode, accountName: accountCode, debitKurus, creditKurus, documentNo: "0040" });
// 1.000,00 TL motorin, %20 KDV, kasadan.
const fuel = [l("770.01", 83333), l("191.03.20", 16667), l("100.01", 0, 100000)];
const make = (from: (typeof fuel)[number]) => ({ ...from });
const sum = (ls: { debitKurus: number }[]) => ls.reduce((s, x) => s + x.debitKurus, 0);

describe("binek araç", () => {
  it("giderin ve KDV'nin %30'unu KKEG satırına taşır, alacaktan önce; borç ve alacak eşit kalır", () => {
    const out = toPassengerCar(fuel, KKEG, make);
    expect(out.map((x) => [x.accountCode, x.debitKurus, x.creditKurus])).toEqual([
      ["770.01", 58333, 0], ["191.03.20", 11667, 0], ["689.02", 30000, 0], ["100.01", 0, 100000],
    ]);
    expect(out[2].documentNo).toBe("0040");
    expect(sum(out)).toBe(100000);
    expect(isPassengerCar(out, KKEG)).toBe(true);
  });

  it("ticariye dönünce satırlar ilk hâline gelir", () => {
    expect(fromPassengerCar(toPassengerCar(fuel, KKEG, make), KKEG)).toEqual(fuel);
  });

  it("iki oranlı fişte de dengeyi korur, iki kez binek yapmaz", () => {
    const two = [l("770.07", 41667), l("191.03.20", 8333), l("770.07", 9901), l("191.03.01", 99), l("100.01", 0, 60000)];
    const once = toPassengerCar(two, KKEG, make);
    expect(sum(once)).toBe(60000);
    expect(toPassengerCar(once, KKEG, make)).toEqual(once);
    const back = fromPassengerCar(once, KKEG);
    expect(sum(back)).toBe(60000);
    expect(back.map((x) => x.debitKurus)).toEqual([41667, 8333, 9901, 99, 0]);
  });

  it("ilk satırlar verilince kuruş kayması olmadan geri döner (1.750,50 TL)", () => {
    const read = [l("770.01", 145875), l("191.03.20", 29175), l("100.01", 0, 175050)];
    const once = toPassengerCar(read, KKEG, make);
    expect(fromPassengerCar(once, KKEG, read).map((x) => x.debitKurus)).toEqual([145875, 29175, 0]);
    expect(sum(fromPassengerCar(once, KKEG))).toBe(175050);
  });
});

describe("KKEG satırı tanıma", () => {
  it("firmanın KKEG kodu 689 dışında olsa da satır tanınır; KKEG hesabı yoksa bölünmez", () => {
    const other = { code: "770.00", name: "Kanunen Kabul Edilmeyen Giderler" };
    const once = toPassengerCar(fuel, other, make);
    expect(isPassengerCar(once, other)).toBe(true);
    // Read back with no rule at hand (the list, the server): the name does not count: the server reads the stored choice.
    expect(isPassengerCar(once, { code: "", name: "" })).toBe(false);
    expect(toPassengerCar(fuel, { code: "", name: "" }, make)).toEqual(fuel);
  });
});

describe("jüri turu 3: KKEG adı", () => {
  it("'Binek Araç Giderleri' ve 'Gider Kısıtlamasına Tabi' sıradan gider hesabıdır; KKEG ad ya da kodla tanınır", () => {
    const kkeg = { code: "689.01", name: "KKEG" };
    const plain = [l("770.10", 10000), l("191.03.20", 2000), l("331.01", 0, 12000)].map((x, i) => (i === 0 ? { ...x, accountName: "Binek Araç Giderleri" } : x));
    expect(isPassengerCar(plain, kkeg)).toBe(false);
    // Ticari never removes an expense line for its name.
    expect(fromPassengerCar(plain, kkeg)).toEqual(plain);
    expect(isPassengerCar([{ ...l("770.01.10", 300), accountName: "Binek Oto Gider Kısıtlamasına Tabi Giderler" }], kkeg)).toBe(false);
    // The firm's KKEG account under 770, by its code, beside the expense it was split from.
    expect(isPassengerCar([l("770.10", 700), { ...l("770.99", 300), accountName: "BİNEK ARAÇ GİDER KISITLAMASI" }], { code: "770.99", name: "x" })).toBe(true);
    // A line that is the whole expense is never a split, whatever its name or code.
    expect(isPassengerCar([{ ...l("689.01", 300) }, { ...l("100.01", 0, 300) }], { code: "689.01", name: "x" })).toBe(false);
  });
});

describe("jüri turu 5: KKEG", () => {
  it("adında KKEG geçen gider satırı binek sayılmaz ve Ticari onu silmez", () => {
    const kkeg = { code: "689.01", name: "KKEG" };
    const lines = [{ ...l("770.01.01", 100000), accountName: "AKARYAKIT KKEG" }, l("191.03.20", 20000), l("100.01", 0, 120000)];
    expect(isPassengerCar(lines, kkeg)).toBe(false);
    expect(fromPassengerCar(lines, kkeg)).toEqual(lines);
  });
  it("689 dışındaki KKEG kodu (770.00) bölmede tanınır ve Ticari onu geri alır", () => {
    const kkeg = { code: "770.00", name: "Kanunen Kabul Edilmeyen Giderler" };
    const once = toPassengerCar(fuel, kkeg, make);
    expect(isPassengerCar(once, kkeg)).toBe(true);
    expect(fromPassengerCar(once, kkeg, fuel)).toEqual(fuel);
  });
});
