import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { CreditPackage } from "./credits";

/**
 * iyzico Checkout Form (hosted payment page): initialize gives a page address, the buyer pays there (3D Secure), iyzico posts a
 * token to our callback and the result is fetched from iyzico with that token. Card data never reaches Accountie.
 * Docs: docs.iyzico.com, Checkout Form and HMACSHA256 auth (IYZWSv2).
 */
const SANDBOX = "https://sandbox-api.iyzipay.com";

export type IyzicoConfig = { apiKey: string; secretKey: string; baseUrl: string };

export function iyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY, secretKey = process.env.IYZICO_SECRET_KEY;
  // Sandbox unless the live address is set on purpose.
  return apiKey && secretKey ? { apiKey, secretKey, baseUrl: process.env.IYZICO_BASE_URL || SANDBOX } : null;
}

/** IYZWSv2: HMAC-SHA256(randomKey + path + body, secretKey) in hex, inside base64("apiKey:..&randomKey:..&signature:.."). */
export function authorization(cfg: IyzicoConfig, path: string, body: string, randomKey: string): string {
  const signature = createHmac("sha256", cfg.secretKey).update(randomKey + path + body).digest("hex");
  return "IYZWSv2 " + Buffer.from(`apiKey:${cfg.apiKey}&randomKey:${randomKey}&signature:${signature}`).toString("base64");
}

type Fetch = typeof fetch;

async function call(cfg: IyzicoConfig, path: string, payload: object, fetcher: Fetch): Promise<Record<string, unknown>> {
  const body = JSON.stringify(payload);
  const randomKey = Date.now() + randomBytes(6).toString("hex");
  const res = await fetcher(cfg.baseUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: authorization(cfg, path, body, randomKey), "x-iyzi-rnd": randomKey },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json) throw new Error(`iyzico ${res.status}`);
  return json;
}

/** Lira with two decimals as iyzico reads prices ("3000.00"). */
const lira = (kurus: number) => (kurus / 100).toFixed(2);

export type Buyer = { userId: string; email: string; ip: string; name: string; taxNumber: string; phone: string; address: string; city: string };

/** "+90" and ten digits, as iyzico's gsmNumber wants; the form accepts 05xx, 5xx or +905xx. */
export function gsm(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^(90|0)/, "");
  return `+90${digits}`;
}

/** Name and surname from one "Ad Soyad" or company title: the last word is the surname. */
export function splitName(full: string): { name: string; surname: string } {
  const words = full.trim().split(/\s+/);
  return words.length > 1 ? { name: words.slice(0, -1).join(" "), surname: words.at(-1)! } : { name: words[0] ?? "", surname: words[0] ?? "" };
}

export async function initializeCheckout(cfg: IyzicoConfig, args: { paymentId: string; pkg: CreditPackage; buyer: Buyer; callbackUrl: string }, fetcher: Fetch = fetch): Promise<{ token: string; pageUrl: string } | { error: string }> {
  const { paymentId, pkg, buyer } = args;
  const price = lira(pkg.priceKurus);
  const address = { contactName: buyer.name, city: buyer.city, country: "Turkey", address: buyer.address };
  const json = await call(cfg, "/payment/iyzipos/checkoutform/initialize/auth/ecom", {
    locale: "tr",
    conversationId: paymentId,
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: paymentId,
    paymentGroup: "PRODUCT",
    callbackUrl: args.callbackUrl,
    // Single payment only: an installment would charge the buyer more than the price shown.
    enabledInstallments: [1],
    buyer: {
      id: buyer.userId,
      ...splitName(buyer.name),
      identityNumber: buyer.taxNumber,
      email: buyer.email,
      gsmNumber: gsm(buyer.phone),
      registrationAddress: buyer.address,
      city: buyer.city,
      country: "Turkey",
      ip: buyer.ip,
    },
    billingAddress: address,
    shippingAddress: address,
    basketItems: [{ id: pkg.id, name: `Accountie ${pkg.credits} kontör`, category1: "Yazılım", itemType: "VIRTUAL", price }],
  }, fetcher);
  if (json.status !== "success" || typeof json.token !== "string" || typeof json.paymentPageUrl !== "string") {
    return { error: typeof json.errorMessage === "string" ? json.errorMessage : "Ödeme sayfası açılamadı." };
  }
  return { token: json.token, pageUrl: json.paymentPageUrl };
}

export type CheckoutOutcome = { state: "paid"; providerPaymentId: string } | { state: "failed" } | { state: "pending"; review: boolean };

/**
 * The checkout's result, from iyzico itself. Paid only when the call succeeded, the payment succeeded, fraud review approved
 * it, and it is this checkout for this amount (basketId is the payment we created; conversationId is only echoed back).
 * Failed only when iyzico says so plainly (payment FAILURE or fraud rejected). Anything else (an error answer, a 5xx, a
 * review) stays pending, so a charged payment is never closed as failed by a passing fault; it is asked again later.
 */
export async function checkoutResult(cfg: IyzicoConfig, token: string, expect: { paymentId: string; amountKurus: number }, fetcher: Fetch = fetch): Promise<CheckoutOutcome> {
  const json = await call(cfg, "/payment/iyzipos/checkoutform/auth/ecom/detail", { locale: "tr", conversationId: expect.paymentId, token }, fetcher);
  if (json.status !== "success") return { state: "pending", review: false };
  if (json.paymentStatus === "FAILURE" || Number(json.fraudStatus) === -1) return { state: "failed" };
  const ours = json.basketId === expect.paymentId && Math.round(Number(json.paidPrice) * 100) === expect.amountKurus && (json.currency ?? "TRY") === "TRY"
    && (typeof json.paymentId === "string" || typeof json.paymentId === "number");
  if (json.paymentStatus === "SUCCESS" && Number(json.fraudStatus) === 1 && ours) return { state: "paid", providerPaymentId: String(json.paymentId) };
  // A success for another basket or amount is never ours to credit; it is not a plain failure either, so a person looks at it.
  return { state: "pending", review: json.paymentStatus === "SUCCESS" && Number(json.fraudStatus) === 0 && ours };
}
