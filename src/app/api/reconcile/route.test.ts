import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn() }));
vi.mock("@/db/queries", () => ({ listExportedForCheck: vi.fn() }));
vi.mock("@/lib/firm", () => ({ activeFirm: vi.fn(async () => ({ firm: { id: "firm-1", name: "ÖRNEK FİRMA", taxNumber: null } })) }));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn() }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const { activeFirm } = await import("@/lib/firm");
const { allow } = await import("@/lib/rate-limit");
const { POST } = await import("./route");

async function xlsx() {
  const b = new ExcelJS.Workbook();
  const s = b.addWorksheet("Muavin");
  s.addRow(["Hesap Kodu", "Evrak No", "Borç", "Alacak"]);
  s.addRow(["191.03.10", "412", 589.09, 0]);
  return new Uint8Array(await b.xlsx.writeBuffer() as ArrayBuffer);
}
function post(bytes: Uint8Array<ArrayBuffer> | null, ay: string | null = "2026-09", firma?: string) {
  const form = new FormData();
  if (bytes) form.set("dosya", new File([bytes], "muavin.xlsx"));
  if (ay) form.set("ay", ay);
  if (firma) form.set("firma", firma);
  return new Request("http://test/api/reconcile", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(session.getUserId).mockResolvedValue("user-a");
  vi.mocked(allow).mockResolvedValue(true);
  vi.mocked(q.listExportedForCheck).mockResolvedValue([
    { id: "a", vendorName: "ÖRNEK", documentNo: "0412", lines: [{ accountCode: "191.03.10", debitKurus: 58909, creditKurus: 0 }] },
  ]);
});

describe("POST /api/reconcile", () => {
  it("oturumsuz 401, sınır aşılınca 429", async () => {
    vi.mocked(session.getUserId).mockResolvedValueOnce(null);
    expect((await POST(post(await xlsx()))).status).toBe(401);
    vi.mocked(allow).mockResolvedValueOnce(false);
    expect((await POST(post(await xlsx()))).status).toBe(429);
    expect(q.listExportedForCheck).not.toHaveBeenCalled();
  });

  it("dosya ya da ay eksik/bozuksa 400, Excel değilse 415, okunamayan Excel 422", async () => {
    expect((await POST(post(null))).status).toBe(400);
    expect((await POST(post(await xlsx(), "2026-13"))).status).toBe(400);
    expect((await POST(post(new TextEncoder().encode("düz metin")))).status).toBe(415);
    expect((await POST(post(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])))).status).toBe(422);
  });

  it("yalnız kullanıcının seçili firmasının o ayını karşılaştırır", async () => {
    expect((await POST(post(await xlsx(), "2026-09", "baskasinin-firmasi"))).status).toBe(404);
    const res = await POST(post(await xlsx(), "2026-09", "firm-1"));
    expect(res.status).toBe(200);
    expect(activeFirm).toHaveBeenCalledWith("user-a", "firm-1");
    expect(q.listExportedForCheck).toHaveBeenCalledWith("user-a", "firm-1", "2026-09");
    const body = await res.json();
    expect(body.results.map((r: { kind: string }) => r.kind)).toEqual(["uyuyor"]);
    expect(body.rowCount).toBe(1);
  });
});
