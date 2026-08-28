# Accountie

Tek bir muhasebe ofisi için resmî kaynaklı beyan, ödeme ve mevzuat takip uygulaması.

## Yerel geliştirme

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase değerleri girilmediğinde auth koruması yerel geliştirme için kapalıdır. Üretimde `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` zorunludur. Uygulama hiçbir ortamda demo takvim veya mevzuat kaydı göstermez.

## Kontroller

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Veritabanı

İlk migration: `supabase/migrations/202608280001_initial_schema.sql`

Şema; kullanıcı rolleri, resmî kaynaklar, senkronizasyon kayıtları, onay kuyruğu, takvim, mevzuat akışı, notlar, favoriler, okunma durumu ve denetim kayıtlarını içerir. RLS politikaları varsayılan olarak etkindir.

## Kaynaklar

- GİB Vergi Takvimi: resmî JSON API’den her istekte canlı alınır.
- SGK Duyuruları: sonraki kaynak adaptörü.
- Resmî Gazete: günlük resmî sayfa ve fihrist canlı alınır; bağlantılar resmî hostla sınırlandırılır.

Ürün kapsamı için `docs/PRD-Accountie-MVP.md`, teknik kararlar için `docs/TechDesign-Accountie-MVP.md` dosyasına bakın.
