import { markExported } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { extensionUserId } from "@/lib/auth/extension-token";
import { fail, notFound } from "@/lib/http";

export const runtime = "nodejs";

/** The user saved the receipt in Luca themselves; mark it exported so it is not filled twice. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return notFound();
  await markExported(userId, [id.data]);
  return new Response(null, { status: 204 });
}
