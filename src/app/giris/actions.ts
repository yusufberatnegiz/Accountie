"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function login(formData: FormData) {
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!credentials.success) redirect("/giris?hata=Bilgileri+kontrol+edin");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials.data);
  if (error) redirect("/giris?hata=E-posta+veya+şifre+hatalı");
  redirect("/");
}
