import { describe, expect, it, vi } from "vitest";
import "../../../extension/gib-notices.js";

type Result = { error?: string; step?: string; status?: number; keys?: string[]; idNumbers?: string[]; name?: string | null; notices?: { gibId: string; readOnGib: boolean; institution: string }[]; envelopes?: { gibId: string; tarafSecureId: string }[] };
const { AccountieGib: gib } = globalThis as unknown as { AccountieGib: {
  idNumbers(u: unknown): string[];
  readNotices(storage: { getItem(k: string): string | null }, fetcher: typeof fetch): Promise<Result>;
  downloadNotice(env: unknown, storage: { getItem(k: string): string | null }, fetcher: typeof fetch): Promise<{ error?: string; step?: string; files?: { name: string; base64: string }[] }>;
  unwrapSigned(b: Uint8Array): Uint8Array | null;
  problem(r: Result): string;
} };

const store = (token: string | null) => ({ getItem: (k: string) => (k === "token" ? token : null) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const row = (id: number, read = false) => ({ tarafId: id, tarafSecureId: `ts${id}`, tebligId: 100 + id, tebligSecureId: `bs${id}`, kurumAciklama: "Gelir İdaresi Başkanlığı", altKurum: "Kadıköy VD", belgeTuruAciklama: "İhbarname", belgeNo: `B${id}`, gonderimZamani: "15/11/2026", tebligZamani: "20/11/2026", mukellefOkumaZamani: read ? "16/11/2026" : null });

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

  it("liste okuma yalnız user-info ve tebligat-listele çağırır; zarf açan, indiren, arşivleyen adreslere gidilmez", async () => {
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

  it("aynı tebligat iki kez gelirse liste okunurken değişmiş sayılır: bir kez baştan okunur, yine olursa hiçbir şey dönmez", async () => {
    const { fetcher } = fakeGib({ "0": [[row(1), row(1)]], "1": [] });
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r).toEqual({ error: "changed" });
    expect(gib.problem(r)).toMatch(/hiçbir şey kaydedilmedi/);
  });

  it("kimliksiz satır atılmaz, liste eksik sayılır", async () => {
    const { fetcher } = fakeGib({ "0": [[row(1), { kurumAciklama: "x" }]], "1": [] });
    expect(await gib.readNotices(store("gib-token"), fetcher)).toEqual({ error: "shape", step: "kimliksiz-satir" });
  });

  it("toplam sayfalar arasında değişirse baştan okunur; ikinci okuma tutarlıysa kabul edilir", async () => {
    let calls = 0;
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("user-info")) return json({ vkn: "1234567890" });
      const body = JSON.parse(String(init?.body));
      if (body.meta.filters[0].values[0] === "1") return json({ data: { tebligatDtoList: [] }, pageDetail: { total: 0 } });
      calls++;
      const page = body.meta.pagination.pageNo;
      // First pass: page 2 says 3 instead of 2 (a new notice arrived). Second pass: steady at 3.
      if (calls <= 2) return json({ data: { tebligatDtoList: [row(page)] }, pageDetail: { total: page === 1 ? 2 : 3 } });
      return json({ data: { tebligatDtoList: page === 1 ? [row(1), row(2), row(3)] : [] }, pageDetail: { total: 3 } });
    }) as unknown as typeof fetch;
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r.notices?.map((n) => n.gibId)).toEqual(["1", "2", "3"]);
  });

  it("toplamı aşan liste de eksiksiz sayılmaz", async () => {
    const { fetcher } = fakeGib({ "0": [[row(1), row(2), row(3)]], "1": [] }, undefined, { "0": 2 });
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r.error).toBe("shape");
  });

  it("zarf bilgileri okunur ama Accountie'ye giden tebligatta yer almaz", async () => {
    const { fetcher } = fakeGib({ "0": [[row(1)]], "1": [] });
    const r = await gib.readNotices(store("gib-token"), fetcher);
    expect(r.envelopes).toEqual([{ gibId: "1", docNo: "B1", tarafId: 1, tarafSecureId: "ts1", tebligId: 101, tebligSecureId: "bs1" }]);
    expect(JSON.stringify(r.notices)).not.toMatch(/ts1|bs1/);
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

  describe("zarf açıp belge indirme", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7 test");
    const env = { gibId: "1", docNo: "B1", tarafId: 1, tarafSecureId: "ts1", tebligId: 101, tebligSecureId: "bs1" };
    /** DER: tag, length, content. */
    const tlv = (tag: number, ...parts: Uint8Array[]) => {
      const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let o = 0;
      for (const p of parts) { body.set(p, o); o += p.length; }
      const len = body.length < 128 ? [body.length] : [0x82, body.length >> 8, body.length & 255];
      return new Uint8Array([tag, ...len, ...body]);
    };
    const oid = (hex: string) => tlv(0x06, Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16))));
    const signed = (inner: Uint8Array) => tlv(0x30, oid("2a864886f70d010702"), tlv(0xa0, tlv(0x30, tlv(0x02, new Uint8Array([1])), tlv(0x31), tlv(0x30, oid("2a864886f70d010701"), tlv(0xa0, tlv(0x04, inner))))));

    function fakeEnvelope(file: Uint8Array, link = "https://dijital.gib.gov.tr/apigateway/etebligat/report/download?id=x") {
      const calls: { url: string; body: unknown }[] = [];
      const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
        if (url.endsWith("/zarf-detay-sorgula")) return json({ data: { tarafId: 1 } });
        if (url.endsWith("/belge-ek-listele")) return json({ tebligBelge: { id: 7, secureId: "s7", belgeTip: "T", uzanti: "imz", adi: "İhbarname.imz" }, ekler: [] });
        if (url.endsWith("/belge-getir")) return json({ reportLink: link });
        return new Response(new Blob([file as Uint8Array<ArrayBuffer>]));
      });
      return { fetcher: fetcher as unknown as typeof fetch, calls };
    }

    it("portalın sırasıyla zarfı açar, belgeyi ister ve GİB'in verdiği bağlantıdan indirir", async () => {
      const { fetcher, calls } = fakeEnvelope(pdf);
      const r = await gib.downloadNotice(env, store("gib-token"), fetcher);
      expect(calls.map((c) => c.url.replace("https://dijital.gib.gov.tr/apigateway", ""))).toEqual([
        "/etebligat/etebligat/zarf-detay-sorgula", "/etebligat/etebligat/belge-ek-listele", "/etebligat/etebligat/belge-getir", "/etebligat/report/download?id=x",
      ]);
      expect(calls[0].body).toEqual({ tarafId: 1, tarafSecureId: "ts1" });
      expect(calls[1].body).toEqual({ tebligId: 101, tebligSecureId: "bs1" });
      expect(calls[2].body).toEqual({ data: { id: 7, secureId: "s7", belgeTip: "T", tarafId: 1, tarafSecureId: "ts1", uzanti: "imz", belgeAdi: "İhbarname.imz" } });
      expect(r.files).toEqual([{ name: "İhbarname.pdf", base64: Buffer.from(pdf).toString("base64") }]);
    });

    it("imzalı paket (CMS) açılıp içindeki PDF kaydedilir", async () => {
      expect(gib.unwrapSigned(signed(pdf))).toEqual(pdf);
      const { fetcher } = fakeEnvelope(signed(pdf));
      const r = await gib.downloadNotice(env, store("gib-token"), fetcher);
      expect(Buffer.from(r.files![0].base64, "base64").toString()).toBe("%PDF-1.7 test");
    });

    it("açılamayan paket kendi uzantısıyla olduğu gibi kaydedilir", async () => {
      const { fetcher } = fakeEnvelope(new Uint8Array([1, 2, 3]));
      expect((await gib.downloadNotice(env, store("gib-token"), fetcher)).files?.[0].name).toBe("İhbarname.imz");
    });

    it("GİB dışına giden indirme bağlantısı izlenmez; oturum anahtarı dışarı çıkmaz", async () => {
      const { fetcher, calls } = fakeEnvelope(pdf, "https://evil.example/x");
      expect(await gib.downloadNotice(env, store("gib-token"), fetcher)).toEqual({ error: "shape", step: "belge-adresi" });
      expect(calls.some((c) => c.url.includes("evil"))).toBe(false);
    });

    it("zarf kimliği eksikse GİB'e hiç gidilmez", async () => {
      const { fetcher, calls } = fakeEnvelope(pdf);
      expect(await gib.downloadNotice({ gibId: "1" }, store("gib-token"), fetcher)).toEqual({ error: "shape", step: "zarf-kimlik" });
      expect(calls).toEqual([]);
    });
  });
});
