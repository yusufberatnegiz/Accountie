# Teknik Yığın

- Next.js App Router 16, React 19, TypeScript strict
- Tailwind CSS 4 ve mevcut sade CSS bileşenleri
- Neon Postgres + Neon Auth
- Drizzle ORM ve SQL migration'ları
- Vercel Hosting + günlük Vercel Cron
- Vitest, ESLint ve TypeScript kontrolleri

## Ortam değişkenleri

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
NEON_AUTH_BASE_URL
NEON_AUTH_JWKS_URL
NEON_AUTH_COOKIE_SECRET
CRON_SECRET
```

Pooled URL uygulamada, direct/unpooled URL migration'da kullanılır. Secret'lar yalnızca sunucuda kalır.
