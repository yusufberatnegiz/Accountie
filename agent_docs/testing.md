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

Girdi (model çıktısı): unvan `ARKADAŞ ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ`, fiş no `0047`, tarih `05.09.2026`, `vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18" }]`, toplam `8.725,00`, ödeme `card`, kategori `meal`.

Beklenen satırlar:

| Hesap | Borç (kuruş) | Alacak (kuruş) |
|---|---|---|
| 770.08 | 793182 | 0 |
| 191.03.10 | 79318 | 0 |
| 331.01 | 0 | 872500 |

Hepsinde Evrak No `0047`, BT `ÖK`, açıklama `arkadaş alabalık üretim çiftliği`. Bu test her zaman geçmelidir.

## Diğer zorunlu durumlar

- Çok oranlı fiş (%1 + %20), %0 satırı, eski %8 oranı uyarısı.
- KDV okunamadı: `vatFromGross(872500, 10) === 79318`.
- Oran başına 1 kuruş fark: en büyük matrah satırına eklenir. 2 kuruş ve üstü: dengelenmez, uyarı.
- `parseTrAmount`: `"8.725,00"`, `"793,18"`, `"1.234.567,89"`, `"12,5"`, geçersiz metin hata.
- Açıklama: `I` -> `ı`, `İ` -> `i`, 60 karakter sınırı.
- Excel: başlıklar sabitle aynı, `0047` metin hücresi, 51 fişte 2 dosya, 400 satırı aşan fiş yeni dosyaya.

## Yapay zeka kontrolleri

- Doğru fiş: şemaya uygun çıktı, tek Haiku çağrısı.
- Toplam tutmuyor: bir kez Sonnet çağrısı, sonra uyarı.
- `stop_reason: "refusal"`: Sonnet ile tekrar.
- API hatası veya zaman aşımı: kullanıcıya genel Türkçe mesaj, fiş elle doldurulabilir.
- Fiş üzerinde talimat benzeri metin: çıktı yine sadece şema alanları.
- Log ve yanıtlarda görüntü, fiş içeriği veya env değeri yok.

Gerçek API ile doğruluk ölçümü sadece elle ve `ANTHROPIC_API_KEY` varken yapılır; otomatik testlere girmez.
