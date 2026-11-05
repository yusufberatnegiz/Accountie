# Accountie: ürün gereksinimleri (MVP)

Durum: MVP kapsamı onaylandı. Tarih: 2026-11-03.
Kaynaklar: `docs/research/platform-karari.md`, `docs/research/luca-aktarim.md`, `docs/research/model-secimi.md`, `docs/research/hesap-kurallari.md`.

## Amaç

Muhasebeci yazar kasa (ÖKC) fişinin fotoğrafını telefonla çeker. Uygulama fişi okur, Luca için yevmiye satırlarını hazırlar. Muhasebeci tek ekranda kontrol edip onaylar ve onaylı fişleri Luca'nın Excel veri aktarımı ekranına yüklenecek bir `.xlsx` dosyası olarak indirir.

Bugün bu iş elle yapılıyor: fiş okunur, matrah ve KDV hesaplanır, Luca Fiş Detayı ekranına her satır tek tek yazılır. Hedef, fiş başına bu süreyi bir kontrol ve bir onaya indirmek.

## Kullanıcı

- **Birincil:** Luca web sürümünü kullanan serbest muhasebeci veya mali müşavir bürosu çalışanı. Fişi telefonda çeker, kontrol ve aktarımı çoğunlukla masaüstünde yapar.
- **Teknik düzey:** muhasebe bilgisi yüksek, yazılım bilgisi gerekmez.

## Platform

Mevcut Vercel projesinde (accountie.vercel.app) Next.js web uygulaması, telefonda ana ekrana eklenebilir (PWA). Mobil mağaza uygulaması yok. Gerekçe: `docs/research/platform-karari.md` (bağlayıcı).

## Kullanıcı hikayeleri ve kabul kriterleri

### H1. Fiş çekme

Muhasebeci olarak telefonda tek dokunuşla fişin fotoğrafını çekip yüklemek istiyorum.

- [ ] "Fiş çek" düğmesi telefonun kendi kamera uygulamasını açar (`input capture="environment"`). Masaüstünde dosya seçici açılır.
- [ ] Fotoğraf istemcide uzun kenar yaklaşık 1600 px JPEG'e küçültülüp yüklenir.
- [ ] 4 MB üstü veya JPEG/PNG/HEIC/WebP dışı dosya Türkçe hata mesajıyla reddedilir.
- [ ] Art arda çekilen fişler listede ayrı kayıt olarak görünür; biri diğerinin yerine geçmez.
- [ ] Giriş yapmamış kullanıcı yükleme yapamaz (sunucu 401 döner).

### H2. Fişin okunması

Fişteki bilgilerin otomatik doldurulmasını istiyorum.

- [ ] Yüklemeden sonra en geç yaklaşık 15 saniyede satıcı unvanı, VKN, tarih, fiş no, oran bazında KDV, toplam, ödeme şekli ve kategori önerisi görünür.
- [ ] Okunamayan alanlar boş bırakılır ve işaretlenir; uydurma değer yazılmaz.
- [ ] Aritmetik kontrolden geçmeyen fiş bir kez daha güçlü modelle okunur; yine geçmezse ilgili alanlar uyarıyla gösterilir.
- [ ] Yapay zeka hatasında kullanıcı "Fiş okunamadı, tekrar deneyin veya elle girin" mesajını görür ve fişi elle doldurabilir.

### H3. Yevmiye satırlarının hazırlanması

Luca'ya gireceğim satırların kurallara göre hazırlanmasını istiyorum.

- [ ] Örnek fiş (Örnek Alabalık, 0047, 05.09.2026, %10, toplam 8.725,00, KDV 793,18, kartla) şu üç satırı üretir:
  - 770.08 Borç 7.931,82
  - 191.03.10 Borç 793,18
  - 331.01 Alacak 8.725,00
  - Hepsinde Evrak No `0047`, Evrak Tarihi `05/09/2026`, BT `ÖK`, Açıklama `örnek alabalık üretim çiftliği`.
- [ ] Matrah = KDV dahil tutar - fişteki KDV. Tüm hesap tam sayı kuruşla yapılır.
- [ ] Çok oranlı fişte her oran için ayrı gider ve 191 satırı açılır.
- [ ] Gider hesabı kategoriden, KDV hesabı orandan, alacak hesabı ödeme şeklinden kullanıcının kural tablosuna göre gelir. Model hesap kodu üretmez.
- [ ] Borç toplamı alacak toplamına eşit değilse fiş onaylanamaz ve fark gösterilir.

### H4. Tek ekranda kontrol ve onay

Fişi ve satırları tek ekranda görüp düzeltip onaylamak istiyorum.

