# Test

Yaklaşım TDD: yeni kural veya hata düzeltmesi önce başarısız testle başlar.

## Bitirmeden önce

- [ ] İlgili testler önce yazıldı ve geçiyor.
- [ ] Typecheck ve build temiz.
- [ ] UI değişikliği telefon genişliğinde ve masaüstünde denendi.
- [ ] Hiçbir test atlanmadı veya gevşetilmedi.
- [ ] Sonuç raporunda kanıt var (komut ve çıktı özeti).

## Komutlar (doğrulanmadı, iskelet kurulunca güncellenecek)

- Tüm testler: `npx vitest run`
- Tek test: `npx vitest run src/lib/journal.test.ts`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`

## Ne test edilir

| Değişiklik | En az kontrol |
|---|---|
| Para, açıklama, yevmiye, kontrol, Luca dosyası | Birim testi (altın örnek dahil) |
| Route handler | Mock oturum ve mock DB ile entegrasyon testi |
| Yetki ve sahiplik | Oturumsuz 401, başka kullanıcının kaydı 404 |
| Migration | Üretilen SQL'de `DROP` yok |
| Arayüz | Tarayıcıda çekim, kontrol, onay, indirme |
| Yapay zeka | SDK mock'u ile başarı, yükseltme, refusal, hata |

## Altın örnek

Girdi (model çıktısı): unvan `ÖRNEK BALIK LOKANTASI`, fiş no `0412`, tarih `08.09.2026`, `vatLines: [{ rate: 10, gross: "6.480,00", vat: "589,09" }]`, toplam `6.480,00`, ödeme `card`, kategori `meal`.

Beklenen satırlar:

| Hesap | Borç (kuruş) | Alacak (kuruş) |
|---|---|---|
| 770.08 | 589092 | 0 |
| 191.03.10 | 58909 | 0 |
| 331.01 | 0 | 648000 |

Hepsinde Evrak No `0412`, BT `ÖK`, açıklama `örnek balık lokantası`. Bu test her zaman geçmelidir.

## Diğer zorunlu durumlar

- Çok oranlı fiş (%1 + %20), %0 satırı, eski %8 oranı uyarısı.
- KDV okunamadı: `vatFromGross(648000, 10) === 58909`.
- Oran başına 1 kuruş fark: en büyük matrah satırına eklenir. 2 kuruş ve üstü: dengelenmez, uyarı.
- `parseTrAmount`: `"6.480,00"`, `"589,09"`, `"1.234.567,89"`, `"12,5"`, geçersiz metin hata.
- Açıklama: `I` -> `ı`, `İ` -> `i`, 60 karakter sınırı.
- Excel: başlıklar sabitle aynı, `0412` metin hücresi, 51 fişte 2 dosya, 400 satırı aşan fiş yeni dosyaya.

## Yapay zeka kontrolleri

- Doğru fiş: şemaya uygun çıktı, tek Haiku çağrısı.
- Toplam tutmuyor: bir kez Sonnet çağrısı, sonra uyarı.
- `stop_reason: "refusal"`: Sonnet ile tekrar.
- API hatası veya zaman aşımı: kullanıcıya genel Türkçe mesaj, fiş elle doldurulabilir.
- Fiş üzerinde talimat benzeri metin: çıktı yine sadece şema alanları.
- Log ve yanıtlarda görüntü, fiş içeriği veya env değeri yok.

Gerçek API ile doğruluk ölçümü sadece elle ve `ANTHROPIC_API_KEY` varken yapılır; otomatik testlere girmez.
