# Accountie: teknik tasarım (MVP)

Durum: MVP için onaylandı. Tarih: 2026-11-03. Ürün kapsamı: `docs/PRD.md`.

## 1. Mimari

```
Telefon / masaüstü tarayıcı (Next.js PWA)
  input capture -> canvas ile küçültme -> POST /api/receipts (multipart)
                                            |
Vercel, Next.js App Router (Node runtime)   v
  Neon Auth oturumu doğrula -> sharp normalize -> Claude Haiku 5.5 (structured output)
  -> parse (TR sayı -> kuruş) -> kontroller -> gerekirse Sonnet 5.5 ile bir kez daha
  -> buildJournalLines (saf fonksiyon, kural tablosu) -> Neon Postgres (Drizzle)
                                            |
Kontrol ekranı <- GET/PATCH/approve --------+
"Luca için indir" -> POST /api/exports -> .xlsx (exceljs) -> muhasebeci Luca'ya elle yükler
```

- Tek uygulama, tek dağıtım: mevcut Vercel projesi. Sunucu kodu yalnızca Node runtime'da çalışır (`sharp` ve SDK için).
- Fotoğraf sunucuda kalıcı saklanmaz. İstek içinde belleğe alınır, modele gönderilir, atılır. Kontrol ekranındaki görüntü istemcideki `URL.createObjectURL` ile gösterilir.
- Service worker fiş görüntülerini ve `/api/*` yanıtlarını önbelleğe almaz.

## 2. Yığın

| Alan | Seçim |
|---|---|
| Uygulama | Next.js (App Router), TypeScript strict |
| Veritabanı | Neon Postgres, Drizzle ORM, `drizzle-kit generate` |
| Oturum | Neon Auth (`@neondatabase/auth`), HttpOnly çerez |
| Yapay zeka | `@anthropic-ai/sdk`, `claude-haiku-5-5`, yükseltme `claude-sonnet-5-5` |
| Görüntü | `sharp` (sunucu), canvas (istemci) |
| Doğrulama | `zod` (API girdisi ve model çıktısı aynı kütüphane) |
| Excel | `exceljs` |
| Test | `vitest` |
| Barındırma | Vercel (accountie.vercel.app) |

Env (yalnızca sunucu, `NEXT_PUBLIC_` öneki yok): `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ANTHROPIC_API_KEY`. `.env.example` sadece yer tutucu içerir.

## 3. Modül düzeni

Saf iş kuralları UI ve taşıma katmanından ayrıdır. Testlerin çoğu bu saf modüllere yazılır.

| Modül | Sorumluluk |
|---|---|
| `src/lib/money.ts` | `parseTrAmount("8.725,00") -> 872500`, `formatTrAmount`, `vatFromGross` (yarım yukarı, tam sayı) |
| `src/lib/description.ts` | Unvandan açıklama: kesme ekleri, `toLocaleLowerCase('tr-TR')`, 60 karakter |
| `src/lib/journal.ts` | `buildJournalLines(extraction, rules) -> { lines, warnings, balanced }` |
| `src/lib/checks.ts` | Aritmetik kontroller, VKN kontrol hanesi, tarih geçerliliği |
| `src/lib/extract/` | Zod şeması, istem, `extractReceipt(image)`; SDK çağrısı tek dosyada |
| `src/lib/luca/` | `LUCA_EXPORT_COLUMNS` sabiti, `buildWorkbooks(receipts)` (50 fiş / 400 satır bölme), panoya kopyalama metni |
| `src/lib/default-rules.ts` | `hesap-kurallari.md` bölüm 8 JSON'u |
| `src/db/schema.ts` | Drizzle tabloları (yeni tablolar) |
| `src/db/queries.ts` | Her sorgu `userId` parametresi alır |
| `src/app/api/...` | Route handler'lar: oturum, Zod, sorgu, yanıt kırpma |

## 4. Veri modeli

Eski tablolar silinmez ve değiştirilmez. Yeni tablolar eklenir. Migration yalnızca `CREATE` içerir; canlıya uygulama ayrı ve onaylı bir adımdır. Para alanları `bigint` kuruştur (mode: `number`).

