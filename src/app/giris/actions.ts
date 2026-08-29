"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { loginCredentialsSchema, registrationCredentialsSchema } from "@/lib/auth/credentials";

export async function login(formData: FormData) {
  const credentials = loginCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!credentials.success) redirect(`/giris?${new URLSearchParams({ hata: "Bilgileri kontrol edin" })}`);

  const { error } = await auth.signIn.email(credentials.data);
  if (error) redirect(`/giris?${new URLSearchParams({ hata: "E-posta veya şifre hatalı" })}`);
  redirect("/");
}

export async function register(formData: FormData) {
  const credentials = registrationCredentialsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordAgain: formData.get("passwordAgain"),
  });
  if (!credentials.success) redirect(`/giris?${new URLSearchParams({ mod: "kayit", hata: "Bilgileri ve parola tekrarını kontrol edin" })}`);

  const { error } = await auth.signUp.email({
    name: credentials.data.name,
    email: credentials.data.email,
    password: credentials.data.password,
  });
  if (error) redirect(`/giris?${new URLSearchParams({ mod: "kayit", hata: "Hesap oluşturulamadı; e-posta kullanımda olabilir" })}`);
  redirect(`/giris?${new URLSearchParams({ mesaj: "Hesabınız oluşturuldu. Giriş yapabilirsiniz." })}`);
}

export async function logout() {
  await auth.signOut();
  redirect("/giris");
}
