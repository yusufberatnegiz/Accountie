// Edge-safe (no next/headers): the API routes set it, src/lib/firm.ts reads it.
export const FIRM_COOKIE = "firma";

export const firmCookie = (id: string) => ({
  name: FIRM_COOKIE, value: id, httpOnly: true, sameSite: "lax" as const, path: "/",
  secure: process.env.NODE_ENV === "production", maxAge: 400 * 24 * 60 * 60,
});
