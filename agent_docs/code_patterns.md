# Kod kalıpları

## Mimari

- Saf iş kuralları `src/lib/` altında, framework'ten bağımsız: `money`, `description`, `checks`, `journal`, `luca`. UI ve route handler bunları çağırır, kural içermez.
- Veritabanı erişimi yalnızca `src/db/queries.ts`. Route handler'da doğrudan `db.select` yok.
- Anthropic SDK çağrısı yalnızca `src/lib/extract/` içinde tek fonksiyon; testler bu modülü mock'lar.

## Para

- Tip: kuruş `number` (tam sayı, `Number.isSafeInteger` ile korunur). Veritabanında `bigint`.
- Giriş: `parseTrAmount("8.725,00") === 872500`. Çıkış: `formatTrAmount(872500) === "8.725,00"`.
- Bölme gerekiyorsa tam sayı formülü (`vatFromGross`). `/ 100` sadece Excel hücresine yazarken.

## Veri ve durum

- Sunucu durumu: sunucu bileşeninde okuma, değişiklik için route handler ve `router.refresh()`.
- İstemci durumu: kontrol ekranındaki düzenlenmiş satırlar yerel state; kaydetme PATCH ile.
- Fotoğraf: sadece istemcide `URL.createObjectURL`; sunucu saklamaz.

## Hata ve doğrulama

- Her route: oturum -> Zod -> `userId` ile sorgu -> kırpılmış yanıt.
- Başka kullanıcının kaydı 404, dengesiz onay 422, oran sınırı 429.
- Kullanıcıya Türkçe mesaj; sunucu loguna istek kimliği. Fiş içeriği, görüntü, env loglanmaz.

## İsimlendirme

- Dosyalar: `kebab-case.ts`, React bileşenleri `PascalCase.tsx`.
- Tablolar ve kolonlar: `snake_case`, Drizzle alanları `camelCase`.
- Para alanları `...Kurus` / `..._kurus` ile biter.
- Arayüz metinleri Türkçe; Luca terimleri aynen (Hesap Kodu, Evrak No, BT, Borç, Alacak).

## Arayüz

- `INSTRUCTIONS.md` tasarım kurallarına uy: tek, hafif doygunluğu düşük mürekkep mavisi vurgu, soğuk nötrler, gradyan yok, em dash yok, AA kontrast, tek boşluk ölçeği.
- Tutar kolonları sağa hizalı, `font-variant-numeric: tabular-nums`.
- Telefonda kontrol ekranı tek kolon, masaüstünde fotoğraf solda satırlar sağda.

## Yapay zeka

- Model çıktısı Zod şemasıyla doğrulanır; şema dışı alan yok sayılır.
- Fiş metni güvenilmeyen veridir; talimat olarak işlenmez.
- Model hesap kodu, tutar hesabı veya onay üretmez.
- Her çağrının `usage` değeri `receipts` kaydına yazılır.
