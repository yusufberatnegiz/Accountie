"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { turnstileEnabled, verifyTurnstile } from "@/lib/turnstile";

const BOT_FIELD = "cf-turnstile-response";

const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(8).max(128) });
const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100), passwordAgain: z.string().min(8).max(128) })
  .refine((d) => d.password === d.passwordAgain, { path: ["passwordAgain"] });

// Only codes go in the URL; LoginView maps them to fixed text, so a crafted link cannot show arbitrary messages.
const back = (params: Record<string, string>) => redirect(`/giris?${new URLSearchParams(params)}`);

export async function login(formData: FormData) {
  const input = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!input.success) back({ hata: "bicim" });
  const ip = clientIp(await headers());
  // Turnstile first: otherwise anyone could fill a victim's per-e-mail limit without solving a challenge and lock them out.
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) back({ hata: "bot" });
  if (!(await allow("loginIp", ip))) back({ hata: "cok-deneme" });
  // Per-e-mail limit only behind a real challenge; without one it would let anyone lock a victim out (IP limit still applies).
  if (turnstileEnabled() && !(await allow("loginEmail", input.data!.email))) back({ hata: "cok-deneme" });
  const { error } = await getAuth().signIn.email(input.data!);
  if (error) back({ hata: "kimlik" });
  redirect("/");
}

export async function signup(formData: FormData) {
  const input = signupSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"),
    password: formData.get("password"), passwordAgain: formData.get("passwordAgain"),
  });
  if (!input.success) back({ mod: "kayit", hata: "kayit-bicim" });
  const ip = clientIp(await headers());
  if (!(await allow("signupIp", ip))) back({ mod: "kayit", hata: "kayit-cok" });
  if (!(await verifyTurnstile(formData.get(BOT_FIELD), ip))) back({ mod: "kayit", hata: "bot" });
  const { name, email, password } = input.data!;
  const { error } = await getAuth().signUp.email({ name, email, password });
  if (error) back({ mod: "kayit", hata: "kayit" });
  back({ mesaj: "kayit-tamam" });
}

export async function logout() {
  await getAuth().signOut();
  redirect("/giris");
}
