import { describe, expect, it, vi } from "vitest";
import "../../../extension/gib-notices.js";

type Result = { error?: string; step?: string; status?: number; keys?: string[]; idNumbers?: string[]; name?: string | null; notices?: { gibId: string; readOnGib: boolean; institution: string }[] };
const { AccountieGib: gib } = globalThis as unknown as { AccountieGib: {
  idNumbers(u: unknown): string[];
  readNotices(storage: { getItem(k: string): string | null }, fetcher: typeof fetch): Promise<Result>;
  problem(r: Result): string;
} };

const store = (token: string | null) => ({ getItem: (k: string) => (k === "token" ? token : null) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const row = (id: number, read = false) => ({ tarafId: id, kurumAciklama: "Gelir İdaresi Başkanlığı", altKurum: "Kadıköy VD", belgeTuruAciklama: "İhbarname", belgeNo: `B${id}`, gonderimZamani: "15/11/2026", tebligZamani: "20/11/2026", mukellefOkumaZamani: read ? "16/11/2026" : null });

/** A fake GİB: user-info, then the list by archive filter and page. Records every URL asked. */
function fakeGib(lists: Record<string, unknown[][]>, user: unknown = { vkn: "1234567890", unvan: "ÖRNEK LTD" }, total?: Record<string, number>) {
  const urls: string[] = [];
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    urls.push(url);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer gib-token");
    if (url.endsWith("/auth/tdvd/user-info")) return json(user);
    const body = JSON.parse(String(init?.body));
    const archived = body.meta.filters[0].values[0];
    const page = lists[archived]?.[body.meta.pagination.pageNo - 1] ?? [];
    return json({ data: { tebligatDtoList: page }, pageDetail: { total: total?.[archived] ?? lists[archived]?.flat().length ?? 0 } });
  });
  return { fetcher: fetcher as unknown as typeof fetch, urls };
}

