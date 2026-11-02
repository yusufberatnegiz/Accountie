# Luca'ya fiş/yevmiye kaydı aktarımı: araştırma

Tarih: 2026-11-03. Kapsam: Luca web sürümü (auygs.luca.com.tr/Luca/luca.do).
Kural: Birincil kaynakta (Luca destek sitesi lucayazilim.freshdesk.com) okunan bilgi "doğrulandı", yalnızca üçüncü taraf kaynakta geçen bilgi "üçüncü taraf", hiç bulunamayan bilgi "doğrulanamadı" diye işaretlendi.

## Kısa sonuç

| Yol | Durum | Karar |
|---|---|---|
| Resmi fiş kaydı API'si | Herkese açık doküman yok, doğrulanamadı | Kullanılmaz |
| Excel Veri Aktarımı (Muhasebe > Fiş İşlemleri) | Var, Luca destek sitesinde belgeli | **Birincil yol** |
| Tarayıcı eklentisi ile Fiş Detayı formunu doldurma | Teknik olarak mümkün, kırılgan, şartlar belirsiz | **Yedek**, uygulandı (`extension/`), seçiciler doğrulanmadı |

## 1. Resmi API var mı?

- Luca'nın fiş/yevmiye kaydı oluşturan, herkese açık bir API dokümanı **bulunamadı (doğrulanamadı)**.
- Bazı entegratörler (Zunapro, Faturaport, İşnet) "Luca entegrasyonu" sunuyor. Zunapro sayfası satış faturası ve cari hareketi aktardığını, erişim için "Luca tarafında başvuru gerekebileceğini" yazıyor. Yani kapalı, başvuruyla verilen bir iş ortağı arayüzü olabilir; kapsamı (yevmiye fişi dahil mi) belirsiz. [Zunapro Luca entegrasyonu](https://www.zunapro.com/turkey/tr/entegrasyon/luca), [Faturaport duyurusu](https://faturaport.com/blog/e-donusum/faturaport-a-luca-entegrasyonu-eklendi) (403, içerik okunamadı).
- Yandex soru-cevap sayfalarındaki "API Anahtarı" anlatımları Defter Beyan entegrasyonuyla ilgili ve otomatik üretilmiş görünüyor; güvenilir değil.
- Yapılacak iş: Luca'ya (uyelik@luca.com.tr) resmi API olup olmadığı yazılı sorulmalı. Cevap gelene kadar API'ye dayalı tasarım yapılmaz.

## 2. Excel'den fiş aktarma

### Doğrulanan (Luca destek sitesi)

Kaynak: [01.02.09 Excel Veri Aktarımı](https://lucayazilim.freshdesk.com/support/solutions/articles/67000267580-01-02-09-excel-veri-aktar-m-), [Luca Asistan ile Kebir'den fiş çevirme](https://lucayazilim.freshdesk.com/support/solutions/articles/67000684096-luca-asistan-uygulamas-arac-l-%C4%9F-ile-luca-kebir-defterinden-fi%C5%9F-cevirme)

- Menü: **Muhasebe > Fiş İşlemleri > Excel veri aktarımı**.
- Ekranda **"Şablon indir"** bağlantısı var; resmi şablon buradan iner.
- Zorunlu alanlar: **Fiş No, Fiş Tarihi, Hesap Kodu, Borç, Alacak**.
- Gruplama: Fiş No ve Fiş Tarihi aynı olan satırlar aynı fişe gider; biri farklıysa ayrı fiş olur.
- Limitler: bir yüklemede en fazla **50 fiş**; mahsup fişinde en fazla **400 satır** (açılış/kapanışta sınır yok).
- Akış: Dosya seç, **doğrulama kodu** (CAPTCHA benzeri) yaz, Yükle. Önizlemede kayda çift tıkla, detay altta görünür, gerekirse satır sil. **"Fiş Kes"** penceresinde Fiş Açıklaması, Fiş Tipi (Mahsup/Açılış/Kapanış), Fiş Kodu ve Belge Türü seçilip fiş kesilir.
- Hesap kodları Luca'da açık olmalı; yoksa "hesap kodu bulunamadı" uyarısı çıkar, F10 ile hesap açılabilir.
- Önizlemede düzenlenebilen alanlar: Hesap Kodu, Evrak No, Evrak Tarihi, Miktar, Borç, Alacak.

Not: Doğrulama kodu adımı yüklemenin kullanıcı tarafından elle yapılmasını gerektirir. Uygulama dosyayı üretir, yüklemeyi muhasebeci yapar.

### Üçüncü taraf: 14 kolonlu şablon

Kaynak: [Fişliyo, Luca Excel Fiş Aktarımı](https://fisliyo.com/luca-fis-aktarimi) (rakip ürün; "çalışan bir mali müşavirin kullandığı dosyadan" aldıklarını söylüyorlar). Kolon sırası:

| # | Kolon | Örneğimizdeki değer |
|---|---|---|
| 1 | Fiş No | 1 (muhasebe fişi no, metin) |
| 2 | Fiş Tarihi | 05.09.2026 |
| 3 | Fiş Açıklama | ÖKC FİŞLERİ / satıcı adı |
| 4 | Hesap Kodu | 770.08 |
| 5 | Evrak No | 0047 (metin, baştaki sıfırlar korunmalı) |
| 6 | Evrak Tarihi | 05.09.2026 |
| 7 | Detay Açıklama | arkadaş alabalık üretim çiftliği |
| 8 | Borç | 7931,82 |
| 9 | Alacak | 0 / boş |
| 10 | Miktar | boş |
| 11 | Belge Türü | büroya özel kod (Luca ekranında BT kolonu, örnekte "ÖK") |
| 12 | Para Birimi | TL |
| 13 | Kur | boş |
| 14 | Döviz Tutar | boş |

Aynı kaynağa göre: başlıklar Luca ekranındakiyle birebir aynı olmalı; dosya **.xlsx**; tarihler gerçek tarih hücresi, tutarlar gerçek sayı, fiş no ve evrak no metin hücresi. Fisle'nin 6 kolonlu anlatımı ([fisle.co](https://www.fisle.co/blog/luca-formati-nedir)) ve Yeşilmavi'nin CSV kılavuzu ([PDF](https://destek.yesilmaviyazilim.com.tr/bilgilendirme/LucaExcelFis(CSV).pdf), 403) ile çelişiyor; bu yüzden kolon listesi **kesin değil**.

### Belge Türü (BT) kodları

- Fişliyo'ya göre kodlar Luca'da sabit değil, **her büro kendi tanımlıyor**: Yönetici Modülü > Diğer Tanımlar > Belge Türleri (üçüncü taraf). Örnek ekranımızda yazarkasa fişi için "ÖK" kullanılmış; Fişliyo varsayılanı "FŞ".
- e-Defter tarafında GİB'in belge tipleri sabit (invoice, check, receipt, other vb.); Luca kodu bunlara eşliyor olmalı (doğrulanamadı).
- Sonuç: BT kodu ayarlanabilir olmalı, varsayılan "ÖK".

### Doğrulanamayan noktalar

- Resmi şablonun kolon adları ve sırası (şablon giriş gerektiren ekranda).
- Tutar hücresinin sayı mı, "7.931,82" metni mi olması gerektiği.
- Tarih hücresinin Excel tarih tipi mi, "GG.AA.YYYY" metni mi olacağı.
- Hesap kodu ayırıcısı: ekranda noktalı (770.08, 191.03.10), dosyada da aynı biçim beklenir (doğrulanamadı).
- Alacak/Borç boşken 0 mı boş mu yazılmalı.

İlk iş: kullanıcıdan Luca'da "Şablon indir" ile inen boş dosyayı (kişisel veri içermez) almak ve üreteci buna göre kilitlemek. O zamana kadar 14 kolonlu düzen varsayılan olarak kullanılır, kolon adları tek bir sabitte tutulur.

## 3. Tarayıcı eklentisi ile doğrudan doldurma

Fikir: Chrome MV3 eklentisi, `https://auygs.luca.com.tr/*` için content script; kullanıcı Luca'da Fiş Detayı ekranını açar, eklenti Accountie'den onaylı kaydı çeker, grid satırlarını doldurur, kullanıcı **Kaydet**'e kendisi basar.

Mümkün mü: Teknik olarak evet. Content script kullanıcının açık oturumunda çalışır, şifre veya çerez taşımaya gerek yoktur. `all_frames: true` ile iframe içindeki forma da erişilebilir (aynı köken ise).

Riskler:

- **Kullanım şartları:** Luca'nın üyelik sözleşmesinde otomasyon/robot hükmü olup olmadığı **doğrulanamadı** (metin bulunamadı). Kullanıcı bastığı Kaydet ile kayıt oluştuğu sürece bu "kullanıcının yerine yazma" kategorisinde kalır ama yazılı teyit yok.
- **DOM kırılganlığı:** luca.do tek sayfalı, menüler ve grid'ler çerçeve/JS bileşeni içinde (ekran görüntüsündeki grid düzenlenebilir hücreli). Seçiciler resmi değil; Luca her güncellemede bozabilir. Grid hücreleri genelde input'a tıklayınca oluşan editörlerdir; sadece `value` atamak yetmez, klavye/olay simülasyonu gerekir. Hesap kodu alanı otomatik tamamlama açıyorsa ek kırılganlık.
- **iframe yapısı:** Doğrulanamadı (Luca'ya erişimimiz yok). Farklı kökenli iframe varsa `host_permissions` genişletilmeli.
- **Bakım ve dağıtım:** Chrome Web Store incelemesi, her Luca değişikliğinde sürüm çıkarma. Muhasebecinin bilgisayarında kurulum gerekir; telefonda çalışmaz.
- **Hata maliyeti:** Yanlış hücreye yazılan tutar defter kaydına girer. Önizleme ve kullanıcı onayı şart.
- **Rakip emsal:** Piyasadaki ürünler (Fişliyo, Fisle) doğrudan doldurma değil Excel dosyası üretmeyi seçmiş. Luca için fiş girişi yapan bir eklenti bulunamadı; bulunan tek eklenti E-Belge portal giriş yardımcısı ([chromeboard](https://www.chromeboard.com/extension/luca-e-belge-portal-giriş-glpngclokmgkjgfglknaaifemndcfohi)).

## 4. Öneri

1. **Birincil: Excel (.xlsx) üretimi.** Uygulama onaylanan fişlerden Luca Excel Veri Aktarımı biçiminde dosya üretir. Kurallar: tutarlar kuruştan üretilir, her fiş dengeli olmalı (borç = alacak), en fazla 50 fiş / 400 satır, fazlası ayrı dosyaya bölünür (fiş ortadan bölünmez). Evrak No metin, BT kodu ayarlanabilir (varsayılan ÖK), Fiş No kullanıcıya/sıraya göre. Kolon adları tek sabitte; resmi şablon alınınca güncellenir.
2. **Yardımcı: Kopyala-yapıştır görünümü.** Tek fiş için Fiş Detayı grid'iyle aynı kolon sırasında (Hesap Kodu, Evrak No, Evrak Tarihi, BT, Açıklama, Borç, Alacak) satırları gösteren ve panoya sekmeyle ayrılmış metin kopyalayan ekran. Ucuz, Luca güncellemesine dayanıklı. Luca grid'inin çok satırlı yapıştırmayı kabul edip etmediği doğrulanamadı; kabul etmezse elle girişte rehber olur.
3. **Yedek: Chrome eklentisi.** Kaydet butonuna eklenti basmaz.
   - Durum (2026-11-03): `extension/` altında uygulandı. Seçiciler (`extension/selectors.js`) Luca'ya erişim olmadan tahminle yazıldı, **doğrulanmadı**; ilk kullanımda büyük olasılıkla "Fiş Detayı tablosu bulunamadı" veya "Alan bulunamadı" çıkar ve seçiciler gerçek ekrana göre güncellenmelidir. Kullanım şartları sorusu hâlâ açık.
4. **Takip:** Luca'ya resmi API sorusu; cevap olumluysa 1. madde API ile değiştirilir.

## Kaynaklar

- Luca destek, Excel Veri Aktarımı: https://lucayazilim.freshdesk.com/support/solutions/articles/67000267580-01-02-09-excel-veri-aktar-m-
- Luca destek, Luca Asistan ile Kebir'den fiş çevirme: https://lucayazilim.freshdesk.com/support/solutions/articles/67000684096-luca-asistan-uygulamas-arac-l-%C4%9F-ile-luca-kebir-defterinden-fi%C5%9F-cevirme
- Luca destek, Excel Fatura Aktarımı (başlık): https://lucayazilim.freshdesk.com/support/solutions/articles/67000271379-01-02-11-excel-fatura-aktar-m-
- Fişliyo, Luca Excel Fiş Aktarımı (14 kolon, BT kodları): https://fisliyo.com/luca-fis-aktarimi
- Fisle, Luca formatı: https://www.fisle.co/blog/luca-formati-nedir
- Yeşilmavi Fatura Çevirici, Luca Excel fiş (CSV) kılavuzu: https://destek.yesilmaviyazilim.com.tr/bilgilendirme/LucaExcelFis(CSV).pdf
- Zunapro, Luca entegrasyonu: https://www.zunapro.com/turkey/tr/entegrasyon/luca
- TÜRMOB Luca broşürü (Excel'den yevmiye fişi aktarımı): https://www.turmobeimza.com.tr/upload/docs/genel_brosur_luca.pdf
- Luca E-Belge Portal giriş eklentisi: https://www.chromeboard.com/extension/luca-e-belge-portal-giriş-glpngclokmgkjgfglknaaifemndcfohi
