# Teknoloji yığını

Son doğrulama: henüz yok (kod iskeleti kurulmadı). Ayrıntı: `docs/TECH_DESIGN.md`.

## Yığın

| Alan | Seçim | Not |
|---|---|---|
| Ön yüz | Next.js App Router, TypeScript strict, PWA manifest | Telefon ve masaüstü tek uygulama |
| Sunucu | Next.js route handler'lar, Node runtime | `sharp` ve Anthropic SDK Edge'de çalışmaz |
| Veritabanı | Supabase Postgres (Frankfurt, transaction pooler) + Drizzle ORM | Yeni tablolar: `receipts`, `journal_lines`, `account_rules`. Eski tablolara dokunulmaz |
| Oturum | Supabase Auth (`@supabase/ssr`, yalnız sunucuda) | HttpOnly çerez; her route sunucuda doğrular |
| Yapay zeka | `@anthropic-ai/sdk`, `claude-haiku-5-5`, yükseltme `claude-sonnet-5-5` | Structured outputs, `messages.parse` + `zodOutputFormat` |
| Görüntü | İstemcide canvas, sunucuda `sharp` | Uzun kenar 1568 px, JPEG 80, EXIF silinir |
| Excel | `exceljs` | Luca Excel veri aktarımı |
| Doğrulama | `zod` | API girdisi ve model çıktısı |
| Test | `vitest` | DB ve yapay zeka mock |
| Barındırma | Vercel, accountie.vercel.app | Deploy kullanıcı onayıyla |

## Env (sadece sunucu)

`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ANTHROPIC_API_KEY`. `NEXT_PUBLIC_` önekli sır yok. Değerler yazdırılmaz, commit edilmez.

## Komutlar (doğrulanmadı, iskelet kurulunca güncellenecek)

- Kurulum: `npm install`
- Geliştirme: `npm run dev`
- Test: `npx vitest run`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`
- Migration üret: `npx drizzle-kit generate` (uygulama yok)
- Tarayıcı kontrolü: telefon genişliğinde çekim, kontrol, onay, indirme akışı

## Yapay zeka çalışma zamanı

- Sağlayıcı: Anthropic. Anthropic API verisi varsayılan olarak eğitimde kullanılmaz; yayından önce hesap ayarı kontrol edilecek.
- Model görür: fiş görüntüsü ve sabit talimat. Kullanıcı bilgisi gönderilmez.
- Araçlar: yok. Sadece yapılandırılmış çıktı.
- Onay kapısı: kullanıcı onayı olmadan fiş "Onaylandı" olmaz, dosya üretilmez.
- Hata durumu: elle giriş.

## Önemli kalıplar

- Veri: Sunucu bileşenleri ve route handler'lar Drizzle sorgularını `src/db/queries.ts` üzerinden çağırır; her fonksiyon `userId` alır.
- Formlar: istemci düzenlemesi PATCH ile; sunucu Zod ile beyaz listeden geçirir.
- Hata: kullanıcıya Türkçe genel mesaj, logda istek kimliği ve hata türü; fiş içeriği loglanmaz.
