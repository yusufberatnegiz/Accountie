"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const BOT_FIELD = "cf-turnstile-response";

const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(8).max(128) });
// One password field with a show/hide toggle: no second "repeat" field (docs/design/YON.md 5.4).
const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100) });

export type AuthField = "name" | "email" | "password";
/** What a failed attempt hands back to the form: a fixed error code, the field it belongs to, and what was typed (never the password). */
export type AuthState = { error: string; field?: AuthField; email?: string; name?: string } | undefined;

const FIELD_ERRORS: Record<AuthField, string> = { name: "bicim-ad", email: "bicim-eposta", password: "bicim-sifre" };

function invalid(issues: readonly { path: readonly PropertyKey[] }[], typed: { email?: unknown; name?: unknown }): AuthState {
  const field = (["name", "email", "password"] as const).find((f) => issues.some((i) => i.path[0] === f)) ?? "email";
  return { error: FIELD_ERRORS[field], field, ...typedBack(typed) };
}
const typedBack = ({ email, name }: { email?: unknown; name?: unknown }) => ({
  email: typeof email === "string" ? email.slice(0, 200) : undefined,
  name: typeof name === "string" ? name.slice(0, 100) : undefined,
});

// Only codes go back to the page; the form maps them to fixed text, so nothing typed is ever shown as a message.
const back = (params: Record<string, string>) => redirect(`/giris?${new URLSearchParams(params)}`);

/** Where a signed-in user lands. */
const AFTER_LOGIN = "/panel"; // not exported: a "use server" file may export only async functions

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const input = loginSchema.safeParse(raw);
  if (!input.success) return invalid(input.error.issues, raw);
  const typed = typedBack(raw);
  const ip = clientIp(await headers());
  // Turnstile first: otherwise anyone could fill a victim's per-e-mail limit without solving a challenge and lock them out.
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) return { error: "bot", ...typed };
  if (!(await allow("loginIp", ip))) return { error: "cok-deneme", ...typed };
  // Always on: the IP limit alone is bypassed by rotating addresses. Sized in LIMITS so one IP cannot fill it.
  if (!(await allow("loginEmail", input.data.email))) return { error: "cok-deneme", ...typed };
  const { error } = await getAuth().signIn.email(input.data);
  if (error) return { error: "kimlik", field: "password", ...typed };
  redirect(AFTER_LOGIN);
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const input = signupSchema.safeParse(raw);
  if (!input.success) return invalid(input.error.issues, raw);
  const typed = typedBack(raw);
  const ip = clientIp(await headers());
  if (!(await allow("signupIp", ip))) return { error: "kayit-cok", ...typed };
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) return { error: "bot", ...typed };
  const { name, email, password } = input.data;
  const { data, error } = await getAuth().signUp.email({ name, email, password });
  if (error) return { error: "kayit", field: "email", ...typed };
  // A session exists right away unless e-mail verification is on; then the user verifies the address and signs in.
  if (data?.token) redirect(AFTER_LOGIN);
  back({ mesaj: "kayit-tamam" });
}

export async function logout() {
  await getAuth().signOut();
  redirect("/giris");
}
