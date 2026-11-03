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

  it("the OPET preview is blocked by its missing date", () => {
    const opet = PREVIEW_RECEIPTS.find((r) => r.receiptNo === "1182")!;
    expect(problemTarget(approvalProblem(opet.lines)!).id).toBe("evrak-tarihi");
  });
});