describe("eklenti: Dijital Vergi Dairesi e-Tebligat okuma", () => {
  it("oturum yoksa GİB'e hiç gidilmez", async () => {
    const { fetcher, urls } = fakeGib({});
    expect(await gib.readNotices(store(null), fetcher)).toEqual({ error: "login" });
    expect(urls).toEqual([]);
  });

  it("yalnız user-info ve tebligat-listele çağrılır; zarf açan, indiren, arşivleyen adreslere gidilmez", async () => {
    const { fetcher, urls } = fakeGib({ "0": [[row(1), row(2, true)]], "1": [[row(3, true)]] });
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r.idNumbers).toEqual(["1234567890"]);
    expect(r.name).toBe("ÖRNEK LTD");
    expect(r.notices?.map((n) => [n.gibId, n.readOnGib])).toEqual([["1", false], ["2", true], ["3", true]]);
    for (const u of urls) expect(u).toMatch(/\/(auth\/tdvd\/user-info|etebligat\/etebligat\/tebligat-listele)$/);
    expect(urls.join(" ")).not.toMatch(/zarf|belge-getir|belge-ek|arsiv-islemleri|alt-kullanici/);
  });

  it("GİB istenenden küçük sayfa verse de toplam kadar sayfalanır", async () => {
    const pages = [Array.from({ length: 50 }, (_, i) => row(i + 1)), Array.from({ length: 50 }, (_, i) => row(i + 51)), [row(101)]];
    const { fetcher } = fakeGib({ "0": pages, "1": [] });
    expect((await gib.readNotices(store("gib-token"), fetcher)).notices).toHaveLength(101);
  });

  it("aynı tebligat iki kez gelirse bir kez sayılır, kimliksiz satır atılır", async () => {
    const { fetcher } = fakeGib({ "0": [[row(1), row(1), { kurumAciklama: "x" }]], "1": [] });
    expect((await gib.readNotices(store("gib-token"), fetcher)).notices).toHaveLength(1);
  });

  it("boş liste (dizi yok, sayı 0) hata değildir", async () => {
    const fetcher = vi.fn(async (url: string) => (url.endsWith("user-info") ? json({ vkn: "1234567890" }) : json({ data: { count: 0 }, pageDetail: { total: 0 } }))) as unknown as typeof fetch;
    expect((await gib.readNotices(store("gib-token"), fetcher)).notices).toEqual([]);
  });

  it("GİB'in 200 ile döndüğü hata (data null, messages) boş liste sayılmaz, hiçbir şey kaydedilmez", async () => {
    const fetcher = vi.fn(async (url: string) => (url.endsWith("user-info") ? json({ vkn: "1234567890" }) : json({ data: null, messages: [{ type: "ERROR" }] }))) as unknown as typeof fetch;
    expect((await gib.readNotices(store("gib-token"), fetcher)).error).toBe("shape");
  });

  it("GİB'in toplamından önce biten liste eksik okumadır, hata verir", async () => {
    const { fetcher } = fakeGib({ "0": [[row(1), row(2)]], "1": [] }, undefined, { "0": 150 });
    expect((await gib.readNotices(store("gib-token"), fetcher)).error).toBe("shape");
  });

  it("2000'den çok tebligat kırpılmaz, hiç kaydedilmez", async () => {
    const pages = Array.from({ length: 21 }, (_, p) => Array.from({ length: 100 }, (_, i) => row(p * 100 + i + 1)));
    const { fetcher } = fakeGib({ "0": pages, "1": [] });
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r.error).toBe("too-many");
    expect(gib.problem(r)).toMatch(/hiçbir şey kaydedilmedi/);
  });

  it("tam 2000 tebligat eksiksiz okunur (sınır aşılmadıkça hata yok)", async () => {
    const pages = Array.from({ length: 20 }, (_, p) => Array.from({ length: 100 }, (_, i) => row(p * 100 + i + 1)));
    const { fetcher } = fakeGib({ "0": pages, "1": [] });
    expect((await gib.readNotices(store("gib-token"), fetcher)).notices).toHaveLength(2000);
  });

  it("Geçiş Yap'la VKN'siz firmaya geçilince ayrı ve açık hata, GİB listesi istenmez", async () => {
    const { fetcher, urls } = fakeGib({}, { tckn: "12345678901", gecisYapildiMi: true });
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r).toEqual({ error: "switch-no-vkn" });
    expect(gib.problem(r)).toMatch(/kendi hesabıyla/);
    expect(urls.some((u) => u.includes("tebligat-listele"))).toBe(false);
  });

  it("GİB 5xx: geçici kesinti denir", () => {
    expect(gib.problem({ error: "http", step: "user-info", status: 503 })).toMatch(/şu an yanıt vermiyor/);
  });

  it("değişmiş yanıt: içerik değil yalnız alan adları ve adım bildirilir", async () => {
    const fetcher = vi.fn(async (url: string) => (url.endsWith("user-info") ? json({ vkn: "1234567890" }) : json({ data: { yeniListe: [{ gizli: "x" }] }, messages: [] }))) as unknown as typeof fetch;
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r).toEqual({ error: "shape", step: "tebligat-listele", keys: ["data", "messages", "data.yeniListe"] });
    expect(gib.problem(r)).toMatch(/adım tebligat-listele; alanlar data, messages, data.yeniListe/);
    expect(gib.problem(r)).not.toContain("gizli");
  });

  it("GİB 401 verirse oturum kapanmış denir", async () => {
    const fetcher = vi.fn(async () => json({}, 401)) as unknown as typeof fetch;
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r).toEqual({ error: "http", step: "user-info", status: 401 });
    expect(gib.problem(r)).toMatch(/oturumu kapanmış/);
  });

  it("numaralar: önce VKN; Geçiş Yap'tan sonra yalnız firmanın VKN'si (TCKN müşavirin olabilir); biçim dışı atılır", () => {
    expect(gib.idNumbers({ vkn: "1234567890", tckn: "12345678901" })).toEqual(["1234567890", "12345678901"]);
    expect(gib.idNumbers({ vkn: "1234567890", tckn: "12345678901", gecisYapildiMi: true })).toEqual(["1234567890"]);
    expect(gib.idNumbers({ tckn: "12345678901" })).toEqual(["12345678901"]);
    // After a switch a lone TCKN is not used (it may be the müşavir's); a "false" string is not a switch.
    expect(gib.idNumbers({ tckn: "12345678901", gecisYapildiMi: true })).toEqual([]);
    expect(gib.idNumbers({ vkn: "1234567890", tckn: "12345678901", gecisYapildiMi: "false" })).toEqual(["1234567890", "12345678901"]);
    expect(gib.idNumbers({ vkn: "12'; x", tckn: null })).toEqual([]);
  });
});
