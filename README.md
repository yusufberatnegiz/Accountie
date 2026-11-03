# Accountie

Yazar kasa fişinin fotoğrafından Luca için yevmiye kaydı hazırlar. Muhasebeci satırları kontrol edip onaylar, onaylı kayıt Luca'ya iki yoldan biriyle aktarılır:

1. **Excel dosyası (birincil).** Fişler sayfasında "Luca için indir". Dosya Luca'da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranından yüklenir. Kolon düzeni Luca'nın resmi şablonuyla henüz doğrulanmadı; kolon adları yalnızca `src/lib/luca/export.ts` içindeki `LUCA_EXPORT_COLUMNS` sabitinde.
2. **Chrome eklentisi (yedek).** Onaylı fişin satırlarını Luca'da açık olan Fiş Detayı ekranına yazar. Kaydet'e eklenti basmaz, siz basarsınız.

Ayrıntılar: `docs/PRD.md`, `docs/TECH_DESIGN.md`, `docs/research/luca-aktarim.md`.

## Canlıya alma (accountie.vercel.app)

Sırayla yapın. Bir adım bitmeden sonrakine geçmeyin.

1. **Ortam değişkenleri.** Vercel'de projeyi açın, Settings, Environment Variables. `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` zaten olmalı; yoksa Neon panelinden kopyalayın. `ANTHROPIC_API_KEY` ekleyin (console.anthropic.com, API Keys). Aynı konsolda Settings, Limits ekranından aylık harcama limiti koyun; uygulamadaki istek sınırı tek başına faturayı sınırlamaz. Cloudflare Turnstile anahtarları (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`; dash.cloudflare.com, Turnstile) önerilir ama zorunlu değildir: yoksa giriş ve kayıt çalışır, bot doğrulaması atlanır, Vercel loguna uyarı düşer ve hesap kilitlemeyi önlemek için e-posta başına giriş sınırı kapanır (yalnızca IP başına sınır kalır). Kayıt formunda bot koruması olmaz; canlıya almadan önce eklemeniz önerilir. İlk kurulumdan sonra da ekleyebilirsiniz. Hiçbirine `NEXT_PUBLIC_` öneki vermeyin.
2. **Tablolar.** Neon panelinde SQL Editor'ü açın, `drizzle/` klasöründeki dosyaların içeriğini **bu sırayla** yapıştırıp çalıştırın:
   1. `20261102225754_receipts.sql`
   2. `20261102230939_extension_tokens.sql`
   3. `20261102232316_rate_limit_hits.sql`

   Dosyalar yalnızca yeni tablo ekler, eski tablolara dokunmaz. Bu adım atlanırsa uygulamanın her ekranı hata (500) verir. `npx drizzle-kit migrate` kullanmayın: yapılandırmada veritabanı adresi yok ve eski uygulamanın migration kayıtlarıyla karışabilir.
