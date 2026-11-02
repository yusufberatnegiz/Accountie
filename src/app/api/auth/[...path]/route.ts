import { getAuth } from "@/lib/auth/server";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/rate-limit";

type Handler = ReturnType<ReturnType<typeof getAuth>["handler"]>;

// Neon Auth sees only our server's IP, so its own per-IP limits cannot tell users apart; credential endpoints are limited here.
const LIMITED = /\/(sign-in|sign-up|forget-password|request-password-reset|reset-password|change-password)(\/|$)/;

export const GET: Handler["GET"] = (...args) => getAuth().handler().GET(...args);
export const POST: Handler["POST"] = async (...args) => {
  const [request] = args;
  const path = new URL(request.url).pathname;
  if (LIMITED.test(path) && !(await allow(path.includes("sign-up") ? "signupIp" : "loginIp", clientIp(request.headers)))) {
    return fail("Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.", 429);
  }
  return getAuth().handler().POST(...args);
};
