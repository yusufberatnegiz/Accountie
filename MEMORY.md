# Accountie Proje Hafızası

## Mevcut durum

- Neon Postgres/Auth ve Drizzle bağlı; public signup kapalı.
- GİB Vergi Takvimi, SGK resmî duyuruları ve günlük Resmî Gazete için canlı adaptör ile idempotent senkronizasyon mevcut.
- Günlük Vercel cron ve tüm oturum açmış kullanıcılar için `Şimdi tara` hazır.
- Dashboard, GİB/SGK kartları, gelişmiş takvim filtreleri, birleşik güncel akış, kaynak sağlığı, favoriler, okundu durumu ve kişisel tarihli/hatırlatıcılı/bağlantılı notlar mevcut.
- Ayrı admin paneli ve ürün içi rol/onay akışı kaldırıldı.
- Production Neon dalında 174 takvim olayı ve toplam 196 resmî kaynak kaydı var; bunun 10'u SGK duyurusu, 12'si Resmî Gazete içeriği ve 5 takvim satırı SGK/MPHB yükümlülüğüdür.
- İkinci canlı tarama üç kaynakta da `changed: 0` döndürdü; cron 4–5 saniyede tamamlandı.
- TypeScript, 21 test, lint ve production build başarılı; oturumsuz rota 307, session endpoint 200 ve anahtarsız cron 401 döndürüyor.

## Aktif iş

Vercel production bağlantısı ve ilk ofis hesabının açılması.

## UI yönü

- 2026-08-28: Accountie arayüzü koyu varsayılan temaya geçirildi; derin lacivert canvas, yükseltilmiş mavi-siyah yüzeyler, mavi birincil aksiyonlar ve karanlık zemine ayarlanmış durum renkleri kullanılıyor. Sidebar, topbar, kartlar, tablolar, filtreler, notlar, favoriler ve giriş yüzeyi aynı görsel sistemle yenilendi; davranış ve veri akışı değiştirilmedi.

## Sonraki adım

Vercel projesini bağla, production env değerlerini ekle, ilk kullanıcıyla sahiplikli özelliklerin browser E2E testini yap ve deploy et.

## Engeller

- Vercel proje bağlantısı ve production ortam değişkenleri henüz doğrulanmadı.
- İlk ofis kullanıcısı Neon Auth üzerinden ofis tarafından oluşturulmalı.

## Kalıcı kararlar

- Tüm ofis kullanıcıları eşittir; admin paneli yoktur.
- Resmî kayıtlar onay kuyruğu olmadan otomatik yayımlanır.
- Kaynak hatası eski yayımlanmış veriyi silmez.
- Demo/seed/üçüncü taraf kayıt gösterilmez.
- Notlar kişiseldir; tarih, isteğe bağlı hatırlatma, ilgili kayıt ve tamamlanma durumu içerir.
- Veri ve kimlik servisleri Neon Postgres + Neon Auth'tır.
