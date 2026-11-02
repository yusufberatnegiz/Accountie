"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth/server";

const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(8).max(128) });
const signupSchema = loginSchema.extend({ name: z.string().trim().min(2).max(100), passwordAgain: z.string().min(8).max(128) })
  .refine((d) => d.password === d.passwordAgain, { path: ["passwordAgain"] });

const back = (params: Record<string, string>) => redirect(`/giris?${new URLSearchParams(params)}`);

export async function login(formData: FormData) {
  const input = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!input.success) back({ hata: "E-posta ve şifreyi kontrol edin." });
  const { error } = await getAuth().signIn.email(input.data!);
  if (error) back({ hata: "E-posta veya şifre hatalı." });
  redirect("/");
}

export async function signup(formData: FormData) {
  const input = signupSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"),
    password: formData.get("password"), passwordAgain: formData.get("passwordAgain"),
  });
  if (!input.success) back({ mod: "kayit", hata: "Bilgileri ve şifre tekrarını kontrol edin." });
  const { name, email, password } = input.data!;
  const { error } = await getAuth().signUp.email({ name, email, password });
  if (error) back({ mod: "kayit", hata: "Hesap oluşturulamadı. E-posta kullanımda olabilir." });
  back({ mesaj: "Hesabınız oluşturuldu. Giriş yapabilirsiniz." });
}

export async function logout() {
  await getAuth().signOut();
  redirect("/giris");
}
