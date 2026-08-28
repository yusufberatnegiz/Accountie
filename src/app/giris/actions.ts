"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/server";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function login(formData: FormData) {
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!credentials.success) redirect(`/giris?${new URLSearchParams({ hata: "Bilgileri kontrol edin" })}`);

  const { error } = await auth.signIn.email(credentials.data);
  if (error) redirect(`/giris?${new URLSearchParams({ hata: "E-posta veya şifre hatalı" })}`);
  redirect("/");
}

export async function logout() {
  await auth.signOut();
  redirect("/giris");
}
