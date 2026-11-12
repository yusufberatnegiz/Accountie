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

  it("preview rows carry the expense account like the SQL list", () => {
    const first = PREVIEW_LIST.find((r) => r.receiptNo === "0412");
    expect(first).toMatchObject({ expenseCode: "770.08" });
    expect(PREVIEW_LIST).toHaveLength(PREVIEW_RECEIPTS.length);
  });

  it("takes each receipt's 191 VAT debits", () => {
    expect(PREVIEW_LIST.find((r) => r.receiptNo === "0412")).toMatchObject({ vatKurus: 58909 });
    // A foreign invoice's KDV (sorumlu sıfatıyla) comes on top of what was paid: 20% of the whole amount.
    expect(PREVIEW_LIST.find((x) => x.category === "foreign")).toMatchObject({ vatKurus: 100216, totalKurus: 501078 });
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
