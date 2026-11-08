# Accountie: gece çalışması raporu

Tarih: 2026-11-03. Dal: `main`, GitHub'a gönderildi (04:20). Vercel yeni sürümü otomatik yayınlar; migration'lar ve `ANTHROPIC_API_KEY` eklenene kadar canlı site hata verir.

## Kısa özet

Telefonla çekilen yazar kasa fişinden Luca için yevmiye kaydı hazırlayan uygulama çalışır durumda. Kod, test, tip kontrolü, lint ve production build temiz. Canlıya almak için sabah sizin yapmanız gereken birkaç adım var (aşağıda). Gerçek yapay zeka anahtarıyla ve gerçek Luca ekranıyla hiçbir deneme yapılamadı; bu ikisi ilk elle denemede doğrulanmalı.

**Web mi, uygulama mı?** Web (PWA). Telefonda ana ekrana eklenen bir Next.js uygulaması; mağaza uygulaması yok. Gerekçe: Luca'ya aktarma zaten masaüstü tarayıcıda yapılıyor, mevcut Vercel + Neon altyapısı olduğu gibi kullanılıyor, mağaza ücreti ve inceleme süresi yok, kamera için telefonun kendi kamera uygulaması açılıyor. Ayrıntı: `docs/research/platform-karari.md`.

## Ne yapıldı

- **Fiş çekme ve okuma.** Telefonda fotoğraf çekilir, tarayıcıda küçültülür, sunucuya gönderilir. Sunucu görüntüyü normalize eder (EXIF/GPS silinir), yapay zeka modeline gönderir, fotoğrafı saklamaz.
- **Yevmiye kaydı.** Gider satırı (fiş türüne göre, örn. yemek 770.08), KDV oranına göre 191 satırı, ödeme şekline göre alacak satırı. Tüm hesaplar kuruş (tam sayı) ile; borç toplamı alacak toplamına eşit değilse onay verilmez. Örnek fiş birebir test edildi: 770.08 borç 7.931,82, 191.03.10 borç 793,18, 331.01 alacak 8.725,00.
- **Kontrol ekranı.** Tek ekranda fiş bilgileri, satırlar, uyarılar (emin olunmayan alanlar, mükerrer fiş, makul olmayan tarih, dengesizlik), satır ekleme/silme, hesap değiştirme, onay.
- **Hesap kuralları ekranı (`/kurallar`).** Fiş türü -> gider hesabı, KDV oranı -> 191 hesabı, ödeme şekli -> alacak hesabı. Kullanıcı düzenleyebilir; fiş bazında da değiştirilebilir.
- **Luca aktarımı.** Excel (.xlsx) üretimi (birincil), satırları panoya kopyalama, Chrome eklentisi ile Fiş Detayı ekranını doldurma (deneysel). Fişin "Aktarıldı" durumu takip edilir, aynı fiş iki kez dosyaya girmez.
- **Güvenlik.** Neon Auth oturumu, her sorguda kullanıcı filtresi, RLS açık, dosya imzası kontrolü, giriş ve fiş okuma için oran sınırları (kullanıcı, ağ, genel tavan), isteğe bağlı Cloudflare Turnstile, eklenti için 12 saatlik iptal edilebilir anahtar, yapay zeka anahtarı yalnızca sunucuda.
- **Veritabanı.** Yeni tablolar: `receipts`, `journal_lines`, `account_rules`, `extension_tokens`, `rate_limit_hits`. Eski tablolara dokunulmadı. Migration dosyaları yalnızca `CREATE` içerir (testle kontrol ediliyor); canlı veritabanına uygulanmadı.
- **Dokümanlar.** `docs/PRD.md`, `docs/TECH_DESIGN.md`, `docs/research/` altında platform, model, hesap kuralları ve Luca aktarım araştırmaları, `README.md` içinde canlıya alma adımları.

## Mimari özeti

```
Telefon / masaüstü tarayıcı (Next.js PWA)
  fotoğraf -> tarayıcıda küçültme -> POST /api/receipts
Vercel (Next.js, Node runtime)
  oturum kontrolü -> oran sınırı -> sharp -> Claude Haiku 5.5 (şemalı çıktı)
  -> metin tutar -> kuruş -> aritmetik kontroller -> gerekirse Sonnet 5.5 ile bir kez daha
  -> kural tablosuyla yevmiye satırları -> Neon Postgres (Drizzle)
Kontrol ekranı -> onay -> Excel / pano / Chrome eklentisi -> Luca
```

Yığın: Next.js 16, React 19, TypeScript, Drizzle ORM, Neon Postgres, Neon Auth, `@anthropic-ai/sdk`, `exceljs`, `sharp`, `zod`, `vitest`.

