import { deflateRawSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RULES } from "@/lib/default-rules";
import { invoiceXml } from "@/lib/efatura.test";

vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn() }));
vi.mock("@/db/queries", () => ({ createReceipt: vi.fn(), getRules: vi.fn(), getVendorRule: vi.fn(), hasDuplicateReceipt: vi.fn() }));
vi.mock("@/lib/firm", () => ({ activeFirm: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn() }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const { activeFirm } = await import("@/lib/firm");
const { allow } = await import("@/lib/rate-limit");
const { POST } = await import("./route");

const FIRM = { id: "firm-1", name: "ÖRNEK FİRMA", taxNumber: "1111111114" };

/** A minimal zip (deflated entries), like the GİB portal's download. */
function zip(entries: { name: string; data: Buffer; declared?: number }[]): Buffer {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const body = deflateRawSync(e.data), name = Buffer.from(e.name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(e.declared ?? e.data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(e.declared ?? e.data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, name, body); centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
function post(data: Buffer | string | null, firma?: string) {
  const form = new FormData();
  if (data !== null) form.set("dosya", new File([typeof data === "string" ? data : new Uint8Array(data)], "faturalar"));
  if (firma) form.set("firma", firma);
  return new Request("http://test/api/efatura", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(session.getUserId).mockResolvedValue("user-a");
  vi.mocked(allow).mockResolvedValue(true);
  vi.mocked(activeFirm).mockResolvedValue({ firms: [FIRM], firm: FIRM });
  vi.mocked(q.getRules).mockResolvedValue({ rules: DEFAULT_RULES, rows: [] });
  vi.mocked(q.getVendorRule).mockResolvedValue(null);
  vi.mocked(q.hasDuplicateReceipt).mockResolvedValue(false);
  vi.mocked(q.createReceipt).mockResolvedValue("r1");
});

describe("POST /api/efatura", () => {
  it("oturumsuz 401, sınır aşılınca 429, dosyasız 400, XML/zip değilse 415", async () => {
    vi.mocked(session.getUserId).mockResolvedValueOnce(null);
    expect((await POST(post(invoiceXml()))).status).toBe(401);
    vi.mocked(allow).mockResolvedValueOnce(false);
    expect((await POST(post(invoiceXml()))).status).toBe(429);
    expect((await POST(post(null))).status).toBe(400);
    expect((await POST(post(Buffer.from([0xff, 0xd8, 0xff, 0xe0])))).status).toBe(415);
    expect(q.createReceipt).not.toHaveBeenCalled();
  });

  it("tek XML'i seçili firmanın taslağı yapar: 320 alacak, BT FT, satıcı VKN'si, uyarı", async () => {
    expect((await POST(post(invoiceXml(), "baskasinin-firmasi"))).status).toBe(404); // never falls back to another firm
    const res = await POST(post(invoiceXml(), "firm-1"));
    expect(res.status).toBe(201);
    expect(activeFirm).toHaveBeenCalledWith("user-a", "firm-1");
    const [user, firm, receipt, lines] = vi.mocked(q.createReceipt).mock.calls[0];
    expect([user, firm, receipt.taxNumber, receipt.receiptNo, receipt.receiptDate, receipt.totalKurus, receipt.model]).toEqual(["user-a", "firm-1", "2222222224", "ABC2026000000412", "2026-09-08", 131000, "e-fatura"]);
    expect(lines.at(-1)).toMatchObject({ accountCode: "320.01", creditKurus: 131000, documentType: "FT" });
    expect(receipt.warnings[0].code).toBe("efatura");
  });

  it("zip'te faturaları alır; kendi satışını, yinelenenleri ve bozuk XML'i nedeniyle atlar", async () => {
    vi.mocked(q.hasDuplicateReceipt).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const res = await POST(post(zip([
      { name: "a/1.xml", data: Buffer.from(invoiceXml()) },
      { name: "a/2.xml", data: Buffer.from(invoiceXml().replace("ABC2026000000412", "ABC2026000000413")) },
      { name: "a/3.xml", data: Buffer.from(invoiceXml({ supplier: FIRM.taxNumber, customer: "2222222224" })) },
      { name: "a/4.xml", data: Buffer.from("<Invoice><ID>1") },
      { name: "a/goster.html", data: Buffer.from("<html></html>") },
    ])));
    const body = await res.json();
    expect(body.created).toBe(1);
    expect(body.skipped.map((s: { file: string; reason: string }) => [s.file, s.reason.slice(0, 12)])).toEqual([["2.xml", "Bu fatura za"], ["3.xml", "Firmanın ken"], ["4.xml", "XML okunamad"]]);
  });

  it("aynı anda yüklenen aynı fatura benzersiz indekse takılınca 'zaten yüklü' sayılır", async () => {
    vi.mocked(q.createReceipt).mockRejectedValueOnce(Object.assign(new Error("Failed query"), { cause: { code: "23505" } }));
    const body = await (await POST(post(invoiceXml()))).json();
    expect([body.created, body.skipped[0]?.reason]).toEqual([0, "Bu fatura zaten yüklü."]);
  });

  it("firmanın VKN'si yoksa hiçbir faturayı almaz (kendi satışı ayırt edilemez)", async () => {
    vi.mocked(activeFirm).mockResolvedValueOnce({ firms: [FIRM], firm: { ...FIRM, taxNumber: null } });
    expect((await POST(post(invoiceXml()))).status).toBe(422);
    expect(q.createReceipt).not.toHaveBeenCalled();
  });

  it("aynı sıkıştırılmış veriyi gösteren girdileri yeniden açmaz", async () => {
    const one = zip([{ name: "a.xml", data: Buffer.from(invoiceXml()) }]);
    const end = one.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const cdStart = one.readUInt32LE(end + 16), central = one.subarray(cdStart, end);
    const copies = Buffer.concat(Array(50).fill(central)), tail = Buffer.from(one.subarray(end));
    tail.writeUInt16LE(50, 8); tail.writeUInt16LE(50, 10); tail.writeUInt32LE(copies.length, 12);
    expect((await POST(post(Buffer.concat([one.subarray(0, cdStart), copies, tail]))))).toMatchObject({ status: 422 });
    expect(q.createReceipt).not.toHaveBeenCalled();
  });

  it("başka bir okuyucunun farklı göreceği zip'i (yorum, sayılmamış merkez kaydı) reddeder", async () => {
    const one = zip([{ name: "a.xml", data: Buffer.from(invoiceXml()) }]);
    expect((await POST(post(Buffer.concat([one.subarray(0, one.length - 2), Buffer.from([4, 0]), Buffer.from("yorum")])))).status).toBe(422);
    const end = one.length - 22, cd = one.readUInt32LE(end + 16), record = one.subarray(cd, end), tail = Buffer.from(one.subarray(end));
    tail.writeUInt32LE(record.length * 2, 12); // two central records, the count still says one
    expect((await POST(post(Buffer.concat([one.subarray(0, cd), record, record, tail]))))).toMatchObject({ status: 422 });
    expect(q.createReceipt).not.toHaveBeenCalled();
  });

  it("açılınca sınırı aşan zip'i (boyutu yalan söylese de) açmadan reddeder", async () => {
    const bomb = zip([{ name: "b.xml", data: Buffer.alloc(6 * 1024 * 1024, 0x20), declared: 100 }]);
    expect(bomb.length).toBeLessThan(100_000);
    expect((await POST(post(bomb))).status).toBe(422);
    expect(q.createReceipt).not.toHaveBeenCalled();
  });
});
