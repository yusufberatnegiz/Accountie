import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({
  hitRateLimit: vi.fn(async () => true), saveBillingProfile: vi.fn(), createPayment: vi.fn(async () => "pay-1"), setPaymentToken: vi.fn(),
  paymentByToken: vi.fn(), markPaymentPaid: vi.fn(async () => true), markPaymentFailed: vi.fn(async () => {}), getPaymentStatus: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: async () => ({ id: "user-1", email: "a@ornek.test", createdAt: new Date(0) }) }));
vi.mock("@/lib/iyzico", async (orig) => ({ ...(await orig<typeof import("@/lib/iyzico")>()), initializeCheckout: vi.fn(), checkoutResult: vi.fn() }));

const q = await import("@/db/queries");
const iyzico = await import("@/lib/iyzico");
const { POST: start } = await import("./route");
const { POST: callback } = await import("./callback/route");

const BILLING = { name: "Ayşe Örnek", taxNumber: "11111111110", taxOffice: "", phone: "0532 123 45 67", address: "Örnek Mahallesi No 1", city: "Antalya" };
const startReq = (body: unknown) => new Request("https://accountie.test/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const cb = (token?: string) => {
  const form = new FormData();
  if (token) form.set("token", token);
  return new Request("https://accountie.test/api/payments/callback", { method: "POST", body: form });
};
const where = async (res: Response) => (res.status === 303 ? new URL(res.headers.get("location")!).search : res.status);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.IYZICO_API_KEY = "k";
  process.env.IYZICO_SECRET_KEY = "s";
});
afterEach(() => { delete process.env.IYZICO_API_KEY; delete process.env.IYZICO_SECRET_KEY; });

describe("POST /api/payments", () => {
  it("iyzico ayarlı değilse ödeme açılmaz", async () => {
    delete process.env.IYZICO_API_KEY;
    expect((await start(startReq({ packageId: "k1000", billing: BILLING }))).status).toBe(503);
  });

  it("geçersiz paket ve geçersiz VKN reddedilir, iyzico çağrılmaz", async () => {
    expect((await start(startReq({ packageId: "k999", billing: BILLING }))).status).toBe(400);
    const bad = await start(startReq({ packageId: "k1000", billing: { ...BILLING, taxNumber: "12345" } }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: expect.stringMatching(/VKN/), field: "taxNumber" });
    expect(iyzico.initializeCheckout).not.toHaveBeenCalled();
  });

  it("fatura bilgisini kaydeder, ödemeyi paketin fiyatıyla açar, sayfa adresini döner", async () => {
    vi.mocked(iyzico.initializeCheckout).mockResolvedValue({ token: "tok-1", pageUrl: "https://sandbox-cpp.iyzipay.com/?token=tok-1" });
    const res = await start(startReq({ packageId: "k1000", billing: BILLING }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ url: "https://sandbox-cpp.iyzipay.com/?token=tok-1" });
    expect(q.saveBillingProfile).toHaveBeenCalledWith("user-1", { ...BILLING, taxOffice: null });
    expect(q.createPayment).toHaveBeenCalledWith("user-1", { packageId: "k1000", credits: 1000, amountKurus: 300_000, termsVersion: expect.any(String) }, { ...BILLING, taxOffice: null });
    expect(vi.mocked(iyzico.initializeCheckout).mock.calls[0][1]).toMatchObject({ paymentId: "pay-1", callbackUrl: "https://accountie.test/api/payments/callback" });
    expect(q.setPaymentToken).toHaveBeenCalledWith("user-1", "pay-1", "tok-1");
  });

  it("iyzico hatasını kullanıcıya iletir", async () => {
    vi.mocked(iyzico.initializeCheckout).mockResolvedValue({ error: "Geçersiz istek" });
    const res = await start(startReq({ packageId: "k100", billing: BILLING }));
    expect(res.status).toBe(502);
    expect(q.setPaymentToken).not.toHaveBeenCalled();
    // Never opened: closed at once, so its invoice details do not stay behind.
    expect(q.markPaymentFailed).toHaveBeenCalledWith("pay-1");
  });
});

