import { describe, expect, it } from "vitest";
import { approvalProblem } from "@/lib/journal";
import { PREVIEW_RECEIPTS } from "@/lib/preview-fixtures";
import { problemTarget } from "./ReviewEditor";

describe("problemTarget", () => {
  it("sends each approval problem to the field that fixes it", () => {
    expect(problemTarget("Evrak tarihi eksik.")).toEqual({ id: "evrak-tarihi", action: "Evrak tarihini girin" });
    expect(problemTarget("Evrak no eksik.").id).toBe("evrak-no");
    expect(problemTarget("2. satırda hesap kodu yok.").id).toBe("satir-2-kod");
    expect(problemTarget("3. satırda tutar yok.").id).toBe("satir-3-borc");
    expect(problemTarget("Borç ile alacak farkı 27,00 TL.").id).toBe("satir-1-borc");
    expect(problemTarget("Satır yok.").id).toBe("satir-ekle");
  });

  it("an imbalance goes to the first line of the side that differs from the receipt total", () => {
    const l = (debitKurus: number, creditKurus: number) => ({ accountCode: "770.08", accountName: "", debitKurus, creditKurus, documentNo: "1", documentDate: "2026-09-05", documentType: "ÖK", description: "", quantity: 1, babs: false });
    const lines = [l(793182, 0), l(79318, 0), l(0, 875200)];
    expect(problemTarget("Borç ile alacak farkı 27,00 TL.", lines, 872500)).toEqual({ id: "satir-3-alacak", action: "3. satırın alacağını düzeltin" });
    expect(problemTarget("Borç ile alacak farkı 27,00 TL.", [l(793182, 0), l(82018, 0), l(0, 872500)], 872500)).toEqual({ id: "satir-1-borc", action: "1. satırın borcunu düzeltin" });
    expect(problemTarget("Borç ile alacak farkı 27,00 TL.", lines, null).action).toBe("Tutarları düzeltin");
  });

  it("the OPET preview is blocked by its missing date", () => {
    const opet = PREVIEW_RECEIPTS.find((r) => r.receiptNo === "1182")!;
    expect(problemTarget(approvalProblem(opet.lines)!).id).toBe("evrak-tarihi");
  });
});