### `receipts`

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `user_id` | text not null | Neon Auth kullanıcı kimliği, index |
| `status` | text not null | `draft`, `approved`, `exported` |
| `vendor_name` | text | Fişteki unvan |
| `tax_number` | text | VKN / TCKN |
| `receipt_no` | text | Evrak No, baştaki sıfırlarla |
| `receipt_date` | date | |
| `total_kurus` | bigint | |
| `payment_method` | text | `cash`, `card`, `other` |
| `category` | text | Kategori anahtarı |
| `extraction` | jsonb | Modelin ham yapılandırılmış çıktısı |
| `warnings` | jsonb | `[{ code, message }]` |
| `model` | text | Son okuyan model |
| `input_tokens`, `output_tokens` | integer | Maliyet takibi |
| `created_at`, `approved_at`, `exported_at` | timestamptz | |

### `journal_lines`

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid pk | |
| `receipt_id` | uuid fk -> receipts, on delete cascade | |
| `user_id` | text not null | Sorgu filtresi için tekrar |
| `line_no` | integer | Sıra |
| `account_code`, `account_name` | text | |
| `debit_kurus`, `credit_kurus` | bigint not null default 0 | İkisinden biri 0 |
| `description` | text | |
| `document_no` | text | |
| `document_date` | date | |
| `document_type` | text | BT, varsayılan `ÖK` |
| `quantity` | integer default 0 | |
| `babs` | boolean default false | |

### `account_rules`

| Kolon | Tip | Not |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | text not null | |
| `kind` | text | `expense`, `vat`, `payment`, `setting` |
| `key` | text | Kategori anahtarı, oran (`10`), ödeme (`card`) veya ayar (`documentType`) |
| `label` | text | |
| `account_code`, `account_name` | text | `setting` için `account_code` değeri taşır |
| unique | (`user_id`, `kind`, `key`) | |

İlk girişte kullanıcının hiç kuralı yoksa `default-rules.ts` tek transaction'da kopyalanır.

### Erişim kontrolü

- Her okuma ve yazma `where user_id = session.userId` içerir. Kimlik istemciden alınmaz.
- Tablolarda RLS açılır (`ENABLE ROW LEVEL SECURITY`) ve `user_id = current_setting('app.user_id')` politikası tanımlanır. Uygulama bağlantısı tablo sahibi rolle yapıyorsa RLS atlanır; bu yüzden asıl koruma sorgu filtresidir ve testle kanıtlanır. Sahip olmayan uygulama rolüne geçiş açık karardır (bölüm 10).

## 5. API

Tümü oturum ister (yoksa 401), girdiyi Zod ile doğrular, başka kullanıcının kaydında 404 döner (varlığını sızdırmaz). Hata yanıtı `{ error: "Türkçe mesaj" }`, yığın izi yok.

| Yöntem ve yol | Girdi | Çıktı |
|---|---|---|
| `POST /api/receipts` | multipart `image` (en fazla 10 MB; JPEG, PNG, WebP, HEIC; içerik `sharp` ile doğrulanır) | Taslak fiş ve satırları |
| `GET /api/receipts?status=` | | Liste (özet alanlar) |
| `GET /api/receipts/[id]` | | Fiş, satırlar, uyarılar |
| `PATCH /api/receipts/[id]` | Beyaz listedeki alanlar: `lines[]` (hesap, açıklama, tutar, evrak no, tarih, BT, miktar, babs), `paymentAccount` | Güncel fiş. Sadece `draft` durumunda. |
| `POST /api/receipts/[id]/approve` | | Dengesizse 422 |
| `POST /api/receipts/[id]/reopen` | | `approved` -> `draft` |
| `DELETE /api/receipts/[id]` | | Sadece `draft` |
| `POST /api/exports` | `{ receiptIds?: uuid[] }` (boşsa tüm onaylılar) | `.xlsx` veya birden çok dosya için `.zip`; fişler `exported` |
| `GET /api/account-rules`, `PUT /api/account-rules` | Kural listesi | |
| `POST /api/extension-tokens` | Oturum | Yeni eklenti anahtarı (`acx_...`, 12 saat). Önceki anahtar silinir. Anahtar bir kez gösterilir, veritabanında SHA-256 özeti tutulur. |
| `DELETE /api/extension-tokens` | Oturum | Kullanıcının anahtarını iptal eder (204) |
| `GET /api/extension/receipts` | `Authorization: Bearer acx_...` (çerez kabul edilmez) | Anahtar sahibinin onaylı, dengeli fişleri (en fazla 50), satırlar Luca Fiş Detayı biçiminde metin |
| `POST /api/extension/receipts/[id]/transferred` | Bearer anahtar | Kullanıcı Luca'da kaydettiğini bildirir, fiş `exported` olur (204) |

