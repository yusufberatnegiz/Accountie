import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { listFinding } from "./status";
import { PREVIEW_LIST, PREVIEW_RECEIPTS } from "./preview-fixtures";

describe("panel list", () => {
  it("states what waits, from the counts", () => {
    expect(listFinding(2, 1)).toBe("2 taslak kontrol bekliyor. 1 onaylı fiş Luca dosyasına hazır.");
    expect(listFinding(0, 3)).toBe("3 onaylı fiş Luca dosyasına hazır.");
    expect(listFinding(0, 0)).toMatch(/^Bekleyen fiş yok/);
  });

  it("preview rows carry the expense account and line count like the SQL list", () => {
    const first = PREVIEW_LIST.find((r) => r.receiptNo === "0047");
    expect(first).toMatchObject({ expenseCode: "770.08", lineCount: 3 });
    expect(PREVIEW_LIST).toHaveLength(PREVIEW_RECEIPTS.length);
  });

  it("splits each receipt's debits into matrah and 191 VAT, which add up to the total", () => {
    expect(PREVIEW_LIST.find((r) => r.receiptNo === "0047")).toMatchObject({ expenseKurus: 793182, vatKurus: 79318 });
    for (const r of PREVIEW_LIST) expect(r.expenseKurus + r.vatKurus).toBe(r.totalKurus);
  });
});

describe("routes moved under /panel", () => {
  it("old bookmarks redirect permanently", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "/fis/:id", destination: "/panel/fis/:id", permanent: true }),
      expect.objectContaining({ source: "/kurallar", destination: "/panel/kurallar", permanent: true }),
    ]));
  });
});
