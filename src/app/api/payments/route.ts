import { NextResponse } from "next/server";
import { createPayment, markPaymentFailed, saveBillingProfile, setPaymentToken } from "@/db/queries";
import { TERMS_VERSION } from "@/app/giris/validation";
import { CheckoutSchema } from "@/lib/api-schemas";
import { getSessionUser } from "@/lib/auth/session";
import { packageById } from "@/lib/credits";
import { fail, readJson, unauthorized } from "@/lib/http";
import { initializeCheckout, iyzicoConfig } from "@/lib/iyzico";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Starts a kontör purchase: saves the invoice details, opens an iyzico checkout and returns its payment page address. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const cfg = iyzicoConfig();
  if (!cfg) return fail("Ödeme henüz açık değil.", 503);
  if (!(await allow("payment", user.id))) return fail("Çok fazla ödeme denemesi. Biraz bekleyip tekrar deneyin.", 429);

  const parsed = CheckoutSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // The field it is about (billing.taxNumber -> taxNumber), so the form can mark and focus it.
    return NextResponse.json({ error: issue?.message ?? "Fatura bilgileri eksik.", field: issue?.path[0] === "billing" ? issue.path[1] : undefined }, { status: 400 });
  }
  const pkg = packageById(parsed.data.packageId);
  if (!pkg) return fail("Paket bulunamadı.", 400);
  const billing = parsed.data.billing;

  await saveBillingProfile(user.id, billing);
  const paymentId = await createPayment(user.id, { packageId: pkg.id, credits: pkg.credits, amountKurus: pkg.priceKurus, termsVersion: TERMS_VERSION }, billing);
  const result = await initializeCheckout(cfg, {
    paymentId,
    pkg,
    buyer: { userId: user.id, email: user.email, ip: clientIp(request.headers), ...billing },
    callbackUrl: new URL("/api/payments/callback", request.url).toString(),
  }).catch((err) => {
    console.error("iyzico initialize failed", { error: err instanceof Error ? err.name : "unknown" });
    return { error: "Ödeme sayfası açılamadı. Biraz sonra tekrar deneyin." };
  });
  if ("error" in result) {
    // Never opened: closed now, so its invoice details do not stay behind.
    await markPaymentFailed(paymentId).catch(() => {});
    return fail(result.error, 502);
  }
  await setPaymentToken(user.id, paymentId, result.token);
  return NextResponse.json({ url: result.pageUrl }, { status: 201 });
}
