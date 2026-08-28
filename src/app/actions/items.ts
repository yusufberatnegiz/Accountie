"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { favorites, readItems } from "@/lib/db/schema";

const itemSchema = z.object({ itemType: z.enum(["calendar_event", "update"]), itemId: z.uuid() });

export async function toggleFavorite(formData: FormData) {
  const parsed = itemSchema.safeParse({ itemType: formData.get("itemType"), itemId: formData.get("itemId") });
  if (!parsed.success) return;
  const user = await currentUser();
  const where = and(eq(favorites.userId, user.id), eq(favorites.itemType, parsed.data.itemType), eq(favorites.itemId, parsed.data.itemId));
  const [existing] = await db.select({ id: favorites.id }).from(favorites).where(where).limit(1);
  if (existing) await db.delete(favorites).where(eq(favorites.id, existing.id));
  else await db.insert(favorites).values({ userId: user.id, ...parsed.data });
  revalidatePath("/");
  revalidatePath("/takvim");
  revalidatePath("/guncel-akis");
  revalidatePath("/favoriler");
}

export async function toggleRead(formData: FormData) {
  const updateId = z.uuid().safeParse(formData.get("itemId"));
  if (!updateId.success) return;
  const user = await currentUser();
  const where = and(eq(readItems.userId, user.id), eq(readItems.updateId, updateId.data));
  const [existing] = await db.select().from(readItems).where(where).limit(1);
  if (existing) await db.delete(readItems).where(where);
  else await db.insert(readItems).values({ userId: user.id, updateId: updateId.data });
  revalidatePath("/guncel-akis");
}