3. **Veritabanı rolü.** `DATABASE_URL` tabloları oluşturan rolle (Neon'da varsayılan `neondb_owner`) bağlanmalı. Tablolarda RLS açık; sahip olmayan bir rol tüm sorgularda boş sonuç alır. Kullanıcı ayrımı uygulama kodundaki `user_id` filtreleriyle yapılır.
4. **Yayın.** `git push` ile main dalını gönderin; Vercel otomatik yayınlar. Ortam değişkeni sonradan eklendiyse Vercel'de Deployments, son yayın, Redeploy.
5. **Neon Auth.** Neon panelinde Auth ayarlarında `https://accountie.vercel.app` alan adının izinli (trusted) listede olduğunu kontrol edin. Değilse giriş sonrası geri dönüş başarısız olur.
6. **Fiş okuma denemesi.** Bilgisayarda, repo klasöründe bir kez `npm install` çalıştırın, sonra gerçek anahtarla tek fiş okuyun (PowerShell):

   ```powershell
   $env:SMOKE_RECEIPT="C:/yol/fis.jpg"; $env:ANTHROPIC_API_KEY="sk-ant-..."; npx vitest run src/lib/extract/smoke.test.ts
   ```

   Git Bash'te: `SMOKE_RECEIPT=C:/yol/fis.jpg ANTHROPIC_API_KEY=sk-ant-... npx vitest run src/lib/extract/smoke.test.ts`

   `"ok": true` ve fişteki tutarlar görünmeli. Hata alırsanız model adı veya parametre API tarafından reddedilmiştir; ayrıntı Vercel'de Logs ekranında `receipt extraction failed` satırındadır.
7. **Uçtan uca deneme.** Telefondan giriş yapıp bir fiş çekin. Fiş sayfası (`/fis/...`) açılmalı ve satırlar dolmalı. Onaylayın.
8. **İlk Luca yüklemesi (tek fiş).** Excel dosyasının kolon düzeni Luca'nın resmi şablonuyla doğrulanmadı. İlk seferde tek fişlik dosya indirip Luca'da Excel veri aktarımı ekranından yükleyin, önizlemeyi kağıt fişle karşılaştırın. Luca reddederse hata mesajını ve Luca'nın "Şablon indir" dosyasını saklayın; kolonlar `src/lib/luca/export.ts` içindeki `LUCA_EXPORT_COLUMNS` ile düzeltilir. Şablon dosyası `docs/research/` altına konur; değişen yalnızca `LUCA_EXPORT_COLUMNS` ve `src/lib/luca/export.test.ts` içindeki beklentidir. Sonucu `docs/research/luca-aktarim.md` dosyasına yazın.

Bilinen sınırlar:

- Luca'ya birincil yol Excel'dir. Chrome eklentisinin Luca seçicileri tahmindir; gerçek Fiş Detayı ekranında denenip `extension/selectors.js` güncellenmeden çalışması beklenmemeli.
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

Ortam değişkenleri `.env.example` içinde. `.env*` dosyaları commit edilmez.

## Chrome eklentisi kurulumu

Eklenti Chrome Web Store'da değil, klasörden yüklenir.

1. Chrome'da `chrome://extensions` adresini açın, sağ üstten **Geliştirici modu**nu açın.
2. **Paketlenmemiş öğe yükle** ile bu repodaki `extension/` klasörünü seçin.
3. Accountie'de Fişler sayfasındaki **Chrome eklentisi ile doldurma** bölümünden **Eklenti anahtarı oluştur**'a basın, anahtarı kopyalayın.
4. Luca'da (auygs.luca.com.tr) Fiş Detayı ekranını açın. Aynı sekmede eklenti simgesine tıklayın, anahtarı yapıştırıp **Fişleri getir**'e basın.
5. Fişi seçin, önizlemeyi kontrol edin, **Fiş Detayına yaz**'a basın.
6. Luca'da satırları kontrol edip **Kaydet**'e kendiniz basın. Ardından eklentide **Luca'da kaydettim**'e basın; fiş Accountie'de "Aktarıldı" olur ve tekrar listelenmez. Bazı alanlar bulunamayıp elle tamamlandıysa da bu düğme görünür; Kaydet'ten sonra mutlaka basın, yoksa fiş sonraki Excel dosyasına tekrar girer.

Güvenlik:

- Anahtar 12 saat geçerlidir, yalnızca sizin onaylı fişlerinizi okur ve bir fişi "aktarıldı" yapabilir. Yeni anahtar oluşturmak eskisini geçersiz kılar; **Anahtarı iptal et** hemen kapatır.
- Eklenti anahtarı tarayıcı oturumu boyunca tutar (`chrome.storage.session`), tarayıcı kapanınca silinir.
- İzinler: `activeTab` (yalnızca simgesine tıkladığınız sekme), `scripting`, `storage` ve uygulama adresine erişim. Luca şifrenize veya çerezlerinize dokunmaz.

### Luca seçicileri (doğrulanmadı)

Luca'nın sayfa yapısı herkese açık değil. Eklentinin Luca'da aradığı tablo ve hücreler yalnızca `extension/selectors.js` dosyasında tanımlı ve tahmindir. Bir öğe bulunamazsa eklenti "Fiş Detayı tablosu bulunamadı" veya "Alan bulunamadı: 2. satır BT" der ve o alanı boş bırakır.

Güncellemek için: Luca Fiş Detayı ekranında hücreye sağ tıklayıp **İncele** deyin, satırı ve her hücre girişini seçen CSS seçicisini `selectors.js` içine yazın, `chrome://extensions` sayfasında eklentiyi yenileyin. Luca farklı bir alan adındaki iframe kullanıyorsa `activeTab` yetmez; `manifest.json` içine o adres için `host_permissions` eklenmelidir.

Yerel geliştirmede uygulama adresi için `extension/popup.js` içindeki `APP_ORIGIN` ve `manifest.json` içindeki `host_permissions` birlikte değiştirilir (ör. `http://localhost:3000`).
