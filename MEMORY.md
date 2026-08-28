# Accountie Proje Hafızası

## Mevcut durum

- Faz: Çalışan MVP temeli hazır; canlı GİB ve Resmî Gazete okumaları bağlı
- Arayüz: Dashboard, filtrelenebilir takvim, kaynak yönetimi ve P0 sayfa iskeletleri hazır
- Altyapı: Supabase şeması, RLS, giriş sınırı ve ortam değişkenleri hazır
- Kaynak: GİB resmî JSON API ve Resmî Gazete günlük sayfası canlı okunuyor; izinli alan adı/timeout/boyut sınırı uygulanıyor
- Doğrulama: Lint, TypeScript, test, production build ve masaüstü/mobil tarayıcı kontrolü geçiyor

## Aktif iş

Supabase projesini bağla; migration'ı uygula; canlı kaynak kayıtlarını idempotent senkronizasyon ve admin onay kuyruğuna yaz.

## Sonraki adım

Admin onay kuyruğu ile sync route/cron akışını tamamla; ardından SGK adaptörünü ekle.

## Engeller

- Supabase proje URL'si ve publishable/service-role anahtarları henüz yok.
- Vercel proje bilgileri henüz yok.

## Kalıcı kararlar

- Kritik tarih değişiklikleri admin onayı olmadan yayımlanmaz.
- Eski yayımlanmış veri, kaynak hatası nedeniyle otomatik silinmez.
- Resmî Gazete MVP'de metadata ve bağlantı düzeyinde işlenir; PDF/OCR yoktur.
- P0 tamamlanmadan e-posta, takvim UI veya CSV gibi P1 işleri yapılmaz.
- Kaynak çağrıları yalnızca sabit izin listesindeki resmî HTTPS alan adlarına yapılır.
- Tüm takvim ve Resmî Gazete kayıtları canlı resmî kaynaktan gelir; demo/seed/üçüncü taraf kayıt gösterilmez.
- Canlı kaynak hatasında sistem boş durum göstererek güvenli biçimde kapanır.

## Güncelleme biçimi

Her çalışma sonunda yalnızca şu alanları güncelle:

- Mevcut durum
- Aktif iş
- Sonraki adım
- Yeni engeller
- Kullanıcı tarafından onaylanan kalıcı kararlar
