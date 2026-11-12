import { NextResponse } from "next/server";
import { markPaymentFailed, markPaymentPaid, paymentByToken } from "@/db/queries";
import { checkoutResult, iyzicoConfig } from "@/lib/iyzico";

export const runtime = "nodejs";

/**
 * iyzico posts the checkout token here after the buyer pays (cross-site, so no session and exempt from the proxy's origin
 * check). Nothing in the post is trusted: the result is fetched from iyzico with the token and must match the checkout we
 * created; credits are added once (markPaymentPaid). The buyer then lands on the kontör page with the outcome.
 */
export async function POST(request: Request) {
  const back = (state: string) => NextResponse.redirect(new URL(`/panel/kontor?odeme=${state}`, request.url), 303);
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const cfg = iyzicoConfig();
  if (typeof token !== "string" || !token || token.length > 200 || !cfg) return back("hata");
  const payment = await paymentByToken(token);
  if (!payment) return back("hata");
  if (payment.status === "paid") return back("tamam");
  const result = await checkoutResult(cfg, token, { paymentId: payment.id, amountKurus: payment.amountKurus }).catch((err) => {
    console.error("iyzico result failed", { error: err instanceof Error ? err.name : "unknown" });
    return null;
  });
  // Not reached: left pending, so a later callback (or a check by hand) can still settle it.
  if (!result) return back("bekliyor");
  if (result.paid) {
    await markPaymentPaid(payment.id, result.providerPaymentId);
    return back("tamam");
  }
  if (result.review) return back("inceleme");
  await markPaymentFailed(payment.id);
  return back("hata");
}
