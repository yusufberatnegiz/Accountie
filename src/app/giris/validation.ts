import { z } from "zod";

// Shared by the server actions and the form: the form runs the same check before sending, the server always runs it again.
export const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(8).max(128) });
// One password field with a show/hide toggle: no second "repeat" field (docs/design/YON.md 5.4).
export const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100) });

export type AuthField = "name" | "email" | "password";
/** What a failed attempt hands back to the form: a fixed error code, the field it belongs to, and what was typed (never the password). */
export type AuthState = { error: string; field?: AuthField; fields?: AuthField[]; email?: string; name?: string } | undefined;

const FIELD_ERRORS: Record<AuthField, string> = { name: "bicim-ad", email: "bicim-eposta", password: "bicim-sifre" };

export const typedBack = ({ email, name }: { email?: unknown; name?: unknown }) => ({
  email: typeof email === "string" ? email.slice(0, 200) : undefined,
  name: typeof name === "string" ? name.slice(0, 100) : undefined,
});

export function invalid(issues: readonly { path: readonly PropertyKey[] }[], typed: { email?: unknown; name?: unknown }): AuthState {
  // Every invalid field comes back at once (each shows its message); `field`, the first in form order, gets focus.
  const fields = (["name", "email", "password"] as const).filter((f) => issues.some((i) => i.path[0] === f));
  const field = fields[0] ?? "email";
  return { error: FIELD_ERRORS[field], field, fields: fields.length ? fields : [field], ...typedBack(typed) };
}

/** The format check for a login or signup form's values: undefined when valid, otherwise the same state the server returns. */
export function checkAuthForm(isSignup: boolean, raw: { name?: unknown; email: unknown; password: unknown }): AuthState {
  const input = (isSignup ? signupSchema : loginSchema).safeParse(raw);
  return input.success ? undefined : invalid(input.error.issues, raw);
}