describe("POST /api/payments/callback", () => {
  const pending = { id: "pay-1", userId: "user-1", amountKurus: 300_000, credits: 1000, status: "pending" as const };

  it("tokensız ya da bilinmeyen token: hata, iyzico'ya sorulmaz", async () => {
    expect(await where(await callback(cb()))).toBe("?odeme=hata");
    vi.mocked(q.paymentByToken).mockResolvedValue(null);
    expect(await where(await callback(cb("yok")))).toBe("?odeme=hata");
    expect(iyzico.checkoutResult).not.toHaveBeenCalled();
  });

  it("sonucu iyzico'dan alır; ödendiyse kontörü bir kez ekler", async () => {
    vi.mocked(q.paymentByToken).mockResolvedValue(pending);
    vi.mocked(iyzico.checkoutResult).mockResolvedValue({ state: "paid", providerPaymentId: "998877" });
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=tamam");
    expect(vi.mocked(iyzico.checkoutResult).mock.calls[0].slice(1)).toEqual(["tok-1", { paymentId: "pay-1", amountKurus: 300_000 }]);
    expect(q.markPaymentPaid).toHaveBeenCalledWith("pay-1", "998877");
  });

  it("zaten ödenmişse yeniden eklemez", async () => {
    vi.mocked(q.paymentByToken).mockResolvedValue({ ...pending, status: "paid" });
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=tamam");
    expect(iyzico.checkoutResult).not.toHaveBeenCalled();
    expect(q.markPaymentPaid).not.toHaveBeenCalled();
  });

  it("kontör eklenmediyse 'eklendi' demez", async () => {
    vi.mocked(q.paymentByToken).mockResolvedValue(pending);
    vi.mocked(iyzico.checkoutResult).mockResolvedValue({ state: "paid", providerPaymentId: "998877" });
    vi.mocked(q.markPaymentPaid).mockResolvedValueOnce(false);
    vi.mocked(q.getPaymentStatus).mockResolvedValueOnce("failed");
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=hata");
    vi.mocked(q.markPaymentPaid).mockResolvedValueOnce(false);
    vi.mocked(q.getPaymentStatus).mockResolvedValueOnce("paid");
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=tamam");
  });

  it("incelemede ve belirsizde bekler, yalnız açık başarısızlıkta kapatır, iyzico'ya ulaşılamazsa bekletir", async () => {
    vi.mocked(q.paymentByToken).mockResolvedValue(pending);
    vi.mocked(iyzico.checkoutResult).mockResolvedValueOnce({ state: "pending", review: true });
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=inceleme");
    vi.mocked(iyzico.checkoutResult).mockResolvedValueOnce({ state: "pending", review: false });
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=bekliyor");
    expect(q.markPaymentFailed).not.toHaveBeenCalled();
    vi.mocked(iyzico.checkoutResult).mockResolvedValueOnce({ state: "failed" });
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=hata");
    expect(q.markPaymentFailed).toHaveBeenCalledWith("pay-1");
    vi.mocked(iyzico.checkoutResult).mockRejectedValueOnce(new Error("timeout"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await where(await callback(cb("tok-1")))).toBe("?odeme=bekliyor");
    log.mockRestore();
    expect(q.markPaymentPaid).not.toHaveBeenCalled();
  });
});

describe("settlePayment", () => {
  it("7 günden uzun cevapsız kalan ödeme kapanır, kısa süreli bekleyen kapanmaz", async () => {
    const { settlePayment } = await import("@/lib/settle-payment");
    vi.mocked(iyzico.checkoutResult).mockResolvedValue({ state: "pending", review: false });
    const cfg = { apiKey: "k", secretKey: "s", baseUrl: "https://x.test" };
    const old = { id: "pay-9", amountKurus: 75_000, status: "pending", token: "t", createdAt: new Date(0) };
    expect(await settlePayment(cfg, old, 8 * 86_400_000)).toBe("hata");
    expect(q.markPaymentFailed).toHaveBeenCalledWith("pay-9");
    vi.mocked(q.markPaymentFailed).mockClear();
    expect(await settlePayment(cfg, old, 86_400_000)).toBe("bekliyor");
    expect(q.markPaymentFailed).not.toHaveBeenCalled();
  });
});