- [ ] Fotoğraf (oturum boyunca, cihazda) ve satırlar aynı ekranda görünür. Telefonda alt alta, masaüstünde yan yana.
- [ ] Hesap kodu, açıklama, tutarlar, evrak no, tarih ve BT düzenlenebilir.
- [ ] Alacak hesabı tek seçimle değiştirilebilir (Kasa, Ortaklara Borçlar, Şirket kredi kartı, Banka, Personele Borçlar).
- [ ] Ekranda borç toplamı, alacak toplamı ve 191 toplamı görünür.
- [ ] Uyarılar (binek araç, ağırlama, eski KDV oranı, toplam uyuşmazlığı) satırın yanında not olarak çıkar, onayı engellemez. Yalnızca dengesizlik onayı engeller.
- [ ] "Onayla" sonrası fiş "Onaylandı" durumuna geçer.

### H5. Luca'ya aktarım

Onaylı fişleri Luca'ya tek seferde aktarmak istiyorum.

- [ ] "Luca için indir" onaylı ve henüz aktarılmamış fişlerden `.xlsx` üretir.
- [ ] Dosya Luca Excel veri aktarımı kolon düzenindedir; kolon adları kodda tek sabittedir.
- [ ] Bir dosyada en fazla 50 fiş ve 400 satır olur; fazlası ek dosyalara bölünür, fiş ortadan bölünmez.
- [ ] Evrak No ve Fiş No metin hücresidir (`0047` korunur), tarihler tarih hücresi, tutarlar sayı hücresidir.
- [ ] İndirilen fişler "Aktarıldı" olarak işaretlenir ve tekrar indirilebilir.
- [ ] Tek fiş için Luca Fiş Detayı kolon sırasında satırları panoya kopyalayan "Kopyala" düğmesi vardır.
- [ ] Ekranda Luca'daki adımlar kısa bir rehberle anlatılır: Muhasebe > Fiş İşlemleri > Excel veri aktarımı, dosya seç, doğrulama kodu, Yükle, Fiş Kes.

### H6. Hesap kuralları

Kendi Luca hesap planıma göre kuralları düzenlemek istiyorum.

- [ ] İlk girişte varsayılan kural tablosu (`hesap-kurallari.md` bölüm 8) kullanıcıya kopyalanır.
- [ ] Kategori, KDV oranı ve ödeme şekli için hesap kodu ve adı düzenlenebilir.
- [ ] Varsayılan BT kodu (`ÖK`) değiştirilebilir.
- [ ] Hesap kodu `^\d{3}(\.\d{1,3})*$` biçiminde doğrulanır.
- [ ] Kural değişikliği yalnızca yeni fişlere uygulanır; kayıtlı satırlar değişmez.

### H7. Fiş listesi

- [ ] Fişler durumuna göre listelenir: Taslak, Onaylandı, Aktarıldı.
- [ ] Taslak fiş silinebilir. Onaylı fiş taslağa geri alınabilir.
- [ ] Kullanıcı yalnızca kendi fişlerini görür.

## Kapsam dışı (MVP)

- Luca'ya kullanıcısız yazma: resmi API yok. Chrome eklentisi satırları doldurur ve ekranla karşılaştırır. Otomatik kayıt (kaydet, Luca onayını bekle, yeni fiş) ancak kaydetme seçicileri Luca'da doğrulanınca açılır; son fişi her zaman kullanıcı kaydeder. Seçiciler Luca'da doğrulanmadı.
- Mobil mağaza uygulaması, Capacitor, otomatik kenar algılama.
- Fatura, e-Arşiv, gider pusulası gibi ÖKC fişi dışındaki belgeler.
- Çok firma (mükellef) yönetimi, ekip ve rol yetkileri.
- Fotoğrafın sunucuda kalıcı saklanması.
- Çevrimdışı çekim kuyruğu.
- Satıcıya (VKN) göre öğrenen kurallar, kart son 4 hanesine göre hesap eşleme.
- Gemini yedek sağlayıcısı.
- Döviz.

## Başarı ölçütleri

- Gerçek 20 fişlik sette toplam ve KDV en az yüzde 95 doğru okunur.
- Doğru okunan fişte muhasebecinin satır değiştirmeden onaylama oranı yüzde 80 üstü.
- İlk gerçek Excel dosyası Luca'ya hatasız yüklenir.
- Fiş başına yapay zeka maliyeti ortalama 0,002 USD altında (`usage` kayıtlarından).

## Açık kararlar

| Konu | Şu anki varsayım | Sonraki adım |
|---|---|---|
| Luca Excel şablonunun kesin kolonları | Fişliyo'nun 14 kolonlu düzeni | Kullanıcı Luca'dan "Şablon indir" dosyasını verecek |
| BT kodunun Excel'deki biçimi | `ÖK` metni | Şablon ve ilk deneme yüklemesiyle doğrulanacak |
| Muhasebe Fiş No | Dosyada sıra numarası (1, 2, 3...) | İlk yüklemede kullanıcıyla kontrol |
| 770 alt hesap numaraları | Varsayılan tablo, sadece 770.08 kesin | Kullanıcı kendi planıyla eşleyecek |
| Model doğruluğu | Haiku 5.5 seçildi, gerçek fişle ölçülmedi | API anahtarı gelince 10 ila 20 fişlik ölçüm |
| Luca'da resmi API | Yok varsayılıyor | uyelik@luca.com.tr adresine yazılı soru |
