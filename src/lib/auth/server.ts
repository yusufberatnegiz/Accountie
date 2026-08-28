import { createNeonAuth } from "@neondatabase/auth/next/server";
import { NextResponse } from "next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl || !cookieSecret) {
  console.warn("[v0] Neon auth is not configured; rendering the read-only preview fallback.");
}

export const auth = baseUrl && cookieSecret
  ? createNeonAuth({
      baseUrl,
      cookies: { secret: cookieSecret },
    })
  : ({
      getSession: async () => ({ data: null }),
      middleware: () => () => NextResponse.next(),
      handler: () => NextResponse.json({ error: "Neon auth is not configured." }, { status: 503 }),
    } as unknown as ReturnType<typeof createNeonAuth>);
