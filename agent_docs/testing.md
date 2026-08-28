# Testing

## Zorunlu komutlar

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Öncelikli otomatik testler

1. GİB, SGK ve Resmî Gazete parser fixture testleri
2. İstanbul tarihine göre önem durumu sınırları
3. Aynı sync'in kopya üretmemesi
4. Değişen içeriğin pending review üretmesi
5. Staff kullanıcının admin işlemi yapamaması
6. Kullanıcının başka kullanıcının not/favorisine erişememesi
7. RLS grant/policy allow-deny senaryoları

## Fixture kuralları

- Fixture küçük olmalı; yalnızca parser için gereken gerçek HTML/RSS parçalarını içermeli.
- Fixture'ın kaynak URL'si ve alınma tarihi test dosyasında belirtilmeli.
- Parser selector'ı değişirse fixture ve canlı kaynak birlikte doğrulanmalı.
- Tam sayfa veya gereksiz telifli içerik repository'ye kopyalanmamalı.

## Manuel browser smoke testi

1. Admin login
2. Şimdi tara
3. Source health ve sync sonucu
4. Pending diff onayı
5. Staff dashboard/takvim görünürlüğü
6. Filtre, arama ve resmî kaynak linki
7. Not, hatırlatma, favori ve okundu durumu
8. Mobil menü ve tablo
9. Yetkisiz admin route ve hatalı cron secret

Yerel Supabase CLI kurulmuşsa RLS SQL testlerini `npx supabase test db` ile çalıştır. CLI yoksa admin, staff ve ikinci staff test hesaplarıyla allow/deny senaryolarını production öncesi ayrı ayrı doğrula; bu kontrol atlanamaz.

Bir özellik otomatik kontrolleri ve ilgili browser akışını geçmeden tamamlanmış sayılmaz.
