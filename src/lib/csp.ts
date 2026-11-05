import { createHash } from "node:crypto";
import { THEME_INIT_SCRIPT } from "./theme";

// Marks <html> before first paint so the homepage's entrance animations run only with script. A tab opened in the background
// gets it when first shown, so its entrances play on first view. In the root layout (not the page), so it is also set when the
// homepage is reached by client navigation.
const JS_FLAG = "(function(d){function f(){d.documentElement.classList.add('js')}d.visibilityState!=='hidden'?f():d.addEventListener('visibilitychange',f,{once:true})})(document)";
/** The root layout's <head> script. Constant text: the panel CSP allows it by hash. */
export const HEAD_SCRIPT = THEME_INIT_SCRIPT + ";" + JS_FLAG;
/** Production only: public/sw.js serves public/cevrimdisi.html when a navigation fails offline (caches nothing else). */
export const SW_REGISTER = `if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})`;

const dev = process.env.NODE_ENV === "development";

// Turnstile (giris/kayit) is the only third party: its frame and siteverify calls are allowed only where it can load.
const policy = (scriptSrc: string, turnstile: boolean) => [
  "default-src 'self'",
  `script-src ${scriptSrc}${dev ? " 'unsafe-eval'" : ""}`,
  // Explicit: worker-src falls back to script-src, where 'strict-dynamic' drops 'self' and would block /sw.js.
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${turnstile ? " https://challenges.cloudflare.com" : ""}`,
  `frame-src ${turnstile ? "https://challenges.cloudflare.com" : "'none'"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Static public pages (next.config.ts: homepage, /gizlilik, 404) keep 'unsafe-inline': App Router streams its RSC payload as
// inline <script> whose text changes per build and page, so only a nonce could cover it, and a nonce forces dynamic rendering.
// They carry no user data and no raw-HTML sink: dangerouslySetInnerHTML takes the constant strings above only. No Turnstile here.
export const PUBLIC_CSP = policy("'self' 'unsafe-inline'", false);

const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
const LAYOUT_HASHES = [HEAD_SCRIPT, SW_REGISTER].map(sha256).join(" ");

/** The panel and the auth pages are dynamic anyway: per-request nonce for Next's scripts (and next/script, so Turnstile
 * loads through 'strict-dynamic'), hashes for the layout's two constants. */
export const nonceCsp = (nonce: string) => policy(`'self' 'nonce-${nonce}' 'strict-dynamic' ${LAYOUT_HASHES}`, true);
