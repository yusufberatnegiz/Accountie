import { packageById, vatInsideKurus } from "./credits";
import { escapeHtml, type Mail } from "./mail";
import { formatTrAmount } from "./money";

export type PaidForMail = {
  email: string;
  packageId: string;
  credits: number;
  amountKurus: number;
  paidAt: Date;
  providerPaymentId: string | null;
  balance: number;
  billing: { name?: string; taxNumber?: string; taxOffice?: string | null; address?: string; city?: string };
};

const SITE = "https://accountie.app";
const count = (n: number) => (n < 0 ? `−${(-n).toLocaleString("tr-TR")}` : n.toLocaleString("tr-TR"));
const when = (d: Date) => d.toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

/**
 * The order confirmation sent once a purchase is paid (ETK: the order is confirmed electronically without delay): what was
 * bought, for how much, when, the invoice details it will be made out to, and where the terms are. Plain text and the same
 * lines as simple HTML; every value the buyer typed is escaped in the HTML part.
 */
export function paymentMail(p: PaidForMail): Mail {
  const pkg = packageById(p.packageId);
  const b = p.billing;
  const lines: [string, string][] = [
    ["Paket", `${pkg?.name ?? "Kontör"}, ${count(p.credits)} kontör`],
    ["Tutar", `${formatTrAmount(p.amountKurus)} TL (KDV dahil, içindeki KDV ${formatTrAmount(vatInsideKurus(p.amountKurus))} TL)`],
    ["Ödeme tarihi", when(p.paidAt)],
    ...(p.providerPaymentId ? [["iyzico ödeme no", p.providerPaymentId] as [string, string]] : []),
    ["Güncel bakiye", `${count(p.balance)} kontör`],
  ];
  const billing = [b.name, [b.taxNumber, b.taxOffice].filter(Boolean).join(", "), [b.address, b.city].filter(Boolean).join(", ")].filter((x): x is string => Boolean(x));
  const subject = `Ödemeniz alındı: ${count(p.credits)} kontör`;
  const text = [
    "Merhaba,",
    "",
    "Accountie kontör ödemeniz alındı ve kontörler hesabınıza eklendi.",
    "",
    ...lines.map(([k, v]) => `${k}: ${v}`),
    "",
    "Fatura bilgileri:",
    ...billing,
    "Faturanız bu bilgilerle düzenlenip ayrıca gönderilir.",
    "",
    `Kontör sayfası: ${SITE}/panel/kontor`,
    `Satın alınan kontör iade edilmez ve süresi dolmaz. Mesafeli Hizmet Satış Sözleşmesi: ${SITE}/mesafeli-satis`,
    "",
    "Sorularınız için bu e-postayı yanıtlayın ya da destek@accountie.app adresine yazın.",
    "Accountie",
  ].join("\n");
  const row = (k: string, v: string) => `<tr><td style="padding:4px 16px 4px 0;color:#58524a">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(v)}</td></tr>`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#241e18;max-width:560px">
<p>Merhaba,</p>
<p>Accountie kontör ödemeniz alındı ve kontörler hesabınıza eklendi.</p>
<table style="border-collapse:collapse;margin:8px 0 16px">${lines.map(([k, v]) => row(k, v)).join("")}</table>
<p style="margin-bottom:4px"><b>Fatura bilgileri</b></p>
<p style="margin-top:0">${billing.map(escapeHtml).join("<br>")}<br><span style="color:#58524a">Faturanız bu bilgilerle düzenlenip ayrıca gönderilir.</span></p>
<p><a href="${SITE}/panel/kontor" style="color:#8f5718">Kontör sayfasını açın</a></p>
<p style="color:#58524a;font-size:13px">Satın alınan kontör iade edilmez ve süresi dolmaz. Ayrıntılar: <a href="${SITE}/mesafeli-satis" style="color:#8f5718">Mesafeli Hizmet Satış Sözleşmesi</a>, <a href="${SITE}/iptal-iade" style="color:#8f5718">Teslimat ve İade Şartları</a>.</p>
<p style="color:#58524a;font-size:13px">Sorularınız için bu e-postayı yanıtlayın ya da destek@accountie.app adresine yazın.</p>
</div>`;
  return { to: p.email, subject, text, html };
}
