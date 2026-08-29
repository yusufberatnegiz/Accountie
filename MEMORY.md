# Accountie Proje Hafızası

## Mevcut durum

- Neon Postgres/Auth ve Drizzle bağlı; giriş ekranında e-posta/parola ile hesap oluşturma akışı mevcut.
- GİB Vergi Takvimi, SGK resmî duyuruları ve günlük Resmî Gazete için canlı adaptör ile idempotent senkronizasyon ve ayrı Resmî Gazete sayfası mevcut.
- Günlük Vercel cron ve tüm oturum açmış kullanıcılar için `Şimdi tara` hazır.
- Dashboard, GİB/SGK kartları, gelişmiş takvim filtreleri, birleşik güncel akış, kaynak sağlığı, favoriler, okundu durumu ve kişisel tarihli/hatırlatıcılı/bağlantılı notlar mevcut.
- Ayrı admin paneli ve ürün içi rol/onay akışı kaldırıldı.
- Production Neon dalında 174 takvim olayı ve toplam 196 resmî kaynak kaydı var; bunun 10'u SGK duyurusu, 12'si Resmî Gazete içeriği ve 5 takvim satırı SGK/MPHB yükümlülüğüdür.
- İkinci canlı tarama üç kaynakta da `changed: 0` döndürdü; cron 4–5 saniyede tamamlandı.
- Neon Auth public signup production dalında açık; giriş ekranındaki hesap oluşturma akışı çalışır.
- Production Neon dalında 29 Ağustos 2026 Resmî Gazete fihristinden 13 güncel içerik bulunuyor.
- TypeScript, 22 test, lint ve production build başarılı; oturumsuz rota 307, session endpoint 200 ve anahtarsız cron 401 döndürüyor.

## Aktif iş

Vercel production bağlantısı ve yeni kullanıcıyla browser E2E doğrulaması.

## Sonraki adım

Vercel production env değerlerini doğrula ve yeni kullanıcıyla sahiplikli özelliklerin browser E2E testini yap.

## Engeller

- Vercel proje bağlantısı ve production ortam değişkenleri henüz doğrulanmadı.

## Kalıcı kararlar

- Tüm ofis kullanıcıları eşittir; admin paneli yoktur.
- Resmî kayıtlar onay kuyruğu olmadan otomatik yayımlanır.
- Kaynak hatası eski yayımlanmış veriyi silmez.
- Demo/seed/üçüncü taraf kayıt gösterilmez.
- Notlar kişiseldir; tarih, isteğe bağlı hatırlatma, ilgili kayıt ve tamamlanma durumu içerir.
- Veri ve kimlik servisleri Neon Postgres + Neon Auth'tır.
- Marka görseli mavi hesap makinesi biçimindeki `public/accountie-logo.svg` dosyasıdır; sidebar, giriş ekranı ve favicon aynı varlığı kullanır.
- Tamamlanan ve doğrulanan değişiklikler `main` dalına otomatik push edilir; `.env` ve secret dosyaları hiçbir zaman commit edilmez.
