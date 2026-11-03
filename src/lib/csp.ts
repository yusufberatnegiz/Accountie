import { createHash } from "node:crypto";
import { THEME_INIT_SCRIPT } from "./theme";

// Marks <html> before first paint so the homepage's entrance animations run only with script, and not in a tab opened in
// the background. In the root layout (not the page), so it is also set when the homepage is reached by client navigation.
const JS_FLAG = "if(document.visibilityState!=='hidden')document.documentElement.classList.add('js')";
/** The root layout's <head> script. Constant text: the panel CSP allows it by hash. */
export const HEAD_SCRIPT = THEME_INIT_SCRIPT + ";" + JS_FLAG;
/** Production only: public/sw.js serves public/cevrimdisi.html when a navigation fails offline (caches nothing else). */
export const SW_REGISTER = `if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})`;

const dev = process.env.NODE_ENV === "development";

const policy = (scriptSrc: string) => [
  "default-src 'self'",
  `script-src ${scriptSrc}${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Public pages (next.config.ts) keep 'unsafe-inline': App Router streams its RSC payload as inline <script> whose text
// changes per build and page, so only a nonce could cover it, and a nonce forces dynamic rendering (the homepage is static).
// They carry no user data and no raw-HTML sink: dangerouslySetInnerHTML takes the constant strings above only.
export const PUBLIC_CSP = policy("'self' 'unsafe-inline' https://challenges.cloudflare.com");

const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
const LAYOUT_HASHES = [HEAD_SCRIPT, SW_REGISTER].map(sha256).join(" ");

/** The panel (user data) is dynamic anyway: per-request nonce for Next's scripts, hashes for the layout's two constants. */
export const panelCsp = (nonce: string) => policy(`'self' 'nonce-${nonce}' 'strict-dynamic' ${LAYOUT_HASHES}`);
