"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth/current-user";
import { syncAllSources } from "@/lib/sources/sync";

export async function syncSources() {
  await currentUser();
  await syncAllSources("manual");
  revalidatePath("/");
  revalidatePath("/takvim");
  revalidatePath("/guncel-akis");
  revalidatePath("/favoriler");
  revalidatePath("/notlar");
}
