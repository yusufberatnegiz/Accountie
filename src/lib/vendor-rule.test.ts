import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./default-rules";
import { learnedAccount, withVendorAccount } from "./vendor-rule";

const meal = DEFAULT_RULES.expense.meal;
const l = (accountCode: string, debitKurus: number, accountName = "x") => ({ accountCode, accountName, debitKurus });

describe("satıcı kuralı", () => {
  it("yalnız kategoriden farklı gider hesabını öğrenir, 191'i gider saymaz", () => {
    expect(learnedAccount([l("191.03.10", 100), l("770.05", 900, "Ulaşım"), l("331.01", 0)], meal)).toEqual({ code: "770.05", name: "Ulaşım" });
    expect(learnedAccount([l(meal.code, 900), l("191.03.10", 100)], meal)).toBeNull();
    expect(learnedAccount([l("191.03.10", 100), l("331.01", 0)], meal)).toBeUndefined();
  });

  it("öğrenilen hesabı yalnız o fişin kategorisine koyar", () => {
    const rules = withVendorAccount(DEFAULT_RULES, "meal", { code: "770.05", name: "Ulaşım" });
    expect(rules.expense.meal.code).toBe("770.05");
    expect(rules.expense.fuel).toEqual(DEFAULT_RULES.expense.fuel);
    expect(withVendorAccount(DEFAULT_RULES, "meal", null)).toBe(DEFAULT_RULES);
  });
});
