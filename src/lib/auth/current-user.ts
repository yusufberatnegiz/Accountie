import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "./server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

const userIdSchema = z.uuid();

export async function currentUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/giris");
  const id = userIdSchema.parse(session.user.id);
  await db.insert(profiles).values({
    id,
    fullName: session.user.name || session.user.email,
  }).onConflictDoUpdate({
    target: profiles.id,
    set: { fullName: session.user.name || session.user.email, updatedAt: new Date() },
  });
  return { id, name: session.user.name || session.user.email };
}
