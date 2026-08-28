# Test Stratejisi

## Zorunlu komutlar

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Otomatik test önceliği

1. GİB, SGK ve Resmî Gazete parser fixture'ları
2. İstanbul tarih/aciliyet hesapları
3. İzinli kaynak URL, yönlendirme ve boyut sınırı
4. İçerik hash/idempotency yardımcıları
5. Cron secret kontrolü ve kullanıcıya ait mutation'lar

## Browser smoke testi

1. Login hata ve başarı akışı
2. Dashboard masaüstü/mobil
3. Takvim filtreleri, favori
4. GİB/SGK/Resmî Gazete güncel akışı, okundu
5. Not ekleme/düzenleme/hatırlatma/tamamlama/silme
6. `Şimdi tara` sonrası kaynak sağlığı

Canlı kaynak testi sabit fixture testinin yerine geçmez. Başarısız kaynak diğer kaynakları veya eski kayıtları silmemelidir.
