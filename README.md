# Accountie

Yazar kasa fişinin fotoğrafından Luca için yevmiye kaydı hazırlayan web uygulaması. Luca kullanan muhasebe büroları ve mali müşavirler için.

Canlı: [accountie.vercel.app](https://accountie.vercel.app)

## Ne yapar

- **Fiş çekme ve okuma.** Telefonda fişin fotoğrafı çekilir; satıcı, VKN, tarih, fiş no, oran bazında KDV, toplam ve ödeme şekli okunur. Okunamayan alan boş kalır ve işaretlenir, uydurma değer yazılmaz.
- **Yevmiye satırları.** Gider, KDV ve alacak satırları büronun kendi hesap kodlarıyla hazırlanır (gider kategoriden, KDV orandan, alacak ödeme şeklinden). Hesap kodunu model değil kural tablosu belirler; tutarlar tam sayı kuruşla hesaplanır.
- **Kontrol ve onay.** Fiş ve satırlar tek ekranda. Borç toplamı alacağa eşit olmadan onay açılmaz, fark gösterilir. Toplu onay da var.
- **Mükellefler.** Her firmanın fişleri ayrı; Firmalar ekranında arama (Ctrl/⌘+K) ve ay seçimi.
- **Öğrenen satıcı kuralı.** Bir satıcı için gider hesabı değiştirilip onaylanırsa aynı satıcının sonraki fişleri o hesapla gelir; Kurallar ekranından kaldırılabilir.
- **e-Fatura ve e-Arşiv.** Fatura dosyası (XML/ZIP) yüklenerek ya da firmanın GİB e-Arşiv girişiyle faturalar taslak fişe çevrilir. GİB girişi sunucuda şifreli saklanır.
- **Mutabakat.** Luca muavin Excel'i yüklenir, ayın onaylı fişleriyle karşılaştırılır.
- **Luca'ya aktarım.** Onaylı fişler tek Excel dosyasıyla (birincil) ya da Chrome eklentisiyle (yedek) Luca'ya gider.
- **PWA.** Telefonda ana ekrana eklenir; açık ve koyu tema.

## Luca'ya aktarım

1. **Excel dosyası (birincil).** Panelde "Luca için indir". Dosya Luca'da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranından yüklenir. Kolon düzeni Luca'nın resmi şablonuyla henüz doğrulanmadı; kolon adları yalnızca `src/lib/luca/export.ts` içindeki `LUCA_EXPORT_COLUMNS` sabitinde.
2. **Chrome eklentisi (yedek).** Onaylı fişin satırlarını Luca'da açık olan Fiş Detayı ekranına yazar ve ekrandaki satır sayısını, hesap kodlarını ve tutarları geri okuyup fişle karşılaştırır. "Hepsini sırayla kaydet" her fişi doldurur, karşılaştırır, aynıysa kaydeder ve yeni fiş açar; fark çıkarsa durur, son fişi siz kaydedersiniz. Bu düğme `extension/selectors.js` içindeki `save`, `saved` ve `newEntry` seçicileri Luca'nın gerçek ekranından yazılınca görünür; o zamana kadar eklenti yalnız doldurur, Kaydet'e siz basarsınız.

## Teknoloji

Next.js 16 (App Router), TypeScript, Drizzle ORM ve Supabase Postgres (Frankfurt), Supabase Auth, Anthropic Claude (fiş okuma), Cloudflare Turnstile, Vercel. Testler Vitest ile.

## Canlıya alma (accountie.vercel.app)

Sırayla yapın. Bir adım bitmeden sonrakine geçmeyin.

1. **Ortam değişkenleri.** Vercel'de projeyi açın, Settings, Environment Variables. Supabase'ten (proje eu-central-1, Frankfurt) şunları ekleyin: `DATABASE_URL` (Connect, Transaction pooler, port 6543; tırnaksız), `SUPABASE_URL` ve `SUPABASE_PUBLISHABLE_KEY` (Project Settings, API Keys). Hiçbirine `NEXT_PUBLIC_` öneki vermeyin; hepsi yalnız sunucuda okunur. Service role (secret) anahtarı gerekmez. `ANTHROPIC_API_KEY` ekleyin (console.anthropic.com, API Keys). Aynı konsolda Settings, Limits ekranından aylık harcama limiti koyun; uygulamadaki istek sınırı tek başına faturayı sınırlamaz. Vercel'de fonksiyon bölgesini Frankfurt (`fra1`) seçin; veritabanıyla aynı bölge.
   - *Turnstile (canlıda zorunlu):* `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` (dash.cloudflare.com, Turnstile). Canlıda bu anahtarlar yoksa giriş ve kayıt reddedilir ve Vercel loguna hata düşer; yerelde anahtarsız çalışır.
   - *İsteğe bağlı, GİB e-Arşiv:* `GIB_SECRET_KEY` (32 baytlık rastgele anahtar, base64), firmaların GİB girişini şifrelemek için. Yoksa GİB kartı görünmez, e-Fatura yalnız dosyayla yüklenir. `GIB_EARSIV_ORTAM=test` GİB'in test portalını kullanır.
   - *Bilgi, sınırlar:* Giriş IP başına (IPv6'da /64 ağı başına) ve e-posta başına (saatte 30 deneme) sınırlıdır. Fiş okuma kullanıcı başına (ilk 24 saatteki hesaplar için günde 20), ağ başına (günde 300) ve tüm uygulama için (günde 2000) sınırlıdır.
2. **Tablolar.** Supabase'e 2026-11-08'de uygulandı: `drizzle/` altındaki bütün dosyalar sırayla; RLS açık, Data API kapalı, `anon` ve `authenticated` izinleri geri alındı. Yeni bir göç gelince Supabase SQL Editor'de yalnız yeni dosyanın içeriğini çalıştırın. Dosyalar yalnız ekler, hiçbir şey silmez.
3. **Veritabanı rolü.** `DATABASE_URL` tabloların sahibi `postgres` rolüyle bağlanır. Kullanıcı ayrımı uygulama kodundaki `user_id` filtreleriyle yapılır; RLS ve geri alınan izinler ikinci güvencedir.
4. **Supabase Auth.** Authentication, URL Configuration: Site URL `https://accountie.vercel.app`; Redirect URLs listesine `https://accountie.vercel.app/auth/callback` ve yerel deneme için `http://localhost:3000/auth/callback`. Kayıt doğrulama ve şifre yenileme e-postaları bu adrese döner. Email sağlayıcısında "Confirm email" açık kalsın. Canlıda kendi SMTP'nizi bağlayın (Authentication, Emails, SMTP Settings); Supabase'in yerleşik e-postası saatte birkaç iletiyle sınırlıdır.
5. **Yayın.** `git push` ile main dalını gönderin; Vercel otomatik yayınlar. Ortam değişkeni sonradan eklendiyse Vercel'de Deployments, son yayın, Redeploy.
6. **Fiş okuma denemesi.** Bilgisayarda, repo klasöründe bir kez `npm install` çalıştırın, sonra gerçek anahtarla tek fiş okuyun (PowerShell):

   ```powershell
   $env:SMOKE_RECEIPT="C:/yol/fis.jpg"; $env:ANTHROPIC_API_KEY="sk-ant-..."; npx vitest run src/lib/extract/smoke.test.ts
   ```

   Git Bash'te: `SMOKE_RECEIPT=C:/yol/fis.jpg ANTHROPIC_API_KEY=sk-ant-... npx vitest run src/lib/extract/smoke.test.ts`

   `"ok": true` ve fişteki tutarlar görünmeli. Hata alırsanız model adı veya parametre API tarafından reddedilmiştir; ayrıntı Vercel'de Logs ekranında `receipt extraction failed` satırındadır.
7. **Uçtan uca deneme.** Telefondan giriş yapıp bir fiş çekin. Fiş sayfası (`/panel/fis/...`) açılmalı ve satırlar dolmalı. Onaylayın.
8. **İlk Luca yüklemesi (tek fiş).** Excel dosyasının kolon düzeni Luca'nın resmi şablonuyla doğrulanmadı. İlk seferde tek fişlik dosya indirip Luca'da Excel veri aktarımı ekranından yükleyin, önizlemeyi kağıt fişle karşılaştırın. Kayıttan sonra Luca'nın verdiği fiş numarasına da bakın: dosyadaki Fiş No her dosyada 1'den başlar; mevcut bir mahsup numarasıyla çakışıyor mu, yeniden mi numaralanıyor, not edin. Luca reddederse hata mesajını ve Luca'nın "Şablon indir" dosyasını saklayın; kolonlar `src/lib/luca/export.ts` içindeki `LUCA_EXPORT_COLUMNS` ile düzeltilir. Değişen yalnızca `LUCA_EXPORT_COLUMNS` ve `src/lib/luca/export.test.ts` içindeki beklentidir.

Bilinen sınırlar:

- Luca'ya birincil yol Excel'dir. Chrome eklentisinin seçicileri gerçek Fiş Detayı ekranından okundu ama Luca'da henüz bir fişle denenmedi; ilk kullanımda satırları Kaydet'ten önce kontrol edin.
- Fiş fotoğrafı yalnızca çekildiği cihazın tarayıcı sekmesinde durur, sunucuya kaydedilmez. Bilgisayarda kontrol ederken fotoğraf görünmez; tutarları kağıt fişle karşılaştırın.
- Excel indirilen fiş "Aktarıldı" olur. Luca yüklemeyi reddederse Aktarıldı sekmesindeki "Bu listeyi tekrar indir" (son 50 fiş) ya da fiş sayfasındaki "Luca için Excel indir" ile tekrar indirin.
- Luca'ya "Satırları kopyala" ile veya elle girilen onaylı fiş için fiş sayfasında "Luca'ya elle girdim"e basın; basılmazsa fiş sonraki Excel dosyasına tekrar girer ve Luca'da mükerrer kayıt oluşur.

## Geliştirme

```bash
npm install
npm test          # vitest; veritabanı, oturum ve yapay zeka mock
npm run typecheck
npm run lint
npm run build
```

Yerelde ortam değişkenleri `.env.local` dosyasına yazılır (yalnız sunucuda okunur): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GIB_SECRET_KEY`, `GIB_EARSIV_ORTAM`. `.env*` dosyaları commit edilmez.

## Chrome eklentisi kurulumu

Eklenti Chrome Web Store'da değil, klasörden yüklenir.

1. Chrome'da `chrome://extensions` adresini açın, sağ üstten **Geliştirici modu**nu açın.
2. **Paketlenmemiş öğe yükle** ile bu repodaki `extension/` klasörünü seçin.
3. Accountie'de bilgisayardan **Kurallar** ekranını açın; **Chrome eklentisi (deneysel)** bölümünde **Eklenti anahtarı oluştur**'a basın, anahtarı kopyalayın.
4. Luca'da (auygs.luca.com.tr) Fiş Detayı ekranını açın. Aynı sekmede eklenti simgesine tıklayın, anahtarı yapıştırıp **Fişleri getir**'e basın.
5. Fişi seçin, önizlemeyi kontrol edin, **Fiş Detayına yaz**'a basın.
6. Luca'da satırları kontrol edip **Kaydet**'e kendiniz basın. Ardından eklenti simgesine tekrar tıklayın (Kaydet'e basınca eklenti penceresi kapanır, yeniden açıldığında doldurduğunuz fiş seçili ve düğme görünür olur) ve **Luca'da kaydettim**'e basın; fiş Accountie'de "Aktarıldı" olur ve tekrar listelenmez. Bazı alanlar bulunamayıp elle tamamlandıysa da bu düğme görünür; Kaydet'ten sonra mutlaka basın, yoksa fiş sonraki Excel dosyasına tekrar girer.

Güvenlik:

- Anahtar 12 saat geçerlidir, yalnızca sizin onaylı fişlerinizi okur ve bir fişi "aktarıldı" yapabilir. Yeni anahtar oluşturmak eskisini geçersiz kılar; **Anahtarı iptal et** hemen kapatır.
- Eklenti anahtarı tarayıcı oturumu boyunca tutar (`chrome.storage.session`), tarayıcı kapanınca silinir.
- İzinler: `activeTab` (yalnızca simgesine tıkladığınız sekme), `scripting`, `storage` ve uygulama adresine erişim. Luca şifrenize veya çerezlerinize dokunmaz.

### Luca seçicileri

Eklentinin Luca'da aradığı tablo ve hücreler yalnızca `extension/selectors.js` dosyasında tanımlı. Satır ve hücre seçicileri 2026-11-10'da gerçek Fiş Detayı ekranından okundu; "+" ile satır ekleme ve kayıttan sonraki işaret henüz denenmedi, bu yüzden otomatik kayıt kapalı. Bir öğe bulunamazsa eklenti "Fiş Detayı tablosu bulunamadı" veya "Alan bulunamadı: 2. satır BT" der ve o alanı boş bırakır.

Güncellemek için: Luca Fiş Detayı ekranında hücreye sağ tıklayıp **İncele** deyin, satırı ve her hücre girişini seçen CSS seçicisini `selectors.js` içine yazın, `chrome://extensions` sayfasında eklentiyi yenileyin. Luca farklı bir alan adındaki iframe kullanıyorsa `activeTab` yetmez; `manifest.json` içine o adres için `host_permissions` eklenmelidir.

Yerel geliştirmede uygulama adresi için `extension/popup.js` içindeki `APP_ORIGIN` ve `manifest.json` içindeki `host_permissions` birlikte değiştirilir (ör. `http://localhost:3000`).
