# Accountie

Yazar kasa fişinin fotoğrafından Luca için yevmiye kaydı hazırlar. Muhasebeci satırları kontrol edip onaylar, onaylı kayıt Luca'ya iki yoldan biriyle aktarılır:

1. **Excel dosyası (birincil).** Fişler sayfasında "Luca için indir". Dosya Luca'da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranından yüklenir. Kolon düzeni Luca'nın resmi şablonuyla henüz doğrulanmadı; kolon adları yalnızca `src/lib/luca/export.ts` içindeki `LUCA_EXPORT_COLUMNS` sabitinde.
2. **Chrome eklentisi (yedek).** Onaylı fişin satırlarını Luca'da açık olan Fiş Detayı ekranına yazar. Kaydet'e eklenti basmaz, siz basarsınız.

Ayrıntılar: `docs/PRD.md`, `docs/TECH_DESIGN.md`, `docs/research/luca-aktarim.md`.

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
6. Luca'da satırları kontrol edip **Kaydet**'e kendiniz basın. Ardından eklentide **Luca'da kaydettim**'e basın; fiş Accountie'de "Aktarıldı" olur ve tekrar listelenmez.

Güvenlik:

- Anahtar 12 saat geçerlidir, yalnızca sizin onaylı fişlerinizi okur ve bir fişi "aktarıldı" yapabilir. Yeni anahtar oluşturmak eskisini geçersiz kılar; **Anahtarı iptal et** hemen kapatır.
- Eklenti anahtarı tarayıcı oturumu boyunca tutar (`chrome.storage.session`), tarayıcı kapanınca silinir.
- İzinler: `activeTab` (yalnızca simgesine tıkladığınız sekme), `scripting`, `storage` ve uygulama adresine erişim. Luca şifrenize veya çerezlerinize dokunmaz.

### Luca seçicileri (doğrulanmadı)

Luca'nın sayfa yapısı herkese açık değil. Eklentinin Luca'da aradığı tablo ve hücreler yalnızca `extension/selectors.js` dosyasında tanımlı ve tahmindir. Bir öğe bulunamazsa eklenti "Fiş Detayı tablosu bulunamadı" veya "Alan bulunamadı: 2. satır BT" der ve o alanı boş bırakır.

Güncellemek için: Luca Fiş Detayı ekranında hücreye sağ tıklayıp **İncele** deyin, satırı ve her hücre girişini seçen CSS seçicisini `selectors.js` içine yazın, `chrome://extensions` sayfasında eklentiyi yenileyin. Luca farklı bir alan adındaki iframe kullanıyorsa `activeTab` yetmez; `manifest.json` içine o adres için `host_permissions` eklenmelidir.

Yerel geliştirmede uygulama adresi için `extension/popup.js` içindeki `APP_ORIGIN` ve `manifest.json` içindeki `host_permissions` birlikte değiştirilir (ör. `http://localhost:3000`).
