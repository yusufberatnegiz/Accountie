# Technical Design Document: Accountie MVP

## 1. Yönetici Özeti

Accountie, tek muhasebe ofisinin kullanacağı bir Next.js web uygulamasıdır. GİB, SGK ve Resmî Gazete gibi herkese açık resmî kaynakları günlük olarak tarar; bulunan içerikleri PostgreSQL'e kaydeder ve kritik tarih değişikliklerini admin onayından sonra yayımlar.

Üç günlük teslim hedefi nedeniyle sistem tek deploy edilebilir uygulama olarak kurulacaktır. Ayrı mikroservis, mesaj kuyruğu, arama motoru, mobil uygulama ve ürün içi yapay zekâ kullanılmayacaktır.

## 2. Doğrulanmış Kaynak ve Platform Bilgileri

Son doğrulama: **28 Ağustos 2026**

- GİB, filtrelenebilir ve yıllık indirme seçeneği bulunan resmî [Vergi Takvimi](https://gib.gov.tr/vergi-takvimi) sayfası yayımlamaktadır.
- SGK ana sitesi resmî duyuruları listeler ve [RSS kullanım sayfası](https://www.sgk.gov.tr/rss) sunar.
- Resmî Gazete için [resmigazete.gov.tr](https://www.resmigazete.gov.tr/) alan adı tek resmî kaynak kabul edilir. Uygulama kaynak erişilemediğinde üçüncü taraf kopyaya otomatik geçmez.
- Next.js App Router; Route Handlers, Server Components ve dosya tabanlı yönlendirme sunar: [Next.js App Router](https://nextjs.org/docs/app).
- Vercel Cron, belirlenmiş URL'ye zamanlı GET isteği gönderir; `CRON_SECRET` ile korunabilir. Başarısız çağrılar otomatik tekrar edilmediği ve aynı çağrı birden fazla kez gelebileceği için iş idempotent tasarlanmalıdır: [Vercel Cron](https://vercel.com/docs/cron-jobs), [Cron yönetimi](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
- Supabase, Next.js gibi SSR uygulamalarında cookie tabanlı oturumlar için [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side) paketini önerir; paket 28 Ağustos 2026 itibarıyla beta olduğundan güncelleme öncesi changelog ve auth smoke testi zorunludur.
- PostgreSQL Row Level Security, kullanıcı bazlı veri erişimini veritabanında uygular. Supabase dokümantasyonu exposed tablolarda RLS, grant ve policy kontrollerinin birlikte yapılmasını önerir: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Kaynakların HTML/RSS yapısı uygulama sırasında tekrar incelenmeli ve fixture testleri gerçek örneklerle oluşturulmalıdır. Belge, kararlı ve resmî bir API olduğunu varsaymaz.

## 3. Mimari Karar

### Seçilen yaklaşım: modüler monolit

```text
Ofis kullanıcısı
      │
      ▼
Next.js App Router ─────► Supabase Auth
      │
      ├───────────────► Supabase PostgreSQL
      │
      └─ /api/cron/sync-sources
                    │
                    ├─► GİB Vergi Takvimi
                    ├─► SGK Duyuruları/RSS
                    └─► Resmî Gazete günlük sayfası
```

Tek uygulama içinde üç sınır bulunur:

1. **Sunum:** Sayfalar ve UI bileşenleri
2. **Uygulama kuralları:** Filtreleme, önem durumu, onay ve audit işlemleri
3. **Kaynak toplama:** Her resmî kaynak için ayrık fetch/parse fonksiyonu

### Neden bu yaklaşım?

- Üç günlük hedef için tek repository ve tek deploy yeterlidir.
- Kaynak parser'ları birbirinden ayrıldığı için bir kaynağın değişmesi diğerlerini etkilemez.
- PostgreSQL, kayıtlar, filtreler, notlar, audit ve idempotency için yeterlidir.
- Küçük ofis yükünde ayrı kuyruk veya cache sistemi gerekmez.

### Değerlendirilen alternatifler

| Seçenek | Artıları | Eksileri | Karar |
|---|---|---|---|
| Next.js + Supabase + Vercel | Hızlı kurulum, PostgreSQL ve auth birlikte, kolay deploy | Platform bağımlılığı; cron ve function limitleri izlenmeli | Seçildi |
| Next.js + Neon + Auth.js | Saf PostgreSQL ve daha esnek auth | Üç günde daha çok yapılandırma ve parola/oturum sorumluluğu | Şimdilik seçilmedi |
| Ayrı Node API + worker + PostgreSQL | Kaynak taraması daha bağımsız ölçeklenebilir | İki deploy, kuyruk ve operasyon yükü | Trafik/iş süresi büyürse değerlendir |

## 4. Teknoloji Yığını

| Katman | Seçim | Not |
|---|---|---|
| Dil | TypeScript, strict mode | İstemci ve sunucuda tek dil |
| Web | Next.js App Router | Server Components varsayılan; etkileşimli parçalar Client Component |
| UI | Tailwind CSS + yerel HTML elemanları | MVP'de ayrı component kütüphanesi yok |
| Veritabanı | Supabase yönetimli PostgreSQL | SQL migration ve Row Level Security |
| Kimlik | Supabase Auth | Herkese açık kayıt yok; kullanıcıları admin oluşturur |
| DB erişimi | `@supabase/ssr` ve `@supabase/supabase-js` | ORM eklenmez; üretilmiş DB tipleri kullanılır |
| Dış kaynak fetch | Node `fetch` | Timeout ve kontrollü User-Agent ile |
| HTML parse | Cheerio | Yalnızca kaynak adapter'larında |
| Veri doğrulama | Zod | Dış kaynaklardan normalize edilen kayıtlar için |
| Zamanlama | Vercel Cron + admin manuel tetikleme | Günlük, UTC saatinden İstanbul saatine göre ayarlanır |
| Test | Vitest | Parser fixture ve kritik iş kuralları |
| Hosting | Vercel | Uygulama ve cron endpoint |
| Gözlem | `sync_runs`, audit log ve Vercel logları | MVP'de ayrı APM/Sentry yok |

Sürüm numaraları proje oluşturulurken güncel kararlı sürümlerden kilit dosyasına sabitlenir. Vendor fiyat ve kota bilgileri üretim öncesi kendi resmî sayfalarından kontrol edilir.

`@supabase/ssr` beta durumundadır. MVP sırasında tek auth entegrasyonu olarak kullanılır; paket yükseltmeleri otomatikleştirilmez ve her yükseltmede login/logout/session-refresh akışı tekrar test edilir.

## 5. Proje Yapısı

```text
accountie/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/dashboard/page.tsx
│   │   ├── (app)/calendar/page.tsx
│   │   ├── (app)/updates/page.tsx
│   │   ├── (app)/notes/page.tsx
│   │   ├── (app)/favorites/page.tsx
│   │   ├── (admin)/admin/review/page.tsx
│   │   ├── (admin)/admin/sources/page.tsx
│   │   └── api/cron/sync-sources/route.ts
│   ├── components/
│   │   ├── layout/
│   │   ├── calendar/
│   │   ├── updates/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── sources/
│   │   │   ├── gib-calendar.ts
│   │   │   ├── sgk-announcements.ts
│   │   │   ├── resmi-gazete.ts
│   │   │   ├── normalize.ts
│   │   │   └── sync.ts
│   │   ├── calendar/
│   │   └── validation/
│   └── middleware.ts
├── supabase/migrations/
├── tests/
│   ├── fixtures/
│   ├── source-parsers.test.ts
│   └── calendar-status.test.ts
├── agent_docs/
├── AGENTS.md
├── MEMORY.md
├── vercel.json
└── package.json
```

Klasörler ihtiyaç oldukça oluşturulur. Boş veya geleceğe yönelik soyutlamalar eklenmez.

## 6. Veri Modeli

Tüm birincil anahtarlar UUID, zaman alanları `timestamptz` olmalıdır. Kullanıcıya gösterilen yükümlülük tarihleri `date` olarak tutulur; gün hesabı `Europe/Istanbul` ile yapılır.

### 6.1 `profiles`

| Alan | Tip | Kural |
|---|---|---|
| `id` | uuid | `auth.users.id` ile PK/FK |
| `full_name` | text | zorunlu |
| `role` | text | `admin` veya `staff` check constraint |
| `active` | boolean | varsayılan true |
| `created_at` | timestamptz | varsayılan now |

### 6.2 `sources`

| Alan | Tip | Kural |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | unique: `gib_calendar`, `sgk_announcements`, `resmi_gazete` |
| `name` | text | kullanıcıya gösterilen ad |
| `base_url` | text | yalnızca izinli HTTPS URL |
| `enabled` | boolean | varsayılan true |
| `last_success_at` | timestamptz | nullable |
| `last_error_at` | timestamptz | nullable |
| `last_error` | text | kullanıcıya güvenli kısa hata |

### 6.3 `sync_runs`

| Alan | Tip | Kural |
|---|---|---|
| `id` | uuid | PK |
| `source_id` | uuid | FK sources |
| `trigger` | text | `cron` veya `manual` |
| `status` | text | `running`, `success`, `failed` |
| `started_at` | timestamptz | zorunlu |
| `finished_at` | timestamptz | nullable |
| `items_seen` | integer | varsayılan 0 |
| `changes_found` | integer | varsayılan 0 |
| `error_message` | text | nullable, secret içermemeli |

### 6.4 `source_items`

Ham kaynağın kimliğini ve değişimini izler.

| Alan | Tip | Kural |
|---|---|---|
| `id` | uuid | PK |
| `source_id` | uuid | FK sources |
| `external_key` | text | source içinde kararlı anahtar |
| `canonical_url` | text | resmî URL |
| `content_hash` | text | normalize edilmiş alanların SHA-256 hash'i |
| `raw_payload` | jsonb | gereken minimum ham/normalize alanlar |
| `first_seen_at` | timestamptz | zorunlu |
| `last_seen_at` | timestamptz | zorunlu |
| `missing_since` | timestamptz | nullable; otomatik silme yok |

Unique constraint: `(source_id, external_key)`.

### 6.5 `calendar_events`

| Alan | Tip | Kural |
|---|---|---|
| `id` | uuid | PK |
| `source_item_id` | uuid | nullable FK |
| `authority` | text | GİB, SGK veya diğer |
| `title` | text | zorunlu |
| `category` | text | beyan, ödeme, bildirim, berat, diğer |
| `tax_type` | text | nullable |
| `period_label` | text | nullable |
| `start_date` | date | nullable |
| `due_date` | date | zorunlu |
| `description` | text | zorunlu |
| `source_url` | text | zorunlu resmî HTTPS URL |
| `review_status` | text | pending, published, rejected, archived |
| `published_at` | timestamptz | nullable |
| `created_at` | timestamptz | zorunlu |
| `updated_at` | timestamptz | zorunlu |

Takvim olayının önem durumu veritabanında saklanmaz; güncel tarihe göre sorgu/UI katmanında hesaplanır.

### 6.6 `updates`

| Alan | Tip | Kural |
|---|---|---|
| `id` | uuid | PK |
| `source_item_id` | uuid | nullable FK |
| `authority` | text | GİB, SGK, Resmî Gazete |
| `kind` | text | duyuru, mevzuat, resmi_gazete |
| `title` | text | zorunlu |
| `excerpt` | text | kaynaktaki açıklama veya admin notu |
| `published_on` | date | zorunlu |
| `source_url` | text | zorunlu |
| `review_status` | text | pending, published, rejected, archived |
| `created_at` | timestamptz | zorunlu |

### 6.7 Kullanıcı verileri

`notes`: `id`, `user_id`, `title`, `body`, `related_type`, `related_id`, `remind_at`, `completed_at`, timestamps.  
`favorites`: `user_id`, `entity_type`, `entity_id`, `created_at`; unique `(user_id, entity_type, entity_id)`.  
`read_items`: `user_id`, `entity_type`, `entity_id`, `read_at`; unique aynı üç alan.  
`audit_logs`: `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_data jsonb`, `after_data jsonb`, `created_at`.

## 7. Kaynak Toplama Tasarımı

### 7.1 Ortak akış

```text
Cron veya admin tetikler
  → izinli source kaydını seç
  → timeout ile fetch et
  → kaynağa özel parser çalıştır
  → Zod ile normalize sonucu doğrula
  → external_key ve content_hash üret
  → source_items upsert et
  → yeni/değişen kayıt için pending içerik üret
  → sync_runs sonucunu yaz
  → kaynak sağlık bilgisini güncelle
```

### 7.2 Güvenlik sınırı

- Yalnızca kodda tanımlı ve `sources` tablosunda etkin olan resmî hostlara istek yapılır.
- Kullanıcı tarafından verilen rastgele URL fetch edilmez; SSRF yüzeyi açılmaz.
- Redirect sonrası host tekrar doğrulanır veya redirect kapalı tutulur.
- İsteklerde timeout ve maksimum yanıt boyutu uygulanır.
- HTML, script çalıştırılmadan metin olarak ayrıştırılır.
- Dış metindeki komut/talimat benzeri içerikler hiçbir zaman çalıştırılmaz.
- Ham sayfanın tamamı gereksizse saklanmaz; normalize alanlar ve hash yeterlidir.

### 7.3 Kaynak davranışları

#### GİB Vergi Takvimi

- Hedef: başlık, dönem, başlangıç/son tarih, işlem türü, vergi türü, açıklama ve URL.
- Aynı yükümlülüğün kaynağa bağlı kararlı alanlarından `external_key` üretilir.
- Son tarih değişirse mevcut yayımlanmış kayıt değiştirilmez; pending revizyon oluşturulur.
- Admin eski ve yeni tarihi birlikte görür.

#### SGK duyuruları

- Önce resmî RSS/duyuru yüzeyi denenir; kullanılabilir yapı hangisiyse source adapter onu tek yerde tanımlar.
- Başlık, tarih, birim/kategori ve resmî URL alınır.
- MVP otomatik olarak “muhasebe için önemli” kararı vermez; admin gereksiz kayıtları reddedebilir.

#### Resmî Gazete

- Günlük sayı, tarih, sayı/ilan başlığı ve resmî bağlantı toplanır.
- MVP PDF metnini OCR etmez ve hukuki özet üretmez.
- Kaynağa erişim başarısızsa üçüncü taraf kopya yayımlanmaz.

### 7.4 Idempotency ve eşzamanlılık

- `source_items(source_id, external_key)` unique constraint kopyaları engeller.
- Aynı kaynak için ikinci çalışma başlamadan PostgreSQL advisory lock veya atomik `running` kontrolü kullanılır.
- Hash değişmediyse yeni review kaydı üretilmez; yalnızca `last_seen_at` güncellenir.
- Bir kayıt kaynakta görünmezse `missing_since` yazılır; otomatik silinmez.

### 7.5 Hata yönetimi

- Bir kaynak hatası diğer kaynakların taramasını kesmez.
- HTTP hata kodu, timeout, parse hatası ve validation hatası ayrıştırılır.
- Loglarda HTML gövdesi, cookie, anahtar veya kişisel not bulunmaz.
- Admin, başarısız kaynağı ayrı olarak yeniden tarayabilir.
- Fixture testi başarısız olan parser üretime alınmaz.

## 8. Uygulama ve API Tasarımı

### Server Components

- Dashboard, takvim, güncel akış ve favorilerin ilk verisini doğrudan sunucu tarafında PostgreSQL'den okur.
- Server Component içinden kendi Route Handler'ına HTTP isteği yapılmaz.
- Filtreler URL search params ile taşınır; görünüm paylaşılabilir ve geri/ileri tuşları çalışır.

### Server Actions / Route Handlers

- Not oluşturma, favorileme ve admin onayı gibi form mutasyonları Server Action ile yapılabilir.
- Cron ve manuel kaynak taraması ayrı Route Handler kullanır.
- Her mutasyonda oturum ve rol sunucu tarafında tekrar kontrol edilir.
- Form ve dış kaynak girdileri runtime validation'dan geçer.

### Gerekli route yüzeyleri

| Method | Route/Action | Yetki | Amaç |
|---|---|---|---|
| GET | `/api/cron/sync-sources` | `CRON_SECRET` | Tüm etkin kaynakları tara |
| POST | `/admin/sources/:id/sync` | admin | Tek kaynağı manuel tara |
| POST | review action | admin | Pending kaydı onayla/reddet |
| POST | note action | authenticated | Kendi notunu oluştur/güncelle |
| POST | favorite action | authenticated | Favori ekle/çıkar |

Public JSON API MVP kapsamında değildir.

## 9. Kimlik ve Yetkilendirme

- Supabase Auth e-posta/parola kullanılır.
- Herkese açık signup ekranı yoktur; ilk admin Supabase panelinden veya güvenli seed adımıyla oluşturulur.
- MVP'de kullanıcı daveti ve parola sıfırlama ofis yöneticisi tarafından yönetilir. Otomatik e-posta akışı ancak üretim SMTP'si tanımlandığında etkinleştirilir.
- Middleware oturum gerektiren route'ları korur; asıl rol kontrolü sunucu katmanında yapılır.
- RLS politikaları:
  - Authenticated kullanıcılar yalnızca `published` takvim ve güncel akış kayıtlarını okuyabilir.
  - Kullanıcılar yalnızca kendi not, favori ve okundu kayıtlarını yönetebilir.
  - Yalnızca admin pending içerik, kaynak ve audit verisini görebilir/değiştirebilir.
- Service role anahtarı yalnızca sunucu/cron ortamında bulunur ve tarayıcı bundle'ına girmez.

## 10. UI Tasarımı

### Genel yerleşim

- Sol tarafta koyu mavi, daraltılabilir menü
- Üstte sayfa başlığı, kaynak güncellik durumu ve admin için `Şimdi tara`
- Ana içerikte özet kartları, acil uyarı ve yoğun bilgi tablosu
- Masaüstü öncelikli, tablet uyumlu

### Bileşenler

- `UrgencyBadge`: renk + ikon + metin
- `SummaryCard`: sayı, açıklama, filtreye bağlantı
- `CalendarTable`: server-side filtre, sayfalama, kaynak bağlantısı
- `UpdateCard`: kurum, tarih, başlık, okundu/favori
- `SourceHealth`: son başarı, hata, tarama durumu
- `ReviewDiff`: değişen alanları eski/yeni biçimde gösterir

Yerel `button`, `table`, `dialog` ve form elemanları tercih edilir. Üç günlük MVP'de ayrı bir UI kütüphanesi eklenmez.

## 11. İş Kuralları

### Önem durumu

`daysRemaining = dueDate - todayInIstanbul`

| Değer | Durum |
|---|---|
| `< 0` | Geçti |
| `0` | Son gün |
| `1..3` | Acil |
| `4..7` | Yaklaşıyor |
| `>= 8` | Zaman var |

### Yayın durumu

- Otomatik bulunan yeni/değişmiş takvim kaydı: `pending`
- Admin onayı: `published`
- Admin reddi: `rejected`
- Kaynakta kaybolma: mevcut kayıt korunur ve admin incelemesine işaretlenir
- Manuel kayıt: admin kaynağı ve açıklamayı girdikten sonra doğrudan yayımlayabilir; audit zorunludur

## 12. Test Stratejisi

MVP'de en yüksek risk kaynak parser'ları, tarih durumu ve yetkilendirmedir. Test kapsamı bunlara odaklanır.

### Otomatik testler

- Her resmî kaynak için kaydedilmiş küçük HTML/RSS fixture'ı
- Parser'ın doğru alanları çıkarması
- Eksik alan veya değişmiş DOM için kontrollü hata
- Aynı içeriğin iki kez işlenmesinde tek kayıt
- İçerik hash'i değiştiğinde pending revizyon
- İstanbul tarihine göre önem durumu sınırları
- Staff kullanıcının admin mutasyonuna erişememesi
- Kullanıcının başka kullanıcı notunu değiştirememesi
- RLS grant/policy allow-deny senaryoları; yerel Supabase CLI kurulmuşsa `npx supabase test db`, aksi halde ayrı test kullanıcılarıyla integration kontrolü

### Manuel smoke test

1. Admin giriş yapar.
2. `Şimdi tara` ile üç kaynağı tarar.
3. Kaynak durumlarında sonuçları görür.
4. Pending bir takvim kaydını inceler ve yayımlar.
5. Staff girişinde kayıt dashboard ve takvimde görünür.
6. Filtre, arama, kaynak linki, favori ve not çalışır.
7. Mobil genişlikte menü ve tablo kullanılabilir kalır.
8. Hatalı cron secret 401 döndürür.

### Doğrulama komutları

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`package.json` içinde bu scriptler açıkça tanımlanır. Test komutu tek sefer çalışıp çıkmalıdır; watch modu CI varsayılanı değildir.

## 13. Kurulum ve Ortam Değişkenleri

### Başlangıç komutları

```bash
npx create-next-app@latest accountie --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd accountie
npm install @supabase/ssr @supabase/supabase-js cheerio zod
npm install -D vitest
```

### Gerekli ortam değişkenleri

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
APP_TIMEZONE=Europe/Istanbul
```

- `.env.local` commit edilmez.
- `.env.example` yalnızca değişken adlarını ve açıklamalarını içerir.
- `SUPABASE_SERVICE_ROLE_KEY` ve `CRON_SECRET` yalnızca sunucu tarafında okunur.
- Geliştirme, preview ve production için ayrı veritabanı/anahtar kullanılması önerilir; üç günlük MVP'de en azından production anahtarları yerel dosyalardan ayrı tutulur.

## 14. Vercel Cron

Örnek plan: her gün **05:10 Europe/Istanbul** karşılığı olan UTC saatte çalıştırılır. Türkiye UTC+3 kullandığı için schedule UTC olarak yazılır ve deploy günü doğrulanır.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/sync-sources",
      "schedule": "10 2 * * *"
    }
  ]
}
```

Route, `Authorization: Bearer <CRON_SECRET>` doğrulaması yapar. Vercel başarısız çağrıyı otomatik tekrar etmediği için admin ekranındaki `Şimdi tara` zorunlu fallback'tir. Cron birden fazla çalışabileceğinden sync idempotent olmalıdır.

## 15. Dağıtım

1. Git repository oluşturulur ve ilk iskelet commit edilir.
2. Supabase projesi açılır; migration uygulanır ve ilk admin oluşturulur.
3. Repository Vercel'e bağlanır.
4. Ortam değişkenleri production ortamına girilir.
5. İlk deploy alınır; migration durumu kontrol edilir.
6. Cron route yetkisiz/yetkili senaryolarla test edilir.
7. Üç resmî kaynak için manuel canlı tarama yapılır.
8. Admin bir pending kaydı yayımlar; staff hesabıyla görünürlüğü doğrulanır.
9. `npm run build` ile aynı commit'in yerelde de üretim build'i aldığı doğrulanır.

Rollback, Vercel'in önceki deployment'ına dönmek ve gerekirse geriye uyumlu DB migration kullanmakla yapılır. MVP'de destructive migration yapılmaz.

## 16. Gözlemlenebilirlik ve İşletim

- Admin kaynak ekranı son başarılı/başarısız çalışma zamanını gösterir.
- `sync_runs` her tetiklemeyi ve sonuç sayısını tutar.
- Vercel logları yalnızca teknik hata ve correlation id içerir.
- Üretim kontrol rutini: her sabah kaynak durumunu kontrol et, pending değişiklikleri incele, kırmızı hata varsa manuel tarama dene.
- Parser kırılırsa source devre dışı bırakılır; manuel kayıt girilir ve fixture güncellenerek parser onarılır.

## 17. Performans

- İlk sorgular için indeksler: `calendar_events(due_date, review_status)`, `updates(published_on, review_status)`, `source_items(source_id, external_key)`, `notes(user_id, remind_at)`.
- Takvim sorguları sunucu tarafında filtrelenir ve sayfalanır.
- Dashboard toplamları ayrı cache katmanı olmadan indeksli SQL sorgularıyla hesaplanır.
- Ölçülmüş ihtiyaç oluşmadan Redis, Elasticsearch veya ayrı arama servisi eklenmez.

## 18. Maliyet

Bütçe belirtilmediğinden rakam taahhüdü verilmez. İlk ofis kullanımında Vercel ve Supabase'in uygun başlangıç katmanları değerlendirilebilir. Üretimden önce güncel fiyat, cron sıklığı, function süresi, veritabanı yedekleme ve auth limitleri resmî fiyat sayfalarından doğrulanmalıdır.

Ek ücretli servisler MVP'de kullanılmaz:

- Yapay zekâ API'si yok
- SMS/WhatsApp yok
- Ayrı e-posta sağlayıcısı yok
- Ayrı kuyruk/cache/arama servisi yok
- Ayrı gözlem platformu yok

## 19. Üç Günlük Uygulama Sırası

### Gün 1

1. Proje, auth ve migration
2. Temel layout ve roller
3. GİB parser fixture + test
4. Sync kaydı ve GİB import
5. Takvim tablosu ve önem kartları

### Gün 2

1. SGK ve Resmî Gazete adapter'ları
2. Güncel akış
3. Admin source health ve review diff
4. Not, favori ve okundu durumu
5. Manuel `Şimdi tara`

### Gün 3

1. Yetki, parser ve tarih sınır testleri
2. Loading/error/empty states
3. Responsive ve accessibility kontrolü
4. Vercel/Supabase production kurulumu
5. Canlı tarama, smoke test ve hata düzeltmeleri

P1 özellikleri P0 tamamlanmadan geliştirilmez.

## 20. Başlıca Riskler ve Teknik Karşılıkları

| Risk | Teknik karşılık |
|---|---|
| HTML selector kırılması | Fixture testi, source health, eski veriyi koruma |
| Yanlış normalize edilen tarih | Zod doğrulama, tarih parser testi, admin review |
| Cron tekrarı | Unique constraint, content hash ve kaynak kilidi |
| Cron başarısızlığı | `sync_runs`, görünür hata ve manuel retry |
| Yetki sızıntısı | Server-side role check + RLS |
| Secret sızıntısı | Server-only modül, env kontrolü, log redaction |
| Scope büyümesi | AGENTS.md P0 sınırları ve PRD out-of-scope listesi |

## 21. Teknik Tamamlanma Tanımı

- [ ] SQL migration sıfırdan uygulanabiliyor.
- [ ] İlk admin ve staff hesabı ile roller doğrulanıyor.
- [ ] Üç parser fixture testinden geçiyor ve canlı kaynak taraması başarılı.
- [ ] Sync aynı veriyle tekrar çalışınca kopya üretmiyor.
- [ ] Tarih değişikliği pending review üretiyor.
- [ ] Admin onayı sonrası kayıt staff ekranına geliyor.
- [ ] Not/favori RLS politikaları başka kullanıcının verisini engelliyor.
- [ ] Cron secret olmayan istek 401 alıyor.
- [ ] Lint, typecheck, test ve build geçiyor.
- [ ] Üretimde temel kullanıcı akışı manuel doğrulanıyor.

## 22. Handoff Context

- Stage: techdesign
- App name: Accountie
- User level: C
- Target platform: Web
- Budget: TBD; düşük kullanım odaklı
- Timeline: 3 gün
- Chosen stack: Next.js App Router + TypeScript + Supabase PostgreSQL/Auth + Vercel Cron
- AI coding tool: Codex
- Product AI: MVP dışında
- Source files: PRD-Accountie-MVP.md → TechDesign-Accountie-MVP.md

```json
{
  "appName": "Accountie",
  "stack": {
    "frontend": "Next.js App Router with TypeScript and Tailwind CSS",
    "backend": "Next.js Server Components, Server Actions and Route Handlers",
    "database": "Supabase PostgreSQL via supabase-js; no ORM",
    "auth": "Supabase Auth with admin-created users",
    "styling": "Tailwind CSS and native HTML elements",
    "deployment": "Vercel with Vercel Cron"
  },
  "commands": {
    "setup": "npm install",
    "dev": "npm run dev",
    "test": "npm test",
    "typecheck": "npm run typecheck",
    "lint": "npm run lint",
    "build": "npm run build"
  },
  "aiScope": "No product AI in MVP; Codex is used only for development"
}
```
