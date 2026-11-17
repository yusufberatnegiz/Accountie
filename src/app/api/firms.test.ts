import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn() }));
vi.mock("@/db/queries", () => ({ listFirms: vi.fn(), deleteVendorRule: vi.fn() }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const { POST: activate } = await import("./firms/active/route");

const MINE = { id: "00000000-0000-4000-9000-000000000001", name: "ÖRNEK BALIK LOKANTASI", taxNumber: null };
const post = (body: unknown) => new Request("http://localhost/api/firms", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(session.getUserId).mockResolvedValue("user-a");
  vi.mocked(q.listFirms).mockResolvedValue([MINE]);
});

describe("POST /api/firms/active", () => {
  it("yalnız kullanıcının kendi firmasına geçer", async () => {
    const ok = await activate(post({ id: MINE.id }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toContain(`firma=${MINE.id}`);
    const other = await activate(post({ id: "00000000-0000-4000-9000-000000000099" }));
    expect(other.status).toBe(404);
    expect(other.headers.get("set-cookie")).toBeNull();
  });
});

describe("DELETE /api/vendor-rules/[id]", () => {
  it("yalnız kullanıcının kendi öğrenilen kuralını siler, başkasınınkinde 404", async () => {
    const q2 = await import("@/db/queries");
    const { DELETE } = await import("./vendor-rules/[id]/route");
    const id = "00000000-0000-4000-a000-000000000001";
    const call = () => DELETE(new Request("http://test", { method: "DELETE" }), { params: Promise.resolve({ id }) });
    vi.mocked(q2.deleteVendorRule).mockResolvedValueOnce(true);
    expect((await call()).status).toBe(200);
    expect(q2.deleteVendorRule).toHaveBeenCalledWith("user-a", id);
    vi.mocked(q2.deleteVendorRule).mockResolvedValueOnce(false);
    expect((await call()).status).toBe(404);
    vi.mocked(session.getUserId).mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });
});
