import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", async () => {
  const { DEFAULT_PLAN, DEFAULT_RULES } = await import("@/lib/default-rules");
  return { getReceipt: vi.fn(), transitionReceipt: vi.fn(), getRules: vi.fn(async () => ({ rules: DEFAULT_RULES, rows: [], plan: [...DEFAULT_PLAN] })), learnVendorRule: vi.fn(async () => {}) };
});
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => "user-1" }));

const { getReceipt, getRules, learnVendorRule, transitionReceipt } = await import("@/db/queries");
const { POST } = await import("./route");
const { DEFAULT_PLAN, DEFAULT_RULES } = await import("@/lib/default-rules");

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const line = (debitKurus: number, creditKurus: number) => ({ accountCode: "770.08", accountName: "Yeme-İçme ve Ağırlama Giderleri", debitKurus, creditKurus, documentNo: "0047", documentDate: "2026-09-05" });
const draft = (n: number, extra: object = {}) => ({ id: id(n), status: "draft", firmId: "firm-1", warnings: [], lines: [line(100, 0), line(0, 100)], ...extra });
const call = (ids: string[]) => POST(new Request("http://test/api/receipts/bulk-approve", { method: "POST", body: JSON.stringify({ ids }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(transitionReceipt).mockResolvedValue(true);
});

describe("POST /api/receipts/bulk-approve", () => {
  it("yalnız uyarısız ve dengeli taslakları onaylar", async () => {
    const rows: Record<string, unknown> = {
      [id(1)]: draft(1),
      [id(2)]: draft(2, { warnings: [{ code: "total_mismatch" }] }),
      [id(3)]: draft(3, { lines: [line(100, 0), line(0, 90)] }),
      [id(4)]: draft(4, { status: "approved" }),
    };
    vi.mocked(getReceipt).mockImplementation(async (_u, i) => rows[i] as never);
    const res = await call([id(1), id(2), id(3), id(4), id(5)]);
    expect(await res.json()).toEqual({ approved: 1, skipped: 4, stopped: false });
    expect(transitionReceipt).toHaveBeenCalledTimes(1);
    expect(transitionReceipt).toHaveBeenCalledWith("user-1", id(1), "draft", "approved");
  });

  it("tek onay gibi satıcıya hesabını öğretir, firmanın kurallarını bir kez okur", async () => {
    const rows: Record<string, unknown> = {
      [id(1)]: draft(1, { firmId: "firm-1", taxNumber: "1111111114", vendorName: "BİM", category: "other" }),
      [id(2)]: draft(2, { firmId: "firm-1" }),
    };
    vi.mocked(getReceipt).mockImplementation(async (_u, i) => rows[i] as never);
    expect(await (await call([id(1), id(2)])).json()).toMatchObject({ approved: 2 });
    expect(getRules).toHaveBeenCalledTimes(1);
    expect(learnVendorRule).toHaveBeenCalledWith("user-1", "firm-1", "1111111114", "BİM", expect.objectContaining({ code: "770.08" }));
  });

  it("yarıda hata olunca onaylananları sayar ve durduğunu söyler", async () => {
    vi.mocked(getReceipt).mockImplementation(async (_u, i) => { if (i === id(2)) throw new Error("db"); return draft(1) as never; });
    expect(await (await call([id(1), id(2), id(3)])).json()).toEqual({ approved: 1, skipped: 2, stopped: true });
  });

  it("Luca planı olmayan, firmasız ya da planda başka anlamdaki kodlu taslağı onaylamaz", async () => {
    const rows: Record<string, unknown> = {
      [id(1)]: draft(1, { firmId: "plansiz" }),
      [id(2)]: draft(2, { firmId: null }),
      [id(3)]: draft(3, { lines: [{ ...line(100, 0), accountName: "Kırtasiye Giderleri" }, line(0, 100)] }),
    };
    vi.mocked(getReceipt).mockImplementation(async (_u, i) => rows[i] as never);
    vi.mocked(getRules).mockImplementation(async (_u, firmId) => ({ rules: DEFAULT_RULES, rows: [], plan: firmId === "plansiz" ? [] : [...DEFAULT_PLAN] }));
    expect(await (await call([id(1), id(2), id(3)])).json()).toEqual({ approved: 0, skipped: 3, stopped: false });
    expect(transitionReceipt).not.toHaveBeenCalled();
  });

  it("boş ya da bozuk listeyi reddeder", async () => {
    expect((await call([])).status).toBe(400);
    expect((await call(["x"])).status).toBe(400);
  });
});
