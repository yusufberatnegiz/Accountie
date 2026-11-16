import { beforeEach, describe, expect, it, vi } from "vitest";

let user: string | null = "user-1";
vi.mock("@/db/queries", () => ({ deleteDrafts: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => user }));

const { deleteDrafts } = await import("@/db/queries");
const { POST } = await import("./route");

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const call = (body: unknown) => POST(new Request("http://test/api/receipts/bulk-delete", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => { vi.clearAllMocks(); user = "user-1"; });

describe("POST /api/receipts/bulk-delete", () => {
  it("yalnız oturum sahibinin taslaklarını, tekrarsız siler; silinmeyenleri sayar", async () => {
    vi.mocked(deleteDrafts).mockResolvedValue(1);
    const res = await call({ ids: [id(1), id(2), id(1)] });
    expect(await res.json()).toEqual({ deleted: 1, skipped: 1 });
    expect(deleteDrafts).toHaveBeenCalledWith("user-1", [id(1), id(2)]);
  });

  it("oturum yoksa 401, geçersiz istekte 400 döner ve hiçbir şey silmez", async () => {
    user = null;
    expect((await call({ ids: [id(1)] })).status).toBe(401);
    user = "user-1";
    expect((await call({ ids: [] })).status).toBe(400);
    expect((await call({ ids: ["1; drop table receipts"] })).status).toBe(400);
    expect(deleteDrafts).not.toHaveBeenCalled();
  });
});
