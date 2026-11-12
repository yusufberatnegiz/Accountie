import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PACKAGES } from "./credits";
import { authorization, checkoutResult, gsm, initializeCheckout, splitName } from "./iyzico";

const cfg = { apiKey: "sandbox-api", secretKey: "sandbox-secret", baseUrl: "https://sandbox-api.iyzipay.com" };
const reply = (body: object) => vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }));

describe("iyzico", () => {
  it("IYZWSv2 imzası: HMAC-SHA256(randomKey + yol + gövde) base64 içinde", () => {
    const header = authorization(cfg, "/payment/bin/check", "{\"a\":1}", "123456789");
    expect(header.startsWith("IYZWSv2 ")).toBe(true);
    const decoded = Buffer.from(header.slice(8), "base64").toString();
    const sig = createHmac("sha256", "sandbox-secret").update("123456789/payment/bin/check{\"a\":1}").digest("hex");
    expect(decoded).toBe(`apiKey:sandbox-api&randomKey:123456789&signature:${sig}`);
  });

  it("telefonu +90 biçimine, adı ad ve soyada ayırır", () => {
    expect(gsm("0532 123 45 67")).toBe("+905321234567");
    expect(gsm("+90 (532) 123-45-67")).toBe("+905321234567");
    expect(gsm("5321234567")).toBe("+905321234567");
    expect(splitName("Ayşe Nur Örnek")).toEqual({ name: "Ayşe Nur", surname: "Örnek" });
    expect(splitName("ÖRNEKMÜŞAVİRLİK")).toEqual({ name: "ÖRNEKMÜŞAVİRLİK", surname: "ÖRNEKMÜŞAVİRLİK" });
  });

  it("ödeme sayfasını tek çekim ve paketin KDV dahil fiyatıyla açar, imzalı istek gönderir", async () => {
    const fetcher = reply({ status: "success", token: "tok-1", paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=tok-1" });
    const out = await initializeCheckout(cfg, {
      paymentId: "pay-1", pkg: PACKAGES[1], callbackUrl: "https://accountie.test/api/payments/callback",
      buyer: { userId: "u1", email: "a@ornek.test", ip: "203.0.113.9", name: "Ayşe Örnek", taxNumber: "11111111110", phone: "05321234567", address: "Örnek Mah. No 1", city: "Antalya" },
    }, fetcher);
    expect(out).toEqual({ token: "tok-1", pageUrl: "https://sandbox-cpp.iyzipay.com?token=tok-1" });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ price: "3000.00", paidPrice: "3000.00", currency: "TRY", conversationId: "pay-1", basketId: "pay-1", enabledInstallments: [1], callbackUrl: "https://accountie.test/api/payments/callback" });
    expect(body.buyer).toMatchObject({ name: "Ayşe", surname: "Örnek", gsmNumber: "+905321234567", identityNumber: "11111111110", country: "Turkey" });
    expect(body.basketItems).toEqual([{ id: "k1000", name: "Accountie 1000 kontör", category1: "Yazılım", itemType: "VIRTUAL", price: "3000.00" }]);
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(authorization(cfg, "/payment/iyzipos/checkoutform/initialize/auth/ecom", String(init?.body), headers["x-iyzi-rnd"]));
  });

  it("iyzico hata dönerse mesajını verir", async () => {
    const out = await initializeCheckout(cfg, { paymentId: "p", pkg: PACKAGES[0], callbackUrl: "https://x.test/cb", buyer: { userId: "u", email: "e", ip: "1", name: "A B", taxNumber: "1", phone: "5321234567", address: "a", city: "c" } },
      reply({ status: "failure", errorMessage: "Geçersiz istek" }));
    expect(out).toEqual({ error: "Geçersiz istek" });
  });

  const ok = { status: "success", paymentStatus: "SUCCESS", fraudStatus: 1, conversationId: "pay-1", basketId: "pay-1", paidPrice: 3000, currency: "TRY", paymentId: "998877" };
  const expectPay = { paymentId: "pay-1", amountKurus: 300_000 };
  it("ödendi sayılması için sonuç, tutar ve kimlik tutmalı", async () => {
    const result = (body: object) => checkoutResult(cfg, "tok-1", expectPay, reply(body));
    expect(await result(ok)).toEqual({ paid: true, providerPaymentId: "998877" });
    expect(await result({ ...ok, paidPrice: 750 })).toEqual({ paid: false, review: false });
    expect(await result({ ...ok, conversationId: "baska" })).toEqual({ paid: false, review: false });
    expect(await result({ ...ok, paymentStatus: "FAILURE" })).toEqual({ paid: false, review: false });
    expect(await result({ ...ok, status: "failure" })).toEqual({ paid: false, review: false });
    expect(await result({ ...ok, currency: "USD" })).toEqual({ paid: false, review: false });
    expect(await result({ ...ok, fraudStatus: 0 })).toEqual({ paid: false, review: true });
  });
});
