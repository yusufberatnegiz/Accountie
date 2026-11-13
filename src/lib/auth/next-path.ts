/** Where a signed-in user lands when no (valid) return path came with the login. */
export const AFTER_LOGIN = "/panel";

// Only same-site panel paths: plain segments of letters, digits, "-" and "_". No "//", "\", "..", scheme or host, and no query but
// a month (?ay=2026-09) or, on the Kontör page, a package from Fiyatlar (?paket=k1000): no open redirect.
const PANEL_PATH = /^\/panel(?:(?:\/[A-Za-z0-9_-]+)*(?:\?ay=\d{4}-(?:0[1-9]|1[0-2]))?|\/kontor\?paket=k\d{1,5})$/;

/** The return path (?sonra=) carried through /giris, or null when it is missing or not a panel path. */
export function safeNextPath(raw: unknown): string | null {
  return typeof raw === "string" && raw.length <= 200 && PANEL_PATH.test(raw) ? raw : null;
}
