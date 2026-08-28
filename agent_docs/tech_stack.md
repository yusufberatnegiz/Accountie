# Tech Stack

## Seçimler

- Frontend: Next.js App Router, React, TypeScript strict
- Backend: Next.js Server Components, Server Actions ve Route Handlers
- Styling: Tailwind CSS ve native HTML bileşenleri
- Database: Supabase yönetimli PostgreSQL; ORM yok
- Auth: Supabase Auth; admin-created email/password accounts
- DB client: `@supabase/ssr`, `@supabase/supabase-js`
- Source fetch: native `fetch`
- Parse: Cheerio
- Runtime validation: Zod
- Tests: Vitest
- Deployment: Vercel
- Scheduler: Vercel Cron + admin manual retry
- Product AI: MVP'de yok

## Komutlar

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
APP_TIMEZONE=Europe/Istanbul
```

## Sınırlar

- Service role ve cron secret yalnızca server-side modüllerde kullanılabilir.
- ORM, Redis, queue, Elasticsearch, UI kit veya AI SDK ekleme.
- Yeni dependency öncesinde aynı işin native API veya mevcut dependency ile çözülüp çözülemediğini kontrol et.
- Güncel teknik kararlar ve veri modeli için `docs/TechDesign-Accountie-MVP.md` dosyasını oku.

