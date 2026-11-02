import { createNeonAuth } from "@neondatabase/auth/next/server";

function requiredEnv(name: "NEON_AUTH_BASE_URL" | "NEON_AUTH_COOKIE_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ortam değişkeni eksik.`);
  return value;
}

let instance: ReturnType<typeof createNeonAuth> | undefined;

// Lazy so `next build` works without secrets in the environment.
export function getAuth() {
  return (instance ??= createNeonAuth({
    baseUrl: requiredEnv("NEON_AUTH_BASE_URL"),
    cookies: { secret: requiredEnv("NEON_AUTH_COOKIE_SECRET") },
  }));
}
