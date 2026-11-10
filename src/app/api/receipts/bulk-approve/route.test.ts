import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ getReceipt: vi.fn(), transitionReceipt: vi.fn(), listFirmAccounts: vi.fn(async () => []) }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => "user-1" }));

const { getReceipt, transitionReceipt } = await import("@/db/queries");
const { POST } = await import("./route");

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const line = (debitKurus: number, creditKurus: number) => ({ accountCode: "770.08", debitKurus, creditKurus, documentNo: "0047", documentDate: "2026-09-05" });
const draft = (n: number, extra: object = {}) => ({ id: id(n), status: "draft", warnings: [], lines: [line(100, 0), line(0, 100)], ...extra });
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
    expect(await res.json()).toEqual({ approved: 1, skipped: 4 });
    expect(transitionReceipt).toHaveBeenCalledTimes(1);
    expect(transitionReceipt).toHaveBeenCalledWith("user-1", id(1), "draft", "approved");
  });

  it("boş ya da bozuk listeyi reddeder", async () => {
    expect((await call([])).status).toBe(400);
    expect((await call(["x"])).status).toBe(400);
  });
});
