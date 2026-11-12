import { NextResponse } from "next/server";
import { paymentByToken } from "@/db/queries";
import { iyzicoConfig } from "@/lib/iyzico";
import { allow, clientIp } from "@/lib/rate-limit";
import { settlePayment } from "@/lib/settle-payment";

export const runtime = "nodejs";

/**
 * iyzico posts the checkout token here after the buyer pays (cross-site, so no session and exempt from the proxy's origin
 * check). Nothing in the post is trusted: the result is fetched from iyzico with the token and must match the checkout we
 * created; credits are added once (settlePayment). The buyer then lands on the kontör page with the outcome.
 */
export async function POST(request: Request) {
  const back = (state: string) => NextResponse.redirect(new URL(`/panel/kontor?odeme=${state}`, request.url), 303);
  // Each post makes one call to iyzico; a guessed or replayed token cannot make it call without limit.
  if (!(await allow("paymentCallbackIp", clientIp(request.headers)))) return back("bekliyor");
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const cfg = iyzicoConfig();
  if (typeof token !== "string" || !token || token.length > 200 || !cfg) return back("hata");
  const payment = await paymentByToken(token);
  if (!payment) return back("hata");
  return back(await settlePayment(cfg, { ...payment, token }));
}