## Yapay zeka modeli ve maliyet

- **Ana model:** Claude Haiku 5.5 (`claude-haiku-5-5`), şemaya kısıtlı çıktı (structured outputs).
- **Yedek:** Claude Sonnet 5.5 (`claude-sonnet-5-5`), yalnızca Haiku'nun sonucu aritmetik kontrolden geçmezse o fiş için bir kez.
- **Fiş başı maliyet:** yaklaşık **0,0005 USD** (1000 fiş yaklaşık 0,50 USD). Sonnet'e düşen fişte yaklaşık 0,01 USD.
- Model yalnızca fişte yazanı metin olarak çıkarır; matrah, KDV ve borç/alacak hesabını sunucu kodu yapar. Tutarlılık buradan gelir.
- Gerçek anahtarla deneme yapılmadı (`.env.local` yok). Model adı ve parametreler API tarafından ilk kullanımda doğrulanmalı. Karşılaştırma tablosu: `docs/research/model-secimi.md`.

## Luca aktarımı: durum

| Yol | Durum | Doğrulanamayan |
|---|---|---|
| Resmi API | Herkese açık doküman bulunamadı | Luca'ya yazılı sorulmalı (uyelik@luca.com.tr) |
| Excel veri aktarımı (Muhasebe > Fiş İşlemleri) | Uygulandı, birincil yol. 50 fiş / 400 satırda dosya bölünür | Kolon adları ve sırası Luca'nın resmi şablonuyla karşılaştırılmadı (üçüncü taraf kaynaktaki 14 kolonlu düzen kullanıldı); tutar ve tarih hücre tipi |
| Satırları kopyala (pano) | Uygulandı | Luca grid'inin çok satırlı yapıştırmayı kabul edip etmediği |
| Chrome eklentisi (`extension/`) | Uygulandı, deneysel. Kaydet'e kullanıcı basar | Luca sayfa seçicileri tahmin; ilk denemede büyük olasılıkla "tablo bulunamadı" çıkar. Kullanım şartlarında otomasyon hükmü |

Luca yüklemede doğrulama kodu istediği için Excel yüklemesini muhasebeci elle yapar. Doğrudan (insansız) aktarım bugün mümkün değil.

## Jüri tur puanları

| Tur | Arayüz | Güvenlik | Muhasebe | Ürün |
|---|---|---|---|---|
| 1 | 6,5 | 7,5 | 8,5 | 7 |
| 2 | 8 | 7,5 | 8,5 | 8 |
| 3 | 8,5 | 9 | 9 | 8,5 |
| 4 | 8,5 | 8,5 | 9 | 9 |
| 5 | 8,8 | 8,5 | 9 | 9 |
| 6 | 9 | 8,5 | 9 | 8,5 |
| 7 | 8,9 | 9 | 9 | 9 |
| 8 | 9 | 9 | 9 | 9 |

## Son kontrol sonuçları

| Komut | Sonuç |
|---|---|
| `npm ci` | Açık kalan geliştirme sunucuları kapatıldıktan sonra temiz kurulum başarılı |
| `npm test` | 13 dosya, 159 test geçti, 1 atlandı (gerçek anahtarla elle çalıştırılan smoke testi) |
| `npm run typecheck` | Hata yok |
| `npm run lint` | Hata yok |
| `npm run build` | Başarılı |
| `npm audit` | 35 bulgu (7 düşük, 28 orta), yüksek veya kritik yok. Production bağımlılıklarında 20 (7 düşük, 13 orta) |
| Sır taraması | Repoda yalnızca `.env.example` var, yer tutucu değerler. `.env.local` yok, commit edilmiş gerçek anahtar yok |

## Kalan bilinen sorunlar

1. **Excel kolon düzeni doğrulanmadı.** İlk yüklemede Luca reddedebilir. Düzeltme yalnızca `src/lib/luca/export.ts` içindeki `LUCA_EXPORT_COLUMNS` ve testinde.
2. **Chrome eklentisi seçicileri tahmin.** Gerçek Fiş Detayı ekranında `extension/selectors.js` güncellenmeden çalışması beklenmemeli.
3. **Gerçek yapay zeka çağrısı hiç yapılmadı.** Doğruluk ve gerçek maliyet ilk fişlerde ölçülmeli.
4. **npm audit orta bulgular.** `exceljs` altındaki `uuid`, `archiver`, `minimatch`; `drizzle-kit` altındaki `esbuild` (yalnızca geliştirme aracı); `@neondatabase/auth` altındaki düşük bulgular. Önerilen düzeltmeler eski ana sürüme indirme (ör. exceljs 3.4.0) olduğu için uygulanmadı. Sunucuda kullanıcı girdisiyle tetiklenen bir yol görülmedi.
5. **RLS asıl koruma değil.** Kullanıcı ayrımı koddaki `user_id` filtreleriyle yapılıyor; veritabanına tablo sahibi rolle bağlanılmalı.
6. **Fiş fotoğrafı yalnızca çekildiği cihazda görünür.** Bilgisayarda kontrol ederken kağıt fişle karşılaştırın.
7. **KVKK aydınlatma metni yok.** Fiş görüntüsü yurt dışındaki bir hizmet sağlayıcıya (Anthropic) gidiyor; yayından önce metin eklenmeli.
8. **Turnstile ve e-posta doğrulaması** canlıda henüz açık değil (anahtar ve Neon paneli ayarı gerekiyor).

