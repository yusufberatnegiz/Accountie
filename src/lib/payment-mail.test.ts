import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, sendMail } from "./mail";
import { paymentMail } from "./payment-mail";

const PAID = {
  email: "alici@ornek.test", packageId: "k1000", credits: 1000, amountKurus: 300_000, paidAt: new Date("2026-11-14T12:42:00Z"),
  providerPaymentId: "998877", balance: 997,
  billing: { name: "ÖRNEK <b>MÜŞAVİRLİK</b>", taxNumber: "1111111114", taxOffice: "Muratpaşa", address: "Örnek Mah. No 1", city: "Antalya" },
};

describe("ödeme onay e-postası", () => {
  it("paketi, KDV dahil tutarı, ödeme numarasını, bakiyeyi ve fatura bilgilerini yazar", () => {
    const m = paymentMail(PAID);
    expect(m.to).toBe("alici@ornek.test");
    expect(m.subject).toBe("Ödemeniz alındı: 1.000 kontör");
    expect(m.text).toContain("Paket: Ofis, 1.000 kontör");
    expect(m.text).toContain("Tutar: 3.000,00 TL (KDV dahil, içindeki KDV 500,00 TL)");
    expect(m.text).toContain("iyzico ödeme no: 998877");
    expect(m.text).toContain("Güncel bakiye: 997 kontör");
    expect(m.text).toContain("14 Kasım 2026 15:42");
    expect(m.text).toContain("1111111114, Muratpaşa");
    expect(m.text).toContain("https://accountie.app/mesafeli-satis");
  });

  it("alıcının yazdığı her şey HTML'de kaçışlanır", () => {
    const m = paymentMail(PAID);
    expect(m.html).not.toContain("<b>MÜŞAVİRLİK</b>");
    expect(m.html).toContain("ÖRNEK &lt;b&gt;MÜŞAVİRLİK&lt;/b&gt;");
    expect(escapeHtml(`"'&<>`)).toBe("&quot;&#39;&amp;&lt;&gt;");
  });
});

describe("sendMail", () => {
  afterEach(() => { delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM; });

  it("anahtar yoksa hiçbir şey göndermez", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await sendMail({ to: "a@b.test", subject: "s", text: "t", html: "h" }, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("Resend'e anahtarla, doğrulanmış gönderen ve destek yanıt adresiyle gönderir", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetcher = vi.fn<typeof fetch>(async () => new Response("{}", { status: 200 }));
    expect(await sendMail({ to: "a@b.test", subject: "s", text: "t", html: "h" }, fetcher)).toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: "Accountie <bildirim@accountie.app>", to: ["a@b.test"], reply_to: "destek@accountie.app" });
  });

  it("Resend hata dönerse false döner", async () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(await sendMail({ to: "a@b.test", subject: "s", text: "t", html: "h" }, vi.fn<typeof fetch>(async () => new Response("{}", { status: 422 })))).toBe(false);
  });
});

describe("Sentry ayarları", () => {
  it("DSN yoksa kapalı ve CSP'ye bir şey eklemez; varsa yalnız ingest kökeni eklenir", async () => {
    const { sentryOrigin } = await import("./sentry-options");
    expect(sentryOrigin(undefined)).toBe("");
    expect(sentryOrigin("bozuk")).toBe("");
    expect(sentryOrigin("https://abc123@o456.ingest.de.sentry.io/789")).toBe("https://o456.ingest.de.sentry.io");
  });
});
