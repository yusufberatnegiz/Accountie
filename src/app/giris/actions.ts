"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const BOT_FIELD = "cf-turnstile-response";

const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(8).max(128) });
const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100), passwordAgain: z.string().min(8).max(128) })
  .refine((d) => d.password === d.passwordAgain, { path: ["passwordAgain"] });

// Only codes go in the URL; AuthView maps them to fixed text, so a crafted link cannot show arbitrary messages.
const back = (params: Record<string, string>) => redirect(`/giris?${new URLSearchParams(params)}`);
const backToSignup = (params: Record<string, string>) => redirect(`/kayit?${new URLSearchParams(params)}`);

/** Where a signed-in user lands. */
const AFTER_LOGIN = "/panel"; // not exported: a "use server" file may export only async functions

export async function login(formData: FormData) {
  const input = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!input.success) back({ hata: "bicim" });
  const ip = clientIp(await headers());
  // Turnstile first: otherwise anyone could fill a victim's per-e-mail limit without solving a challenge and lock them out.
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) back({ hata: "bot" });
  if (!(await allow("loginIp", ip))) back({ hata: "cok-deneme" });
  // Always on: the IP limit alone is bypassed by rotating addresses. Sized in LIMITS so one IP cannot fill it.
  if (!(await allow("loginEmail", input.data!.email))) back({ hata: "cok-deneme" });
  const { error } = await getAuth().signIn.email(input.data!);
  if (error) back({ hata: "kimlik" });
  redirect(AFTER_LOGIN);
}

export async function signup(formData: FormData) {
  const input = signupSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"),
    password: formData.get("password"), passwordAgain: formData.get("passwordAgain"),
  });
  if (!input.success) backToSignup({ hata: "kayit-bicim" });
  const ip = clientIp(await headers());
  if (!(await allow("signupIp", ip))) backToSignup({ hata: "kayit-cok" });
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) backToSignup({ hata: "bot" });
  const { name, email, password } = input.data!;
  const { data, error } = await getAuth().signUp.email({ name, email, password });
  if (error) backToSignup({ hata: "kayit" });
  // A session exists right away unless e-mail verification is on; then the user signs in after verifying.
  if (data?.token) redirect(AFTER_LOGIN);
  back({ mesaj: "kayit-tamam" });
}

export async function logout() {
  await getAuth().signOut();
  redirect("/giris");
}
