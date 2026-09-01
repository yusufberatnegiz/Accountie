<p align="center">
  <img src="public/accountie-logo.png" alt="Accountie" width="112" />
</p>

<h1 align="center">Accountie</h1>

<p align="center">
  Muhasebe ofisleri için resmî beyan, ödeme ve mevzuat takip uygulaması.
</p>

<p align="center">
  <a href="https://accountie.vercel.app">Canlı uygulama</a> ·
  <a href="docs/PRD-Accountie-MVP.md">Ürün gereksinimleri</a> ·
  <a href="docs/TechDesign-Accountie-MVP.md">Teknik tasarım</a>
</p>

## Hakkında

Accountie; GİB, SGK ve Resmî Gazete verilerini tek ekranda toplar, yaklaşan yükümlülükleri gösterir ve ofis çalışanlarının kişisel notlarını takip etmesini sağlar. Luca'nın yerini almaz; evrak, muhasebe kaydı, beyan gönderimi veya ödeme işlemez.

## Özellikler

- GİB Vergi Takvimi, SGK duyuruları ve günlük Resmî Gazete'den otomatik canlı veri
- İstanbul saatine göre aciliyet hesaplayan beyan ve ödeme takvimi
- Arama, kaynak, işlem, vergi türü, durum ve tarih aralığı filtreleri
- Birleşik güncel akış, okundu durumu ve kullanıcıya özel favoriler
- Tarihli, hatırlatıcılı ve resmî kayda bağlanabilen kişisel notlar
- Kaynak sağlığı, manuel tarama ve günlük Vercel Cron
- Neon Auth ile e-posta/parola girişi; ayrı admin paneli veya rol ayrımı yok

## Mimari

```text
Next.js / Vercel
├── Neon Auth
├── Neon Postgres + Drizzle
└── Resmî kaynak senkronizasyonu
    ├── GİB Vergi Takvimi
    ├── SGK Duyuruları
    └── Resmî Gazete
```

Kaynaklar birbirinden bağımsız taranır. Bir kaynak hata verdiğinde diğer taramalar devam eder ve daha önce yayımlanan kayıtlar korunur. Kayıtlar resmî URL ve içerik hash'iyle idempotent olarak güncellenir.

## Teknolojiler

- Next.js 16, React 19 ve TypeScript
- Neon Postgres ve Neon Auth
- Drizzle ORM
- Sade ve responsive CSS
- Vitest ve ESLint
- Vercel Hosting ve Vercel Cron

## Yerel kurulum

Gereksinimler: Node.js 20.9 veya üzeri, npm ve bir Neon projesi.

```bash
git clone https://github.com/yusufberatnegiz/Accountie.git
cd Accountie
npm ci
```

Kök dizinde `.env.local` oluşturup aşağıdaki değişkenleri tanımlayın:

| Değişken | Kullanım |
| --- | --- |
| `DATABASE_URL` | Uygulama sorguları için pooled Postgres bağlantısı |
| `DATABASE_URL_UNPOOLED` | Migration için doğrudan Postgres bağlantısı |
| `NEON_AUTH_BASE_URL` | Neon Auth API adresi |
| `NEON_AUTH_JWKS_URL` | Oturum token doğrulama adresi |
| `NEON_AUTH_COOKIE_SECRET` | Oturum çerezlerini imzalama anahtarı |
| `CRON_SECRET` | Günlük kaynak tarama endpoint anahtarı |

Secret değerlerini repoya eklemeyin. Ardından veritabanını hazırlayıp uygulamayı başlatın:

```bash
npm run db:migrate
npm run dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusunu başlatır |
| `npm run build` | Production derlemesi oluşturur |
| `npm run lint` | ESLint kontrolünü çalıştırır |
| `npm run typecheck` | TypeScript kontrolünü çalıştırır |
| `npm test` | Vitest testlerini çalıştırır |
| `npm run db:generate` | Drizzle migration üretir |
| `npm run db:migrate` | Migration'ları uygular |
| `npm run db:studio` | Drizzle Studio'yu açar |

## Veri kaynakları ve güvenlik

Uygulama yalnızca [GİB](https://www.gib.gov.tr/vergi-takvimi), [SGK](https://www.sgk.gov.tr/Duyuru) ve [Resmî Gazete](https://www.resmigazete.gov.tr) HTTPS alan adlarına istek gönderir. Dış yanıtlar boyut, zaman aşımı, host ve şema kontrollerinden geçirilir. Kullanıcı mutasyonlarında oturum ve kayıt sahipliği sunucuda doğrulanır.

Takvim ve mevzuat bilgileri takip kolaylığı sağlar; işlem öncesinde ilgili resmî kaynak esas alınmalıdır.

## Dağıtım

Uygulama Vercel'e doğrudan deploy edilebilir. `vercel.json`, `/api/cron/sync-sources` endpoint'ini her gün `05:00 UTC` (`08:00 Europe/Istanbul`) çalıştırır. Production ortamında tüm değişkenleri Vercel Project Settings üzerinden tanımlayın.
