import { getUserId } from "@/lib/auth/session";
import { closeGibScan, grantGibScan } from "@/lib/gib/scan-grant";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return grantGibScan(request, "web");
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  return closeGibScan(request, userId);
}