## Sabah yapılacaklar

Sırayla yapın; ayrıntılı hali `README.md` içinde "Canlıya alma" bölümünde.

1. **Vercel ortam değişkenleri.** Vercel > proje > Settings > Environment Variables. `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` var mı kontrol edin. `ANTHROPIC_API_KEY` ekleyin (console.anthropic.com > API Keys) ve aynı konsolda aylık harcama limiti koyun. İsterseniz `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` ekleyin. Hiçbirine `NEXT_PUBLIC_` öneki vermeyin.
2. **Migration'ları uygulayın.** Neon panelinde SQL Editor'de `drizzle/` klasöründeki dosyaları bu sırayla çalıştırın: `20261102225754_receipts.sql`, `20261102230939_extension_tokens.sql`, `20261102232316_rate_limit_hits.sql`. Yalnızca yeni tablo eklerler. `npx drizzle-kit migrate` kullanmayın. `DATABASE_URL` tablo sahibi rolle (varsayılan `neondb_owner`) bağlanmalı.
3. **Neon Auth ayarı.** Neon panelinde Auth > izinli alan adlarında `https://accountie.vercel.app` olsun. E-posta doğrulamasını açın.
4. **Yayın.** Kod GitHub'a gönderildi, Vercel otomatik yayınladı. 1-3. adımlardan sonra Vercel > Deployments > son yayın > Redeploy yapın ki yeni env değişkenleri devreye girsin.
5. **Tek fiş okuma denemesi (bilgisayarda).** Repo klasöründe `npm install`, sonra PowerShell'de:
   `$env:SMOKE_RECEIPT="C:/yol/fis.jpg"; $env:ANTHROPIC_API_KEY="sk-ant-..."; npx vitest run src/lib/extract/smoke.test.ts`
   Çıktıda `"ok": true` ve fişteki tutarlar görünmeli.
6. **Uçtan uca deneme (telefonda).** accountie.vercel.app'e girin, bir fiş çekin, kontrol ekranında satırları kağıt fişle karşılaştırıp onaylayın.
7. **İlk gerçek Luca denemesi (tek fiş, Excel).** Fiş sayfasında "Luca için Excel indir". Luca'da Muhasebe > Fiş İşlemleri > Excel veri aktarımı ekranından yükleyin, önizlemeyi kağıt fişle karşılaştırın. Reddederse hata mesajını ve aynı ekrandaki "Şablon indir" dosyasını saklayın, bana iletin; kolonlar buna göre kilitlenir. Kabul ederse Fiş Kes ile fişi kesin.
8. **Eklenti denemesi (isteğe bağlı).** `chrome://extensions` > Geliştirici modu > Paketlenmemiş öğe yükle > `extension/` klasörü. Accountie Fişler sayfasında eklenti anahtarı oluşturun, Luca'da Fiş Detayı ekranını açıp eklentiden fişi yazdırın. "Alan bulunamadı" çıkarsa Luca hücresinde sağ tık > İncele ile seçiciyi alıp iletin; Kaydet'e her zaman siz basın.

## Arayüz yenilemesi (2026-11-03/04 gecesi)

8 jüri (sanat, açık tema, koyu tema, mobil, erişilebilirlik, hareket-görsel, ürün-metin, işlev-güvenlik) her turda 0-10 puan verdi. Her turdan sonra bir sonraki turun düzeltme planı yazıldı.

