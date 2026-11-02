import { NextResponse } from "next/server";

/** Turkish user-facing error; never includes stack traces or internal details. */
export const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export const unauthorized = () => fail("Oturum açmanız gerekiyor.", 401);
export const notFound = () => fail("Fiş bulunamadı.", 404);

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
