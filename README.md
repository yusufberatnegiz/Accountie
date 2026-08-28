# Accountie

Accountie, tek bir muhasebe ofisi için resmî beyan/ödeme takvimi ve mevzuat takip uygulamasıdır. Luca'nın yerini almaz; evrak veya muhasebe kaydı işlemez.

## Özellikler

- GİB Vergi Takvimi, SGK duyuruları ve Resmî Gazete'den otomatik canlı veri
- GİB kayıtlarından SGK yükümlülüklerini ayıran takvim ve aciliyet kartları
- Arama, kaynak, işlem, vergi türü, durum ve tarih aralığı filtreleri
- Birleşik güncel akış, okundu durumu ve favoriler
- Kişisel tarihli, hatırlatıcılı ve resmî kayda bağlanabilen notlar
- Kaynak sağlığı, tüm kullanıcılar için manuel tarama ve günlük Vercel Cron
- Neon Auth ile kapalı ofis girişi; ürün içinde admin paneli yok

## Kurulum

```bash
npm install
npm run db:migrate
npm run dev
```

Başlatmadan önce yerelde `.env.local` oluşturun. Gerekli değişkenler: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `NEON_AUTH_COOKIE_SECRET` ve `CRON_SECRET`. Secret değerlerini repoya eklemeyin.

## Kontroller

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Ürün kapsamı için `docs/PRD-Accountie-MVP.md`, mimari için `docs/TechDesign-Accountie-MVP.md` dosyasını okuyun.
