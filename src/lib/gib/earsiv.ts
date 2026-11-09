/**
 * The GİB e-Arşiv portal, through the same endpoints its own web pages call. GİB publishes no API for it: the command names
 * below come from the open-source mlevent/fatura client, so GİB can change them without notice (the import then fails with
 * a message, nothing is half-saved). Only the two fixed GİB hosts are ever called, redirects are refused, every call has a
 * timeout and a size cap, and the login is never logged. GIB_EARSIV_ORTAM=test uses GİB's test portal.
 * shortcut: unofficial endpoints, verified against the open-source client only; move to an integrator's official API if they break.
 */
export class PortalError extends Error {
  constructor(message: string, readonly kind: "auth" | "portal") { super(message); }
}

const HOSTS = { prod: "https://earsivportal.efatura.gov.tr", test: "https://earsivportaltest.efatura.gov.tr" } as const;
const TIMEOUT_MS = 15_000;
const MAX_JSON = 2 * 1024 * 1024;
export const MAX_DOWNLOAD = 4 * 1024 * 1024;

export const portalHost = () => (process.env[`GIB_EARSIV_${"ORTAM"}`] === "test" ? HOSTS.test : HOSTS.prod);

/** The body, refused past `max` bytes while reading (a hostile or broken answer cannot fill memory). */
async function capped(res: Response, max: number): Promise<Buffer> {
  if (Number(res.headers.get("content-length") ?? 0) > max) throw new PortalError("GİB'in yanıtı beklenenden büyük.", "portal");
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if ((size += value.length) > max) { await reader.cancel(); throw new PortalError("GİB'in yanıtı beklenenden büyük.", "portal"); }
    parts.push(value);
  }
  return Buffer.concat(parts);
}

async function call(path: string, init: RequestInit, max: number): Promise<Buffer> {
  let res: Response;
  try {
    res = await fetch(`${portalHost()}${path}`, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new PortalError("GİB e-Arşiv portalına ulaşılamadı. Biraz sonra tekrar deneyin.", "portal");
  }
  if (!res.ok) throw new PortalError("GİB e-Arşiv portalı isteği kabul etmedi. Biraz sonra tekrar deneyin.", "portal");
  return capped(res, max);
}

async function postForm(path: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  const body = await call(path, { method: "POST", body: new URLSearchParams(form), headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" } }, MAX_JSON);
  try {
    const json = JSON.parse(body.toString("utf8"));
    if (json && typeof json === "object") return json as Record<string, unknown>;
  } catch { /* fall through */ }
  throw new PortalError("GİB e-Arşiv portalının yanıtı okunamadı; portal değişmiş olabilir.", "portal");
}

/** The portal session token, or PortalError("auth") when GİB turns the login down. */
export async function login(username: string, password: string): Promise<string> {
  const json = await postForm("/earsiv-services/assos-login", { assoscmd: portalHost() === HOSTS.test ? "login" : "anologin", rtype: "json", userid: username, sifre: password, sifre2: password, parola: "1" });
  if (typeof json.token === "string" && /^[A-Za-z0-9._-]{8,512}$/.test(json.token)) return json.token;
  if (json.error || json.messages) throw new PortalError("GİB kullanıcı kodunu ya da şifresini kabul etmedi.", "auth");
  throw new PortalError("GİB e-Arşiv portalının yanıtı okunamadı; portal değişmiş olabilir.", "portal");
}

export async function logout(token: string): Promise<void> {
  await postForm("/earsiv-services/assos-login", { assoscmd: "logout", rtype: "json", token }).catch(() => undefined);
}

const trDate = (iso: string) => iso.split("-").reverse().join("/");
const ETTN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ETTNs of the invoices issued to this taxpayer between two days (yyyy-mm-dd), as the portal's "Adıma Düzenlenen Belgeler" lists them. */
export async function issuedToMe(token: string, from: string, to: string): Promise<string[]> {
  const json = await postForm("/earsiv-services/dispatch", {
    cmd: "EARSIV_PORTAL_ADIMA_KESILEN_BELGELERI_GETIR", callid: crypto.randomUUID(), pageName: "RG_ALICI_TASLAKLAR", token,
    jp: JSON.stringify({ baslangic: trDate(from), bitis: trDate(to), hourlySearchInterval: "NONE" }),
  });
  if (json.error) throw new PortalError("GİB faturaları listelemedi. Tarih aralığını küçültüp tekrar deneyin.", "portal");
  const data = Array.isArray(json.data) ? json.data : [];
  return [...new Set(data.flatMap((d) => (d && typeof d === "object" && typeof (d as { ettn?: unknown }).ettn === "string" && ETTN.test((d as { ettn: string }).ettn) ? [(d as { ettn: string }).ettn] : [])))];
}

/** The invoice's zip (UBL XML and its HTML view) as GİB serves it. */
export async function download(token: string, ettn: string): Promise<Buffer> {
  if (!ETTN.test(ettn)) throw new PortalError("Geçersiz fatura kimliği.", "portal");
  const q = new URLSearchParams({ token, ettn, onayDurumu: "Onaylandı", belgeTip: "FATURA", cmd: "EARSIV_PORTAL_BELGE_INDIR" });
  return call(`/earsiv-services/download?${q}`, { method: "GET" }, MAX_DOWNLOAD);
}