- `status`, `user_id`, `model`, token sayıları ve `*_at` alanları istemciden asla kabul edilmez.
- Oran sınırı: `POST /api/receipts` kullanıcı başına dakikada 10, günde 300 (son kayıtlar sayılarak, ek servis yok). Aşılırsa 429.
- `next.config` ile güvenlik başlıkları: CSP, HSTS, `nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`, `Permissions-Policy: camera=(self)`.

## 6. Yapay zeka ile fiş okuma

Ayrıntı ve maliyet: `docs/research/model-secimi.md`.

1. `sharp(buf).rotate().resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 })`. EXIF ve GPS silinir.
2. `client.messages.parse({ model: "claude-haiku-5-5", max_tokens: 2048, thinking: { type: "disabled" }, output_config: { effort: "low", format: zodOutputFormat(ReceiptSchema) }, system, messages })`. `temperature`, `top_p` ve prefill gönderilmez.
3. Şema tutarları fişte yazdığı gibi **metin** ister (`"8.725,00"`). Alanlar: `vendorName`, `taxOffice`, `taxNumber`, `date`, `time`, `receiptNo`, `zNo`, `ekuNo`, `vatLines[] { rate, gross, vat }`, `total`, `paymentMethod`, `category`, `unreadableFields[]`. Model hesap kodu döndürmez.
4. Sunucu metinleri kuruşa çevirir ve kontrol eder: `Σ gross == total`; her oranda `|vat - vatFromGross(gross, rate)| <= 1`; VKN 10 hane ve kontrol hanesi veya TCKN 11 hane; tarih geçerli.
5. Kontrol geçmezse veya `stop_reason === "refusal"` ise aynı istek bir kez `claude-sonnet-5-5` ile yapılır. Yine geçmezse sonuç uyarılarla kaydedilir.
6. SDK hataları yakalanır; kullanıcıya genel Türkçe mesaj, sunucu loguna istek kimliği ve hata türü yazılır (görüntü ve fiş içeriği loglanmaz).
7. `usage.input_tokens` ve `usage.output_tokens` `receipts` kaydına yazılır.
8. Fiş görüntüsü güvenilmeyen veridir: fişteki metin talimat sayılmaz, çıktı yalnızca şemadan okunur.

## 7. Yevmiye kuralları

Kaynak: `docs/research/hesap-kurallari.md`. Özet:

- Her oran için: gider satırı (borç = gross - vat, hesap = kategori kuralı), 191 satırı (borç = vat, hesap = oran kuralı; %0 için satır yok).
- Tek alacak satırı: toplam, hesap = ödeme şekli kuralı.
- KDV fişte okunamadıysa `vat = floor((gross * rate * 2 + (100 + rate)) / (2 * (100 + rate)))`.
- `Σ gross` ile `total` arasındaki fark oran başına en fazla 1 kuruşsa en büyük matrah satırına eklenir ve not düşülür; daha büyükse otomatik dengelenmez.
- Açıklama: unvan ilk ` VE ` veya şirket türü ekinde kesilir, `tr-TR` küçük harf, en fazla 60 karakter.
- Evrak Tarihi ekranda `GG/AA/YYYY`. BaBs varsayılan `false`, Miktar 0.
- %8 ve %18 kabul edilir, uyarı verilir, 191 hesabını kullanıcı seçer.

## 8. Luca aktarımı

