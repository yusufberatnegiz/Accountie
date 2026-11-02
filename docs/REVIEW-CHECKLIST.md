# İnceleme listesi

İlgili maddeler geçmeden iş bitti sayılmaz.

## Temel

- [ ] Değişiklik istenen işle sınırlı; ilgisiz dosya yeniden yazılmadı.
- [ ] `CLAUDE.md` ve `INSTRUCTIONS.md` değişmedi.
- [ ] Sır, token, `.env*` içeriği, fiş fotoğrafı veya kişisel veri commit'te ve çıktıda yok.
- [ ] Korunan eylemler (canlı migration, deploy, push, uzak hesap) yapılmadı veya kullanıcı onayı vardı.
- [ ] Testler önce yazıldı; test, typecheck ve build geçti ya da hata açıklandı.
- [ ] UI değişikliği telefon genişliğinde ve masaüstünde denendi.

## Muhasebe doğruluğu

- [ ] Para hesabı tam sayı kuruşla; kayan nokta toplamı yok.
- [ ] Altın örnek testi (770.08 / 191.03.10 / 331.01) geçiyor.
- [ ] Her fişte borç toplamı = alacak toplamı; dengesiz fiş onaylanamıyor ve dışa aktarılmıyor.
- [ ] Evrak No baştaki sıfırlarla metin olarak korunuyor.
- [ ] Luca kolon adları yalnızca tek sabitte.

## Veritabanı

- [ ] Migration yalnızca `CREATE`; eski tablolara `DROP`, `ALTER`, `RENAME` yok.
- [ ] Migration canlıya uygulanmadı.
- [ ] Her sorgu oturumdaki `userId` ile filtreli.

## Güvenlik

- [ ] Her route oturumu sunucuda doğruluyor; oturumsuz istek 401 aldı (testli).
- [ ] Başka kullanıcının fişine erişim 404 (testli).
- [ ] Girdi Zod ile doğrulanıyor; `status`, `user_id`, `model`, token alanları istemciden alınmıyor.
- [ ] Yükleme: tür ve 10 MB sınırı, içerik `sharp` ile doğrulandı, dosya saklanmıyor.
- [ ] `POST /api/receipts` oran sınırı var.
- [ ] `ANTHROPIC_API_KEY` ve DB bilgileri sadece sunucu env'inde; `NEXT_PUBLIC_` sır yok.
- [ ] Güvenlik başlıkları (CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors, Permissions-Policy) ayarlı.
- [ ] `dangerouslySetInnerHTML` yok.
- [ ] `npm audit`: çözülmemiş yüksek önem bulgusu yok.

## Yapay zeka

- [ ] Modele sadece küçültülmüş, EXIF'siz görüntü ve sabit talimat gidiyor.
- [ ] Model çıktısı şemayla doğrulanıyor; fiş metni talimat sayılmıyor.
- [ ] Başarı, Sonnet'e yükseltme, refusal ve API hatası mock testleri geçti.
- [ ] Log ve hata yanıtlarında fiş içeriği, görüntü veya sır yok.
- [ ] `usage` değerleri kaydediliyor.

## Arayüz

- [ ] `INSTRUCTIONS.md` tasarım kuralları: tek mavi vurgu, gradyan yok, em dash yok, emoji yok, AA kontrast iki temada.
- [ ] Metinler Türkçe ve somut; Luca terimleri doğru.
- [ ] Odak halkası görünür, form alanlarının etiketi var, tutarlar sağa hizalı.

## Son rapor

- Değişen dosyalar
- Çalıştırılan komutlar ve sonuçları
- Tarayıcı kontrolü
- Kontrol edilmeyenler ve kalan riskler
