import { z } from "zod";

// The auth pages' CSP has no 'unsafe-eval': without this, zod's Function("") probe logs a script-src violation on every load.
z.config({ jitless: true });

// Shared by the server actions and the form: the form runs the same check before sending, the server always runs it again.
// Login only asks for a password; the 8-character rule is the signup's (an older short password still reaches Neon Auth).
export const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(1).max(128) });
// One password field with a show/hide toggle: no second "repeat" field (docs/design/YON.md 5.4).
// The terms box must be ticked: an unticked checkbox is simply absent from the form data.
export const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100), password: z.string().min(8).max(128), terms: z.literal("on") });
/** The date of the Kullanım Koşulları text in force; stored with the account when the box is ticked. Change it when /kosullar changes. */
export const TERMS_VERSION = "2026-11-13";

export type AuthField = "name" | "email" | "password" | "terms";
/** What a failed attempt hands back to the form: a fixed error code, the field it belongs to, and what was typed (never the password). */
export type AuthState = { error: string; field?: AuthField; fields?: AuthField[]; email?: string; name?: string } | undefined;

const FIELD_ERRORS: Record<AuthField, string> = { name: "bicim-ad", email: "bicim-eposta", password: "bicim-sifre", terms: "bicim-kosullar" };
/** The error code of a field: on login an invalid password can only be an empty one. */
export const fieldCode = (f: AuthField, isSignup: boolean) => (f === "password" && !isSignup ? "bos-sifre" : FIELD_ERRORS[f]);

export const typedBack = ({ email, name }: { email?: unknown; name?: unknown }) => ({
  email: typeof email === "string" ? email.slice(0, 200) : undefined,
  name: typeof name === "string" ? name.slice(0, 100) : undefined,
});

export function invalid(issues: readonly { path: readonly PropertyKey[] }[], typed: { email?: unknown; name?: unknown }, isSignup: boolean): AuthState {
  // Every invalid field comes back at once (each shows its message); `field`, the first in form order, gets focus.
  const fields = (["name", "email", "password", "terms"] as const).filter((f) => issues.some((i) => i.path[0] === f));
  const field = fields[0] ?? "email";
  return { error: fieldCode(field, isSignup), field, fields: fields.length ? fields : [field], ...typedBack(typed) };
}

/** The format check for a login or signup form's values: undefined when valid, otherwise the same state the server returns. */
export function checkAuthForm(isSignup: boolean, raw: { name?: unknown; email: unknown; password: unknown; terms?: unknown }): AuthState {
  const input = (isSignup ? signupSchema : loginSchema).safeParse(raw);
  return input.success ? undefined : invalid(input.error.issues, raw, isSignup);
}

/** The link types the e-mail templates send to /giris/onay; anything else is refused before Supabase is asked. */
const LINK_TYPES = ["recovery", "email", "signup", "magiclink"] as const;
export const isLinkType = (t: unknown): t is (typeof LINK_TYPES)[number] => typeof t === "string" && (LINK_TYPES as readonly string[]).includes(t);