| Jüri | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| sanat | 6.7 | 7 | 7 | 7 | 7.4 | 7.5 | 7.8 | 8 |
| açık tema | 6.4 | 7.1 | 6.5 | 7.2 | 7 | 8.5 | 9 | 8.5 |
| koyu tema | 6 | 6.5 | 6.5 | 7 | 7.5 | 7.8 | 8 | 8.8 |
| mobil | 6 | 7 | 7 | 7.5 | 8 | 8.5 | 8.5 | 9 |
| erişilebilirlik | 7 | 6.5 | 7.3 | 8 | 7.5 | 8.5 | 9 | 7.5 |
| hareket-görsel | 5.5 | 6.5 | 6.8 | 7 | 7.5 | 7.6 | 8.5 | 8 |
| ürün-metin | 6 | 7 | 7 | 7.5 | 7.5 | 9 | 8.5 | 8 |
| işlev-güvenlik | 8 | 7 | 8 | 8 | 8 | 8.5 | 9 | 9 |
| **ortalama** | 6.45 | 6.83 | 7.01 | 7.40 | 7.55 | 8.36 | 8.54 | 8.35 |

**Neden durdu:**
- Puanlar 7. turdan sonra yükselmedi (8.54'ten 8.35'e indi). Bulgular kapanmıyor, yer değiştiriyor: bir jürinin kapattığı sorunu başka bir jüri yeni bir ayrıntıyla açıyor.
- Saat 04:20'de oturum kullanım limiti doldu. 8. turun sonunda ana sayfa ve panel düzelticileri yarıda kaldı. Sistem düzelticisinin değişikliği (d9bd6fd) ve giriş formu düzeltmesi (yarım kalan iş; tamamlanıp test edildi, commit'lendi) duruyor.

**Son kontrol (04:23):**
- `npm test`: 206 geçti, 1 atlandı.
- `npm run typecheck`, `npm run lint`, `npm run build`: hatasız.
- Hiçbir şey push edilmedi. origin/main'in önünde 38 commit var.

**8. turdan açık kalanlar (yüksek ve orta):**
- Ürün metninde Excel ve pano yolu Luca'da doğrulanmış gibi anlatılıyor. Gerçek Luca'da denenmeden "çalışır" dili kullanılmamalı (yüksek, dürüstlük).
- Açık temada CTA bandında odak halkası görünmüyordu (yüksek). d9bd6fd mavi alanlarda halkayı alanın yazı rengine çekti, ama jüri bunu yeniden denetlemedi.
- Çerez şeridinin Tab sırası ve telefonda formu örtmesi. d9bd6fd şeridi DOM'da sona aldı, yeniden denetlenmedi.
- Hero'da seçim değişince sayfa bir an çapraz geçiyor. 8d1927e seçicileri geçişten çıkardı, ama başlık ve menü hâlâ bir an soluklaşıyor.
- Masaüstünde SSS ve Hesap planı bölümlerinde yarım ekran boşluk var.
- Aynı örnek fiş ve aynı üç Luca satırı sayfada 6-7 kez tekrar ediyor.
- Arşiv resmi şeridi ürünün iddiasına bağlanmıyor; yazar kasa resmi tekrar ediyor.
- Koyu temada en parlak kontrol birincil eylem değil; "Satırları kopyala" silik.
- Okuma kartında "Satırlar hazır" ile "Hâlâ okunuyor" aynı anda görünüyor.
- 768'de kontrol ekranında hesap adı alanı kesik. Açık temada engelli Onayla düğmesi tepside kayboluyor.
- Bölüm giriş animasyonları ekranın kenarında bitiyor.

## UI jüri döngüsü sonucu (2026-11-08)

Yedi açılı jüri (animasyon, renk, görsel, premium, mobil, erişilebilirlik/performans, işlev) tur 15'te hepsi 9 ve üstü verdi (işlev 9,2). Tur 1-12 çok katı ölçütle 6,3'ten 7,5'e çıktı; kullanıcının kararıyla tur 13'ten itibaren normal zorlukta puanlandı (13: 8,8-9; 14: 8,5-9; 15: hepsi 9+).

Son turlarda yapılanlar: gerçek fiş izleri örneklerden, dokümanlardan ve testlerden temizlendi (uydurma ÖRNEK BALIK LOKANTASI, 0412); koyu tema nötr ve katmanlı; hero telefon ve kart sırası yavaş ağda kaymıyor; odometre her karede tam rakam gösteriyor; JS kapalıyken ve ekran okuyucuda bütün bölümler görünür (Suspense ve content-visibility kaldırıldı); panel 320 px'te taşmıyor.

Bilinen düşük öncelikli konular: tema düğmesi INP (4x CPU'da yüksek), hesap/borç/alacak tablosu kalıbının tekrarı, telefonda hydration uzun görevi. Git geçmişinde gerçek fiş görselleri ve VKN duruyor (herkese açık depo); temizlemek için geçmiş yeniden yazılmalı (kullanıcı kararı).

Ekran görüntüleri: `.taste-skill/son/`.