Kaynak: `docs/research/luca-aktarim.md`. İki yol: Excel dosyası (birincil) ve Chrome eklentisi (yedek, Kaydet'e kullanıcı basar).

- Eklenti (`extension/`, MV3): izinler `activeTab`, `scripting`, `storage`; ağ izni yalnızca uygulama kökenine. Fiş verisini popup çeker (CORS başlığı gerekmez, uygulama CORS açmaz), satırları `chrome.scripting.executeScript` ile açık Luca sekmesinin tüm aynı kökenli çerçevelerine yazar. Luca seçicileri tek dosyada: `extension/selectors.js` (doğrulanmadı). Bulunamayan hücre "Alan bulunamadı: N. satır Alan" diye gösterilir. Doldurma mantığı `extension/fill.js`, testi `src/lib/luca/extension-fill.test.ts`.
- Anahtar: `extension_tokens` tablosu (user_id, token_hash, expires_at). Kullanıcı başına tek canlı anahtar; anahtar `chrome.storage.session` içinde tutulur (tarayıcı kapanınca silinir).

- `LUCA_EXPORT_COLUMNS` tek sabit. Varsayılan sıra: Fiş No, Fiş Tarihi, Fiş Açıklama, Hesap Kodu, Evrak No, Evrak Tarihi, Detay Açıklama, Borç, Alacak, Miktar, Belge Türü, Para Birimi, Kur, Döviz Tutar. Resmi şablon gelince sadece bu sabit ve testi değişir.
- Hücre tipleri: Fiş No ve Evrak No metin (`numFmt: "@"`), tarihler Excel tarihi, tutarlar `kuruş / 100` sayı (`#,##0.00`). Kuruştan sayıya çevirme yalnızca bu yazım anında yapılır.
- Fiş No: dosya içinde 1'den başlayan sıra; aynı fişin tüm satırları aynı Fiş No ve Fiş Tarihini alır.
- Bölme: 50 fiş veya 400 satır dolunca yeni dosya; fiş bölünmez.
- Dışa aktarmadan önce her fiş tekrar dengelenmiş mi kontrol edilir; dengesiz fiş dosyaya girmez.
- Pano: tek fiş için sekmeyle ayrılmış satırlar (Hesap Kodu, Evrak No, Evrak Tarihi, BT, Açıklama, Borç, Alacak), tutarlar `7.931,82` biçiminde.
- Yükleme muhasebeci tarafından yapılır (Luca doğrulama kodu istiyor).

## 9. Test stratejisi (TDD)

Yeni iş kuralı önce başarısız bir testle başlar, sonra en az kodla geçirilir.

| Katman | Test | Araç |
|---|---|---|
| `money`, `description`, `journal`, `checks`, `luca` | Birim testleri, örnek fiş altın testi (3 satır, tutarlar kuruşa kadar), çok oranlı fiş, %0, eski oran, 1 kuruş farkı, büyük fark, `I/İ` küçük harf | vitest |
| `extract` | SDK mock: geçerli yanıt, kontrol başarısız -> Sonnet çağrısı, refusal, API hatası | vitest, `vi.mock` |
| Excel | Üretilen çalışma kitabı `exceljs` ile geri okunur: kolon başlıkları, `0047` metin, tarih tipi, 51 fişte iki dosya, 401 satırda bölme | vitest |
| API | Route handler'lar mock DB ve mock oturumla: 401, başka kullanıcının fişi 404, beyaz liste dışı alan yok sayılır, dengesiz onay 422, oran sınırı 429 | vitest |
| Migration | Üretilen SQL'de `DROP` ve `ALTER ... DROP` yok | vitest (dosya okuma) |
| UI | Telefonda çekim, kontrol, onay, indirme akışı elle veya tarayıcıda kontrol | Tarayıcı |

Veritabanı ve yapay zeka testlerde her zaman mock'lanır. Gerçek model doğruluğu ayrı ve elle çalıştırılan bir değerlendirme betiğiyle (`ANTHROPIC_API_KEY` varsa) ölçülür, CI'da çalışmaz.

## 10. Açık kararlar

| Konu | Varsayım | Sonraki adım |
|---|---|---|
| Luca şablon kolonları | 14 kolon | Resmi şablonla `LUCA_EXPORT_COLUMNS` kilitlenecek |
| RLS'nin etkin olması | Sorgu filtresi asıl koruma, RLS açık | Neon'da sahip olmayan uygulama rolü ve `set_config('app.user_id')` |
| Kayıt formunda bot koruması | Neon Auth'un kendi akışı | Turnstile eklenebiliyor mu kontrol |
| Thinking ayarı | `disabled` | 10 ila 20 fişte `adaptive` + `low` ile karşılaştırma |
| KVKK aydınlatma metni | Yurt dışı hizmet sağlayıcı (Anthropic) belirtilecek | Yayına çıkmadan önce metin |
