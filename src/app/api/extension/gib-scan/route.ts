import "server-only";
import { extensionUserId } from "@/lib/auth/extension-token";
import { EXTENSION_IDS } from "@/lib/extension-id";
import { closeGibScan, grantGibScan } from "@/lib/gib/scan-grant";
import { fail } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!EXTENSION_IDS.some((id) => origin === `chrome-extension://${id}`)) {
    return fail("Tarama isteği Accountie eklentisinden gelmedi.", 403);
  }
  return grantGibScan(request, "extension");
}

/** The extension ends the scan approval when its scan is done or stopped: nothing stays open for the hours left. */
export async function DELETE(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  return closeGibScan(request, userId);
}
