import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn() }));
vi.mock("@/db/queries", () => ({ listFirms: vi.fn(), createFirm: vi.fn(), deleteVendorRule: vi.fn() }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const { POST: create } = await import("./firms/route");
const { POST: activate } = await import("./firms/active/route");

const MINE = { id: "00000000-0000-4000-9000-000000000001", name: "ÖRNEK BALIK LOKANTASI", taxNumber: null };
const post = (body: unknown) => new Request("http://localhost/api/firms", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(session.getUserId).mockResolvedValue("user-a");
  vi.mocked(q.listFirms).mockResolvedValue([MINE]);
  vi.mocked(q.createFirm).mockImplementation(async (_u, name, taxNumber) => ({ id: "00000000-0000-4000-9000-000000000002", name, taxNumber }));
});

describe("POST /api/firms", () => {
  it("oturumsuz 401", async () => {
    vi.mocked(session.getUserId).mockResolvedValue(null);
    expect((await create(post({ name: "ÖRNEK KIRTASİYE" }))).status).toBe(401);
  });

  it("firmayı ekler ve panelin firması yapar", async () => {
    const res = await create(post({ name: "  ÖRNEK KIRTASİYE  ", taxNumber: "1111111114" }));
    expect(res.status).toBe(201);
    expect(q.createFirm).toHaveBeenCalledWith("user-a", "ÖRNEK KIRTASİYE", "1111111114");
    expect(res.headers.get("set-cookie")).toMatch(/firma=00000000-0000-4000-9000-000000000002;.*HttpOnly/i);
  });

  it("geçersiz VKN'yi ve aynı adı reddeder", async () => {
    expect((await create(post({ name: "ÖRNEK KIRTASİYE", taxNumber: "1111111115" }))).status).toBe(400);
    expect((await create(post({ name: "örnek balık lokantası" }))).status).toBe(409);
    expect(q.createFirm).not.toHaveBeenCalled();
  });
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
