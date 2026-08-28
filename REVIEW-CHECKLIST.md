# Accountie Review Checklist

## Kapsam

- [ ] Değişiklik mevcut P0 fazına ait.
- [ ] Luca, muhasebe kayıtları, evrak işleme veya ürün içi AI eklenmedi.
- [ ] Gereksiz dependency veya geleceğe yönelik abstraction eklenmedi.

## Doğruluk

- [ ] Her yayımlanan takvim/mevzuat kaydında resmî kaynak URL'si var.
- [ ] Tarih hesapları `Europe/Istanbul` kullanıyor.
- [ ] Yeni/değişen kritik kaynak kayıtları admin review'a gidiyor.
- [ ] Aynı sync tekrar çalıştığında kopya üretmiyor.
- [ ] Kaynak hatası eski yayımlanmış veriyi silmiyor.

## Güvenlik

- [ ] Auth ve rol kontrolü sunucu tarafında yapılıyor.
- [ ] RLS politikaları ilgili tabloyu koruyor.
- [ ] Service role ve cron secret istemciye gitmiyor.
- [ ] Fetch yalnızca izinli resmî hostlara yapılıyor.
- [ ] Redirect, timeout ve maksimum yanıt boyutu ele alınıyor.
- [ ] Loglarda secret, cookie veya kişisel not yok.

## Kullanıcı deneyimi

- [ ] Loading, boş ve hata durumları var.
- [ ] Durumlar yalnızca renkle anlatılmıyor.
- [ ] Klavye ile temel eylemler kullanılabiliyor.
- [ ] Masaüstü ve mobil genişlikte ekran kontrol edildi.
- [ ] Kaynak güncellik/hata durumu görünür.

## Test ve build

- [ ] Parser değişikliği fixture testi içeriyor.
- [ ] Tarih veya yetki kuralı testi var.
- [ ] `npm run lint` geçti.
- [ ] `npm run typecheck` geçti.
- [ ] `npm test` geçti.
- [ ] `npm run build` geçti.
- [ ] İlgili kullanıcı akışı tarayıcıda manuel doğrulandı.

## Dağıtım

- [ ] Migration üretimden önce incelendi.
- [ ] Ortam değişkenleri doğru ortamda tanımlı.
- [ ] Cron endpoint yetkisiz isteğe 401 dönüyor.
- [ ] Canlı kaynak taraması ve admin onay akışı çalışıyor.
- [ ] Geri dönüş yolu biliniyor.

