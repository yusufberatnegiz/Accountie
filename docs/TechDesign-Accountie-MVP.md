# Accountie MVP — Teknik Tasarım

## 1. Mimari

Tek Next.js App Router uygulaması Vercel'de çalışır. Server Components Neon Postgres'i Drizzle ile doğrudan okur. Server Actions kullanıcı mutasyonlarını ve manuel senkronizasyonu yürütür. Vercel Cron korumalı Route Handler'ı günde bir kez çağırır.

```text
Browser
  └─ Next.js UI / Server Actions
       ├─ Neon Auth
       ├─ Neon Postgres (Drizzle)
       └─ syncAllSources
            ├─ GİB Vergi Takvimi JSON
            ├─ SGK Duyuru HTML
            └─ Resmî Gazete günlük HTML

Vercel Cron ─► GET /api/cron/sync-sources ─► syncAllSources
```

Ek worker, kuyruk, Redis, arama servisi veya Supabase kullanılmaz.

## 2. Kaynak adaptörleri

- `official-fetch.ts`: yalnızca izinli HTTPS hostları, 10 saniye timeout, 2 MB yanıt sınırı, manuel redirect reddi.
- `gib.ts`: resmî JSON şemasını Zod ile doğrular; external id, başlık, açıklama, başlangıç/son tarih, vergi türü, dönem ve işlem üretir.
- `sgk.ts`: `https://www.sgk.gov.tr/Duyuru` üzerindeki resmî kartlardan detay yolu, başlık, birim ve tarihi ayrıştırır.
- `resmi-gazete.ts`: günlük sayı başlığı, PDF ve fihrist bağlantılarını ayrıştırır; eksik sunucu ara sertifikasını doğrulamayı kapatmadan tamamlar.

Dış içerik yalnızca veri kabul edilir. Kaynak URL'leri kullanıcı girdisinden gelmez.

## 3. Senkronizasyon

`syncAllSources(trigger, date)` üç kaynağı birbirinden bağımsız çalıştırır. Her kaynak için:

1. `sync_runs` satırı `running` açılır.
2. Canlı içerik çekilir ve doğrulanır.
3. Normalize içerik SHA-256 hash'i ve `(source_id, external_key)` benzersiz anahtarıyla upsert edilir.
4. GİB kaydı hem `calendar_events` hem `updates`; SGK ve Resmî Gazete kayıtları `updates` tablosuna yazılır.
5. Geçerli kayıtlar doğrudan `approved` yazılır; ürün içinde onay kuyruğu yoktur.
6. Başarı veya hata `sync_runs` ve `sources` üzerinde tamamlanır.

Kaynak hatası yakalanır, diğer `Promise.all` görevleri devam eder ve eski kayıtlar silinmez. Aynı içerik hash'i `changedCount` artırmaz; unique constraint kopyayı engeller.

## 4. Veri modeli

- `profiles`: Neon Auth kullanıcı kimliğine bağlı ofis profili. Eski `role` alanı uyumluluk için kalır fakat yetki kapısı değildir.
- `sources`, `sync_runs`, `source_items`: kaynak tanımı, çalışma geçmişi ve normalize ham içerik.
- `calendar_events`: GİB süreleri; `updated_at` son kontrol zamanıdır.
- `updates`: üç kaynağın birleşik akış kayıtları.
- `notes`: owner, başlık, gövde, tarih, hatırlatma, tamamlanma, `related_type/id`.
- `favorites`: kullanıcı + `calendar_event|update` + kayıt kimliği.
- `read_items`: kullanıcı + update kimliği.

Eski `review_status`, `reviewed_*`, `app_role` ve `audit_logs` alanları/tabelası destructive migration yapmamak için kalır; yeni ürün davranışını yönetmez.

## 5. Kimlik ve sahiplik

- Neon Managed Auth e-posta/parola akışı kullanılır.
- Neon Managed Auth e-posta/parola kaydı giriş ekranından yapılır; Neon ayarında `allow_sign_up` açıktır.
- Middleware sayfaları korur; her Server Action ayrıca session doğrular.
- `currentUser()` profili idempotent oluşturur/günceller.
- Not/favori/okundu mutation'ları `userId`/`ownerId` koşulunu sunucuda uygular.
- Tüm ofis kullanıcıları manuel kaynak taraması yapabilir.

## 6. Route ve zamanlama

- `GET /api/cron/sync-sources`: `Authorization: Bearer <CRON_SECRET>` zorunlu; sabit zaman karşılaştırması kullanır.
- `vercel.json`: `0 5 * * *`, Türkiye'nin sabit UTC+3 saatine göre 08:00.
- `/api/cron` auth middleware dışında kalır; kendi secret kontrolü zorunludur.
- Başarılı tüm kaynaklar 200, kısmi kaynak hatası 207, yetkisiz istek 401 döndürür.

## 7. UI veri akışları

- Dashboard/takvim `calendar_events` ve kullanıcı favorilerini okur; aciliyeti `Europe/Istanbul` gününe göre hesaplar.
- GİB kaydında SGK/sosyal güvenlik/sigorta primi ifadesi varsa kullanıcıya SGK kaynağı olarak sınıflandırılır.
- Güncel akış `updates → source_items → sources` ile kaynak adını alır; favori ve okundu kümeleri kullanıcıya göre eklenir.
- Kaynak sağlığı `sources.last_success_at/last_error_at` değerlerinden üst barda hesaplanır.
- Not ilişkisi hafif bir polymorphic `related_type/id` alanıdır; kayıt silinmesi notu silmez.

## 8. Ortam değişkenleri

```text
DATABASE_URL                 # pooled, uygulama sorguları
DATABASE_URL_UNPOOLED        # direct, migration
NEON_AUTH_BASE_URL
NEON_AUTH_JWKS_URL
NEON_AUTH_COOKIE_SECRET
CRON_SECRET
```

Secret değerleri `NEXT_PUBLIC_` ile başlamaz, loglanmaz ve repoya yazılmaz.

## 9. Migration ve deploy

1. Yeni alanları yalnızca ileri uyumlu Drizzle migration ile ekle.
2. Migration'ı production'dan türetilmiş Neon dalında test et.
3. Parser fixture, typecheck, lint, unit test ve build çalıştır.
4. Production migration'ını uygula ve manuel ilk senkronizasyonu çalıştır.
5. Vercel env değerlerini tanımla, deploy et, cron ve kaynak sağlığını izle.

## 10. Test planı

- Parser fixture: GİB JSON, SGK HTML, Resmî Gazete HTML.
- Tarih/aciliyet ve GİB içindeki SGK sınıflandırması.
- İzinli host, redirect ve yanıt boyutu sınırı.
- İçerik hash/idempotency ve unique constraint.
- Cron 401/200-207, login hata yönlendirmesi.
- Sahiplik: ikinci kullanıcı başka kullanıcının not/favori/okundu verisini değiştiremez.
- Masaüstü/mobil dashboard, takvim, akış, favoriler ve notlar smoke testi.

## 11. Bilinen riskler

- Resmî HTML seçicileri değişebilir: fixture ve açık kaynak hatasıyla yakalanır.
- Resmî Gazete bazı günler sayı yayımlamayabilir: kaynak hata verir, önceki kayıt korunur.
- Neon Auth paketi beta olabilir: sürüm otomatik yükseltilmez; login/logout/session tekrar test edilir.
- Vercel Cron başarısız çağrıyı tekrar etmeyebilir: üst bardaki manuel tarama yedektir.
