"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

const noteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(5000),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminderAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
  relation: z.string().optional(),
});
const idSchema = z.uuid();

function reminderInIstanbul(value: string | undefined): Date | null {
  return value ? new Date(`${value}:00+03:00`) : null;
}

function relation(value: string | undefined): { relatedType: string | null; relatedId: string | null } {
  if (!value) return { relatedType: null, relatedId: null };
  const [type, id] = value.split(":");
  if (!(["calendar_event", "update"].includes(type)) || !idSchema.safeParse(id).success) return { relatedType: null, relatedId: null };
  return { relatedType: type, relatedId: id };
}

function parse(formData: FormData) {
  return noteSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    noteDate: formData.get("noteDate"),
    reminderAt: formData.get("reminderAt") || undefined,
    relation: formData.get("relation") || undefined,
  });
}

export async function createNote(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect(`/notlar?${new URLSearchParams({ hata: "Not bilgilerini kontrol edin" })}`);
  const user = await currentUser();
  await db.insert(notes).values({
    ownerId: user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    noteDate: parsed.data.noteDate,
    reminderAt: reminderInIstanbul(parsed.data.reminderAt),
    visibility: "private",
    ...relation(parsed.data.relation),
  });
  revalidatePath("/");
  revalidatePath("/notlar");
}

export async function updateNote(formData: FormData) {
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = parse(formData);
  if (!id.success || !parsed.success) return;
  const user = await currentUser();
  await db.update(notes).set({
    title: parsed.data.title,
    body: parsed.data.body,
    noteDate: parsed.data.noteDate,
    reminderAt: reminderInIstanbul(parsed.data.reminderAt),
    ...relation(parsed.data.relation),
    updatedAt: new Date(),
  }).where(and(eq(notes.id, id.data), eq(notes.ownerId, user.id)));
  revalidatePath("/");
  revalidatePath("/notlar");
}

export async function toggleNote(formData: FormData) {
  const id = idSchema.safeParse(formData.get("id"));
  const completed = z.enum(["true", "false"]).safeParse(formData.get("completed"));
  if (!id.success || !completed.success) return;
  const user = await currentUser();
  await db.update(notes).set({ completedAt: completed.data === "true" ? null : new Date(), updatedAt: new Date() })
    .where(and(eq(notes.id, id.data), eq(notes.ownerId, user.id)));
  revalidatePath("/");
  revalidatePath("/notlar");
}

export async function deleteNote(formData: FormData) {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const user = await currentUser();
  await db.delete(notes).where(and(eq(notes.id, id.data), eq(notes.ownerId, user.id)));
  revalidatePath("/");
  revalidatePath("/notlar");
}
