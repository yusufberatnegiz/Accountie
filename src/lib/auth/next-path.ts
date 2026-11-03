/** Where a signed-in user lands when no (valid) return path came with the login. */
export const AFTER_LOGIN = "/panel";

// Only same-site panel paths: plain segments of letters, digits, "-" and "_". No "//", "\", "..", scheme, host or query: no open redirect.
const PANEL_PATH = /^\/panel(?:\/[A-Za-z0-9_-]+)*$/;

/** The return path (?sonra=) carried through /giris, or null when it is missing or not a panel path. */
export function safeNextPath(raw: unknown): string | null {
  return typeof raw === "string" && raw.length <= 200 && PANEL_PATH.test(raw) ? raw : null;
}
