import { describe, expect, it } from "vitest";
import { parseGibCalendarResponse } from "./gib";

const fixture = {
  status: 200,
  resultContainer: [{
    id: 7972,
    title: "Katma Değer Vergisinin Beyan ve Ödemesi",
    description: "Temmuz 2026 Dönemine Ait Katma Değer Vergisinin Beyanı ve Ödemesi",
    startdate: "2026-08-01T00:00:00",
    stopdate: "2026-08-28T00:00:00",
    priority: 1,
    taxType: "Katma Değer Vergisi",
    periodDescription: "Temmuz 2026 Dönemi",
    subject: "Beyan ve Ödeme",
  }],
};

describe("GİB calendar parser", () => {
  it("normalizes the official API response", () => {
    expect(parseGibCalendarResponse(fixture)).toEqual([expect.objectContaining({
      externalKey: "7972",
      dueOn: "2026-08-28",
      actionType: "Beyan ve Ödeme",
      sourceUrl: "https://www.gib.gov.tr/vergi-takvimi",
    })]);
  });

  it("fails closed when the source contract changes", () => {
    expect(() => parseGibCalendarResponse({ status: 200, resultContainer: [{ id: 1 }] })).toThrow();
  });
});
