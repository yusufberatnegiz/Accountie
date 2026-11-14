import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ setupStatus: vi.fn(async () => ({ connected: true, lucaFirms: 3 })) }));
const session = vi.hoisted(() => ({ id: "user-1" as string | null }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => session.id }));
const { GET } = await import("./route");
const q = await import("@/db/queries");

describe("GET /api/kurulum", () => {
  it("oturumsuz 401", async () => {
    session.id = null;
    expect((await GET()).status).toBe(401);
    session.id = "user-1";
  });

  it("anahtar ve Luca'dan gelen firma sayısını kendi kullanıcısı için döner, önbelleğe alınmaz", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ connected: true, lucaFirms: 3 });
    expect(q.setupStatus).toHaveBeenCalledWith("user-1");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
