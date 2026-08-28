import { describe, expect, it } from "vitest";
import { assertOfficialUrl } from "./official-fetch";

describe("official source allowlist", () => {
  it("accepts known official hosts", () => {
    expect(assertOfficialUrl("https://gib.gov.tr/vergi-takvimi").hostname).toBe("gib.gov.tr");
  });

  it.each([
    "http://gib.gov.tr/vergi-takvimi",
    "https://gib.gov.tr.example.com/vergi-takvimi",
    "https://example.com/?next=gib.gov.tr",
  ])("rejects non-official URL %s", (url) => {
    expect(() => assertOfficialUrl(url)).toThrow("İzin verilmeyen kaynak");
  });
});
