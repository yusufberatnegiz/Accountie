"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth/server";
import { getUserId, inRecovery } from "@/lib/auth/session";
import { revokeExtensionTokens } from "@/db/queries";
import { AFTER_LOGIN, safeNextPath } from "@/lib/auth/next-path";
import { allow, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { invalid, loginSchema, signupSchema, typedBack, type AuthField, type AuthState } from "./validation";

export type { AuthField, AuthState };

const BOT_FIELD = "cf-turnstile-response";


// Only codes go back to the page; the form maps them to fixed text, so nothing typed is ever shown as a message.
const back = (params: Record<string, string>) => redirect(`/giris?${new URLSearchParams(params)}`);

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const input = loginSchema.safeParse(raw);
  if (!input.success) return invalid(input.error.issues, raw, false);
  const typed = typedBack(raw);
  const ip = clientIp(await headers());
  // Turnstile first: otherwise anyone could fill a victim's per-e-mail limit without solving a challenge and lock them out.
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) return { error: "bot", ...typed };
  if (!(await allow("loginIp", ip))) return { error: "cok-deneme", ...typed };
  // Always on: the IP limit alone is bypassed by rotating addresses. Sized in LIMITS so one IP cannot fill it.
  if (!(await allow("loginEmail", input.data.email))) return { error: "cok-deneme", ...typed };
  const { error } = await (await getAuth()).signInWithPassword(input.data);
  if (error) return { error: "kimlik", field: "password", ...typed };
  // A deep link (?sonra=) is honoured only when it is a plain same-site panel path (no open redirect).
  redirect(safeNextPath(formData.get("sonra")) ?? AFTER_LOGIN);
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const input = signupSchema.safeParse(raw);
  if (!input.success) return invalid(input.error.issues, raw, true);
  const typed = typedBack(raw);
  const ip = clientIp(await headers());
  // Turnstile first, as for login: without a challenge token nobody can spend a network's sign-up limit.
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) return { error: "bot", ...typed };
  if (!(await allow("signupIp", ip))) return { error: "kayit-cok", ...typed };
  const { name, email, password } = input.data;
  // The confirmation link comes back to /auth/callback on this origin (Next has matched Origin to Host for this action).
  const origin = (await headers()).get("origin");
  const { data, error } = await (await getAuth()).signUp({ email, password, options: { data: { name }, ...(origin ? { emailRedirectTo: `${origin}/auth/callback` } : {}) } });
  if (error) return { error: "kayit", field: "email", ...typed };
  // A session exists right away unless e-mail confirmation is on; then the user confirms the address and signs in.
  if (data?.session) redirect(safeNextPath(formData.get("sonra")) ?? AFTER_LOGIN);
  // The deep link survives the verification detour: /giris carries it to the login form.
  const next = safeNextPath(formData.get("sonra"));
  back({ mesaj: "kayit-tamam", ...(next ? { sonra: next } : {}) });
}

/** What the password-reset forms hand back: an error code (and its field), or that the e-mail step is done. */
export type ResetState = { error?: string; field?: AuthField; email?: string; sent?: boolean } | undefined;

const emailSchema = z.object({ email: z.email().max(200) });
const newPasswordSchema = z.object({ password: z.string().min(8).max(128) });

/**
 * Step 1 (/giris/sifre): send the reset link. The answer is the same whether or not an account exists (no account probing).
 * Turnstile first, then per network and per address limits, as for login. The link returns through /auth/callback (which turns
 * its one-time code into a short recovery session) to /giris/sifre/yeni on this origin.
 */
export async function requestReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.slice(0, 200) : undefined;
  const input = emailSchema.safeParse({ email: raw });
  if (!input.success) return { error: "bicim-eposta", field: "email", email };
  const h = await headers();
  const ip = clientIp(h);
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) return { error: "bot", email };
  if (!(await allow("resetIp", ip)) || !(await allow("resetEmail", input.data.email))) return { error: "sifre-cok", email };
  // Next.js has already matched Origin to Host for this server action; Supabase also checks redirectTo against its allowed URLs.
  const origin = h.get("origin");
  if (!origin) return { error: "sunucu", email };
  const { error } = await (await getAuth()).resetPasswordForEmail(input.data.email, { redirectTo: `${origin}/auth/callback?tur=sifre` });
  // A 4xx (for example an unknown address) gets the same answer as success, so the form cannot tell who has an account.
  if (error && (error.status ?? 500) >= 500) return { error: "sunucu", email };
  return { sent: true, email: input.data.email };
}

/** Step 2 (/giris/sifre/yeni, in the recovery session the link opened): set the new password, then sign in with it on /giris. */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const input = newPasswordSchema.safeParse({ password: formData.get("password") });
  if (!input.success) return { error: "bicim-sifre", field: "password" };
  if (!(await allow("resetIp", clientIp(await headers())))) return { error: "sifre-cok" };
  if (!(await inRecovery())) return { error: "sifre-baglanti" };
  const auth = await getAuth();
  const { error } = await auth.updateUser({ password: input.data.password });
  if (error) return { error: "sifre-baglanti" };
  // The recovery session ends here: the user signs in again with the new password, and extension keys made before it stop working.
  const userId = await getUserId();
  if (userId) await revokeExtensionTokens(userId);
  await auth.signOut();
  back({ mesaj: "sifre-yeni" });
}

// The extension key outlives a sign-out on purpose (an office computer keeps working); a password reset or "Anahtarı iptal et" ends it.
export async function logout() {
  await (await getAuth()).signOut();
  redirect("/giris");
}
