# Accountie tasarım yönü

Durum: bağlayıcı. Tarih: 2026-11-03. Her UI geliştiricisi ve jüri üyesi işe başlamadan bu belgeyi baştan sona okur.
Bu belge yalnızca yönü belirler; kod içermez. Kurallar şu sırayla üstündür: `INSTRUCTIONS.md` (mavi palet, güvenlik, yasaklar) > taste-skill house rules > bu belge > yön kâğıtlarındaki blueprint'ler.

Kullanılan skill'ler (Skill aracıyla çağrıldı): `taste-skill:design-taste-frontend` (SKILL.md ve `references/app-screens.md` tamamı okundu; `copy.md`, `motion.md` ilgili bölümleri) ve `web-design-guidelines` (Vercel Web Interface Guidelines, `command.md` güncel sürümü çekildi, bölüm 11'e kontrol listesi olarak aktarıldı).

Skill klasörü: `C:\Users\Yusuf Berat Negiz\.claude\plugins\cache\taste-skill\taste-skill\2.1.5\skills\taste-skill` (aşağıda `<skill>`). Script'ler repo kökünden çalışır, çalışma dosyaları `.taste-skill/` altına düşer (gitignore'da).

## 0. Kısa özet

| Konu | Karar |
|---|---|
| Ana sayfa yönü | `product-performs` (Ürün sahnede çalışır), seed **975044981** |
| Hero | Control that reads the page: iki ton yarı, sağda çalışan fiş parçası |
| Panel stili | `achromatic-ledger` (Renksiz defter, açık), seed **1951193909**, kabuk: icon rail |
| Yazı | Stack Sans Headline (yalnız büyük başlıklar, 300) + Stack Sans Text (her şey). İki aile. |
| Vurgu | Defter mavisi `#2b5a9a` (koyu temada `#8db0e0`). Mavi = Luca'ya giden rakam. |
| Fikir | Fişin termal baskısı, ziyaretçinin elinde Luca Fiş Detayı satırlarına dönüşür; Luca'ya giden her rakam defter mavisiyle yazılır. |
| Canlı öğe | Hero'daki "fiş tezgâhı": örnek fiş ve ödeme şekli seçilir, satırlar `buildJournalLines` ile gerçek kurallardan hesaplanır, "Satırları kopyala" gerçekten panoya Luca sırasında yazar. |
| İmza öğe (panel) | Fiş izi: bir yevmiye satırı seçilince fişte o rakamın geldiği satır işaretlenir; listede Luca dosyası doluluk çizgisi (50 fiş / 400 satır). |

Yön kâğıtları yerelde: `.taste-skill/direction.json` (sayfa) ve `.taste-skill/app/direction.json` (panel). Yeniden yazdırmak için:

```
node "<skill>/scripts/draw.mjs" --show
node "<skill>/scripts/draw.mjs" --show --out .taste-skill/app
```

Kâğıtlar kaybolursa aynı çıktıyı üreten komutlar bölüm 12'de. Bu belge kâğıtların bağlayıcı kısmını zaten içerir.

## 1. Ürün envanteri (yalnız bu ürüne ait olanlar)

1. **Yazar kasa (ÖKC) fişi:** dar termal kâğıt şeridi, büyük harf satıcı unvanı, `TOPKDV *793,18`, `TOPLAM *8.725,00`, yıldızlı tutarlar, `KREDİ KARTI`. Zamanla soluklaşan gri baskı.
2. **Örnek fiş 0047:** Örnek Alabalık Üretim Çiftliği, 05.09.2026, %10, toplam 8.725,00, KDV 793,18, kartla. Projenin kendi test fikstürü.
3. **Yevmiye kaydı:** 770.08 Borç 7.931,82 / 191.03.10 Borç 793,18 / 331.01 Alacak 8.725,00. Borç toplamı alacağa eşit olmadan onay yok.
4. **KDV kuralı:** matrah = KDV dahil tutar - fişteki KDV, kuruş kuruş tam sayı. KDV yeniden hesaplanmaz. %1, %10, %20; eski %8 ve %18 uyarı verir.
5. **Luca Fiş Detayı grid'i:** Hesap Kodu, Evrak No, Evrak Tarihi, Açıklama, Borç, Alacak, BT. Muhasebecinin her gün baktığı gri ERP tablosu.
6. **Luca Excel veri aktarımı:** Muhasebe > Fiş İşlemleri > Excel veri aktarımı, doğrulama kodu, Yükle, Fiş Kes. Bir yüklemede en fazla 50 fiş, 400 satır. Evrak No metin hücresi (`0047` korunur).
7. **Hesap planı kodları:** 770.xx gider, 191.03.xx indirilecek KDV, 100.01 Kasa, 331.01 Ortaklara Borçlar, 309.01 Şirket kredi kartı, 102.01 Banka, 335.01 Personele Borçlar. Belge türü `ÖK`.
8. **Yevmiye defteri ve mavi mürekkep:** elle tutulan defterin çizgili sütunları; muhasebe bürosunun mavi tükenmez/kopya kalemi. Ürünün vurgu rengi buradan gelir.
9. **Antalya'daki muhasebe bürosu:** ayın sonunda poşetle gelen fişler, telefonla çekim, masaüstünde Luca. (Ürünün çıkış yeri olarak kullanılacaksa kullanıcı onaylar; bkz. bölüm 4, "Yer".)
10. **Fotoğraf cihazda kalır:** sunucu fotoğrafı saklamaz; kontrol ekranındaki görüntü yalnız o cihazda. Gizlilik ürünün kendi sınırıdır.
11. **Chrome eklentisi:** açık Fiş Detayı ekranına satırları yazar, Kaydet'e basmaz.
12. **Tek ekran kontrol:** fotoğraf ve satırlar yan yana; uyarılar (binek araç %30 KKEG, ağırlama KDVK 30/d, konaklama vergisi) satırın yanında not.

## 2. Argüman (ana sayfanın bölümleri = iddialar)

Okuyucu: Luca web kullanan serbest muhasebeci veya büro çalışanı. Muhasebeyi bilir, yazılımı umursamaz. Bir ekranda inanması gereken tek şey: "Fişi çekiyorum, Luca'ya girecek satırlar benim hesap planımla hazır geliyor; ben kontrol edip onaylıyorum."

| # | Bölüm (rol) | İddia | Kanıt |
|---|---|---|---|
| 1 | hero | Fişten Luca'ya yevmiye kaydı hazırlar. | Çalışan fiş tezgâhı: gerçek fiş, gerçek satırlar, kopyala. |
| 2 | how-it-works | Bir fiş dört durumdan geçer ve son adım sizdedir. | Aynı fiş kartı dört alanda: çekildi, okundu, onaylandı, aktarıldı. |
| 3 | showcase | Kontrol ekranı hatayı onaydan önce yakalar. | Altı gerçek parça: kontrol ekranı, alacak seçimi, dengesiz fiş, uyarılar, Luca dosyası, eklenti. |
| 4 | features | Hesap kodları sizin planınızdan gelir, yapay zekadan değil. | Hesap kuralları paneli, altı kenar notu. |
| 5 | list | Luca'ya üç yolla gider ve Luca'nın sınırlarına uyar. | Excel, pano, eklenti satırları; 1833 tarihli yevmiye defteri sayfası. |
| 6 | (dinlenme resmi) | Bir büronun gerçek işinden çıktı. | Antalya limanı fotoğrafı. Onaysız ise yalnız resim ve altyazı. |
| 7 | faq | Fotoğraf saklanmaz, Luca'ya onaysız kayıt gitmez. | Yedi gerçek soru, yedi kesin cevap. |
| 8 | cta | İlk fişi çekmek bir hesap uzaklığında. | Açık "Hesap oluşturun" penceresi. |
| 9 | footer | Ne olduğu, bağlantılar, görsel kaynakları. | Tek satır. |

Fiyat bölümü yok: fiyat bilinmiyor, uydurulmaz. Müşteri yorumu, logo, "N büro kullanıyor" gibi kanıt yok: uydurulmaz.

## 3. Ana sayfa yönü

### 3.1 Dağıtılan üç yön ve seçim

Komut (bölüm 12): `draw.mjs --sector finance --have product-ui --keep palette --options 3`.

| Yön | Özet | Karar |
|---|---|---|
| `borrowed-category` | Konuyu başka bir kategorinin kılığında anlatmak (para uygulamasını sokak giyimi gibi satmak). | Hayır. Muhasebeci güven ister; kılık değiştirme ürünün gerçek işini (satırları) arka plana iter. |
| **`product-performs`** | Ürünün gerçek parçaları sayfada çalışır; hero ürünün tanımlayıcı etkileşimidir. | **Seçildi.** Accountie'nin tanımlayıcı anı ölçülebilir ve küçük: bir fiş üç satıra dönüşür. Bu an HTML'de, saf `buildJournalLines` ve `DEFAULT_RULES` ile birebir gerçek çalışabilir. Envanterdeki fiş, Fiş Detayı grid'i, KDV kuralı ve denge şartı aynı parçada görünür. |
| `type-only-statement` | İlk ekran yalnız yazı; resimler sonra. | Hayır. Ürünün en güçlü resmi kendi arayüzü; onu ilk ekrandan çıkarmak kanıtı saklamak olur. |

Redraw yapılmadı. `--keep palette`: renk `INSTRUCTIONS.md` mavi kuralından geliyor, yön yalnız kompozisyon ve yazıyı dağıttı.

### 3.2 Fikir cümlesi

> Bu sayfada, **0047 numaralı yazar kasa fişinin termal baskısı** ziyaretçinin elinde **Luca Fiş Detayı'nın üç satırına dönüşen çalışan bir parça** olur; Luca'ya giden her rakam defterin mavi mürekkebiyle yazılır.

Rakip testi: aynı cümleye rakip bir fiş okuyucuyu koyunca "fiş satıra dönüşür" kısmı kategoriye ait kalır. Cümleyi bu ürüne ait yapan üç şey, sayfada görünür olmak zorunda:
1. Satırlar ürünün kendi saf fonksiyonu ve varsayılan hesap planıyla hesaplanır; ödeme şekli değişince alacak hesabı 331.01'den 100.01 Kasa'ya geçer (kuralın kendisi gösterilir).
2. Denge şartı ve matrah formülü parçanın içinde okunur: `Matrah 8.725,00 - 793,18 = 7.931,82`.
3. Renk kuralı: fişten okunan rakam gri termal baskı tonunda, Luca'ya gidecek rakam defter mavisinde. Bu kural panelde de aynıdır (bölüm 5.3).

### 3.3 Tek canlı öğe: fiş tezgâhı

Yeri: hero'nun sağ yarısı (telefonda üstte). Kök elemanda `data-ui`.

- **Seçim:** üç örnek fiş, segmented control (radiogroup): "Alabalık, %10", "Kırtasiye, %20", "Market, iki oran". Altında ödeme: "Kart" / "Nakit".
- **Sol:** termal fiş şeridi (HTML, kod ile çizilir, fotoğraf değil). Satıcı, tarih, fiş no, oran bazında KDV, TOPLAM, ödeme. Rakamlar `--thermal-ink` tonunda.
- **Sağ:** Luca satırları: Hesap kodu + hesap adı (alt satır), Borç, Alacak. Tutarlar `--accent`, sağa hizalı, tabular. Altında: `Borç 8.725,00 · Alacak 8.725,00 · Dengede` ve 13px okuma: `Matrah = 8.725,00 - 793,18`.
- **Eylem:** "Satırları kopyala" düğmesi `clipboardText(lines)` ile Luca Fiş Detayı sırasını panoya yazar; `aria-live="polite"` durum: "Kopyalandı. Luca Fiş Detayı'na yapıştırabilirsiniz."
- **Veri:** `src/lib/journal.ts`, `src/lib/default-rules.ts`, `src/lib/luca/clipboard.ts`, `src/lib/money.ts` istemciye alınır (saf modüller, sır yok). Veritabanı, oturum, API çağrısı yok.
- **Örnek fişler** (A ve B `preview-fixtures` ile aynı, C örnek veri, rapora "değiştirilebilir örnek" diye yazılır):
  - A: ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ, 0047, 05.09.2026, %10, brüt 8.725,00, KDV 793,18, kart. Sonuç: 770.08 B 7.931,82 / 191.03.10 B 793,18 / 331.01 A 8.725,00.
  - B: KIRTASİYE DÜNYASI, 0912, 02.09.2026, %20, brüt 480,00, KDV 80,00, nakit. Sonuç: 770.02 B 400,00 / 191.03.20 B 80,00 / 100.01 A 480,00.
  - C: GÜNEŞ MARKET (örnek), 2214, 04.09.2026, kategori Mutfak ve market, %1 brüt 412,50 KDV 4,08 ve %20 brüt 186,00 KDV 31,00, toplam 598,50, kart. Sonuç: 770.12 B 408,42 / 191.03.01 B 4,08 / 770.12 B 155,00 / 191.03.20 B 31,00 / 331.01 A 598,50. (Toplam kontrolü: 408,42 + 4,08 + 155,00 + 31,00 = 598,50.)
  - VKN gösterilmez. Kart numarası, son dört hane, fiş fotoğrafı hiçbir yerde yok.
- **Uyarı:** A seçiliyken satırın yanında gerçek not: "Ağırlama işle ilgili değilse KDV indirilemez (KDVK 30/d). İşle ilgisini belgeleyin." (`WARNING_MESSAGES.meal`).
- **Telefon:** başparmakla kullanılır; kontroller 44px, segmented üç seçenek tam genişlik (480px altı).
- **Script yokken:** sunucu A fişinin satırlarını statik tablo olarak basar; kontroller gizli değil, devre dışı ve "Satırları görmek için JavaScript gerekir" demez, sadece tablo görünür.
- **Test:** üç örneğin satırları ve dengesi için bir vitest (saf fonksiyon, mevcut testlerle aynı desen).

### 3.4 Yön kâğıdının kompozisyonu (bağlayıcı geometri)

Yazı: Stack Sans Headline 300, tracking -0.022em, leading 1.05; Stack Sans Text 400/500, leading 1.5.
Sayfa kenar boşluğu: masaüstü 40px, tablet 32px, telefon 16px (iki yanda eşit). Bölümler arası 160px masaüstü, 96px telefon.

1. **Hero (Control that reads the page):** ekran iki tona bölünür, kenar çizgisi yok, %50'de birleşir. Sol yarı `--ground`, sağ yarı bir ton farklı `--stage`. Solda üstte işaret (40px boşluk), altta sola yaslı: h1 (tek satır, `--step-lead` üst sınırı 32px, 500 ağırlık), destek cümlesi (17px, 44ch), birincil düğme. Sağda fiş tezgâhı, ortalı, yaklaşık 480x480. Navigasyon çubuğu yok: sağ üstte 15px "Giriş yap" bağlantısı ve tema seçici. Telefon: önce açık tonlu blok (58svh) içinde tezgâh, altında koyu olmayan ikinci blok içinde h1, cümle, düğme; sol 16px.
2. **how-it-works (One card, four fields):** tam genişlikte dört düz renk alanı (her biri 25vw, 84svh, boşluksuz). Aynı fiş kartı (260px, `data-ui`) her alanda %38 yükseklikte, her seferinde bir adım ileride. Altta her alanda iki satırlık cümle. Başlık yalnız ilk alanda sol üstte. Hover'da kart 6px yükselir (150ms). Telefon: alanlar alt alta, 64svh.
3. **showcase (Lit panel, dark row):** tek koyu alan (96svh, iki temada da koyu: `--deep`). Ortada yatay kaydırılan altı parça (320-460px), `scroll-snap`. Ortadaki parça açık tema renklerinde ve tam opak; diğerleri soluk ve `inert`. Sağında 24ch sütun: parça adı 24px, iki satır açıklama 16px. House rule gereği alanın sol üstünde h2 var (blueprint başlıksız diyor, house rule kazanır). Okunan metin soluklaştırılmaz: yalnız parçalar soluklaşır, metinler tam `--ink-on-deep`/`--muted-on-deep`.
4. **features (Panel with margin notes):** Hesap kuralları paneli tam boy (380x680, `data-ui`) 12 kolonun 5-8'inde. Altı not: üçü solda sağa yaslı, üçü sağda sola yaslı, her biri anlattığı kontrolle aynı hizada. Not: ad 18px 500, iki satır 15px `--muted`. Nota hover/focus: o kontrol tam, panelin geri kalanı %30 opaklık (yalnız panel soluklaşır, notlar değil). Başlık sol kolonda sağa yaslı, panel üstüyle aynı hizada, 32-40px. Telefon: panel üç dilim, her dilimin altında iki not.
5. **list (Two-ended rows, narrow column):** 520px dar sütun, %22'den başlar; satırlar 36px, aralarında çizgi yok; solda 16px yuvarlak renk noktası + ad (16px), sağda kısa değer (13px `--muted`, tabular). Gruplar 40px boşlukla ayrılır, grup adı `--muted` aynı boyda. Sağ yarı boş kalmaz: 1833 tarihli yevmiye defteri sayfası (dik, kare köşe) ve altyazısı.
6. **Dinlenme resmi (sayfadaki tek kasıtlı dinlenme):** Antalya limanı tam genişlik, 70svh, altında altyazı. Yavaş kaydırma bağlantılı ölçek (sayfanın hareketli resmi).
7. **faq (Question index, one answer):** sol 1-5 kolonda sorular (18px, önlerinde 8px nokta, seçili olan `--accent` nokta ve `--ink` metin), sağ 7-12 kolonda yapışkan cevap paneli (24-28px, 30ch). İlk soru seçili açılır; seçim hover, tıklama ve klavye odağını izler; 150ms çapraz geçiş. Telefon: akordeon, sticky yok.
8. **cta (First step, already open):** tam genişlik `--accent-field` alanı, 90svh. Sağda (7-11) ürünün gerçek "Hesap oluşturun" penceresi (440px, `data-ui`, açık pencere olduğu için gölgesi var). Solda altta kapanış satırı (iki satır, `--step-display`) ve altında bir cümle. Telefon: kapanış satırı üstte, pencere altta tam genişlik, düğme 52px.
9. **footer (A single quiet line):** en az 30svh boş zemin sonrası tek satır, üç kolon `1fr auto 1fr`. Logo yok, çizgi yok, arka plan değişmez.

### 3.5 Tam kopya metni (Türkçe, aynen kullanılır)

Kurallar: em dash yok; başlıklar her genişlikte en fazla iki satır; jenerik pazarlama sözcüğü yok; cümle düzeni (sentence case); yükleniyor metinleri "…" ile biter.

**Sayfa başlığı (`<title>`):** Accountie: yazar kasa fişinden Luca yevmiye kaydı
**Meta açıklama:** Yazar kasa fişini telefonla çekin, Luca Fiş Detayı satırları hesap planınıza göre hazırlansın. Kontrol edip onaylayın, Excel ile Luca'ya aktarın.

**Hero**
- Sağ üst bağlantı: Giriş yap
- h1: Fişten Luca'ya yevmiye kaydı
- Destek cümlesi: Yazar kasa fişini telefonla çekin; matrah, KDV ve alacak hesabı sizin hesap planınıza göre Luca Fiş Detayı satırlarına yazılır.
- Birincil düğme: Hesap oluştur
- Tezgâh başlığı: Örnek fiş
- Segmented: Alabalık, %10 · Kırtasiye, %20 · Market, iki oran
- Ödeme seçimi etiketi: Ödeme · seçenekler: Kart · Nakit
- Tablo başlıkları: Hesap · Borç · Alacak
- Toplam satırı: Borç {x} · Alacak {y} · Dengede
- Formül okuması: Matrah = {brüt} - {KDV}
- Düğme: Satırları kopyala · durum: Kopyalandı. Luca Fiş Detayı'na yapıştırabilirsiniz. · hata: Panoya yazılamadı. Satırları seçip kopyalayın.

**how-it-works**
- h2 (ilk alan): Bir fişin yolu
- Alan 1 cümlesi: Önce telefonla çekilir.
  - Kart: durum "Okunuyor…", "Fotoğraf cihazınızda, 1600 px", değerlerin yerinde gerçek boyutlu yükleniyor çubukları.
- Alan 2 cümlesi: Sonra satırları okunur.
  - Kart: Satıcı ÖRNEK ALABALIK…, Evrak No 0047, Tarih 05.09.2026, KDV %10 793,18, Toplam 8.725,00, Kategori Yemek ve ağırlama.
- Alan 3 cümlesi: Ardından siz onaylarsınız.
  - Kart: üç satır, "Borç 8.725,00 = Alacak 8.725,00", durum Onaylandı.
- Alan 4 cümlesi: En son Luca'ya gider.
  - Kart: durum Aktarıldı, "luca-fisler-2026-09-05.xlsx", "1 fiş, 3 satır".

**showcase**
- h2: Kontrol ekranından Luca'ya
- Parça 1, ad: Kontrol ekranı. Metin: Fotoğraf solda, satırlar sağda. Hesap kodu, tutar, evrak no ve BT aynı ekranda düzeltilir.
- Parça 2, ad: Alacak hesabı. Metin: Ortağın kartıyla ödendiyse 331.01, şirket kartıysa 309.01. Tek seçimle değişir.
- Parça 3, ad: Dengesiz fiş. Metin: Borç ile alacak tutmazsa Onayla kapanır ve fark kuruşuyla görünür.
  - Parça içi: Borç 8.725,00 · Alacak 8.752,00 · Fark 27,00. Düğme yanında: "Borç ile alacak eşit olmadan onaylanamaz."
- Parça 4, ad: Uyarı notları. Metin: Binek araç, ağırlama ve eski KDV oranı satırın yanında not olarak durur, onayı engellemez.
- Parça 5, ad: Luca dosyası. Metin: Luca bir yüklemede 50 fiş ve 400 satır kabul eder. Fazlası ek dosyaya geçer, fiş ortadan bölünmez.
  - Parça içi: 3 onaylı fiş · 9 satır · doluluk 3/50 fiş, 9/400 satır · düğme "Luca için indir".
- Parça 6, ad: Chrome eklentisi. Metin: Açık Fiş Detayı ekranına satırları yazar. Kaydet'e siz basarsınız.
  - Parça içi: "3 satır Fiş Detayı'na yazıldı." · "Kaydet'e basmadan önce satırları kontrol edin."

**features**
- h2: Sizin hesap planınız
- Not 1, Kategoriden gider hesabı: Yemek ve ağırlama 770.08'e, akaryakıt 770.01'e yazılır. Kodları kendi planınıza göre değiştirin.
- Not 2, Orandan KDV hesabı: %1, %10 ve %20 için ayrı 191 hesabı. Çok oranlı fişte her oran kendi satırını açar.
- Not 3, Ödemeden alacak hesabı: Nakit Kasa'ya, kart Ortaklara Borçlar'a. Fiş bazında tek seçimle değişir.
- Not 4, Belge türü: Büronuzun Luca'daki BT kodu neyse o. Varsayılan ÖK.
- Not 5, Kod biçimi: 770.08 gibi üç hane ve noktalı alt hesaplar kabul edilir. Hatalı kod kaydedilmez.
- Not 6, Yalnız yeni fişler: Kural değişikliği kayıtlı satırları değiştirmez, sonraki fişlere uygulanır.

**list**
- h2: Luca'ya üç yol
- Grup "Excel veri aktarımı": Onaylı fişler tek dosyada / .xlsx · Bir dosyada en fazla / 50 fiş, 400 satır · Evrak No metin hücresi / 0047 korunur · İndirilen fişler / Aktarıldı olur
- Grup "Pano": Tek fişin satırları / Fiş Detayı sırasında · Kolonlar / Hesap, Evrak No, Tarih, Açıklama, Borç, Alacak, BT
- Grup "Chrome eklentisi": Açık Fiş Detayı ekranını doldurur / Kaydet sizde · Luca seçicileri / Deneysel
- Grup "Luca'da": Muhasebe, Fiş İşlemleri / Excel veri aktarımı · Dosya, doğrulama kodu / Yükle · Önizleme / Fiş Kes
- Resim altyazısı: Elle tutulmuş bir yevmiye defteri sayfası, Eylül 1833.

**Dinlenme resmi**
- Altyazı: Antalya, Kaleiçi limanı.
- Açıklama cümlesi (yalnız kullanıcı onaylarsa, `<p>`, en çok 25 sözcük): Accountie, Antalya'da ayın sonunda fişleri poşetle teslim alan bir muhasebe bürosunun işinden çıktı. **ONAY GEREKİR.** Onay yoksa yalnız altyazı kalır.

**faq**
- h2 (listenin ilk satırı, `--muted`, 18px): Sık sorulanlar
- S: Fiş fotoğrafı saklanıyor mu? C: Hayır. Fotoğraf okunduktan sonra sunucuda tutulmaz. Kontrol ekranındaki görüntü yalnız sizin cihazınızda durur.
- S: Luca'ya kendisi mi kaydediyor? C: Hayır. Excel dosyasını Luca'ya siz yüklersiniz; eklenti satırları doldurur, Kaydet'e basmaz. Onayınız olmadan kayıt oluşmaz.
- S: Hangi belgeler okunuyor? C: Yazar kasa (ÖKC) fişleri. Fatura, e-Arşiv ve gider pusulası şimdilik okunmuyor.
- S: KDV'yi yeniden hesaplıyor mu? C: Hayır. Matrah, toplamdan fişte yazan KDV düşülerek bulunur. KDV okunamazsa orandan hesaplanır ve satıra not düşülür.
- S: Okuma yanlış çıkarsa? C: Okunamayan alan boş kalır ve işaretlenir. Toplam ile KDV tutmazsa fiş bir kez daha okunur, yine tutmazsa uyarıyla size gelir.
- S: Hesap kodlarını kim seçiyor? C: Siz. Yapay zeka yalnız kategori önerir; hesap kodu kendi kural tablonuzdan gelir.
- S: Telefonda uygulama gibi açılır mı? C: Evet. Ana ekrana eklediğinizde ayrı bir uygulama gibi açılır, Fiş çek tek dokunuştur.

**cta**
- Kapanış satırı (iki satır): İlk fişinizi / çekin
- Cümle: Hesabı açtığınızda varsayılan hesap planı kural tablonuza kopyalanır. İlk fişi telefonla çekip kontrol ekranında görürsünüz.
- Pencere başlığı: Hesap oluşturun · alan etiketi: E-posta · örnek değer: muhasebe@buro.com.tr · düğme: Hesap oluştur · altında: Hesabınız var mı? Giriş yapın
- Davranış: düğme `/kayit`'e gider; yazılan e-posta URL'ye yazılmaz, `sessionStorage` ile taşınıp kayıt formuna doldurulur. Blueprint'in iki seçenekli segmented kontrolü düşürüldü: gerçek kayıt akışında karşılığı yok.

**footer**
- Sol: Fişten Luca'ya yevmiye kaydı
- Orta: Giriş yap · Hesap oluştur · Sık sorulanlar
- Sağ: 2026 · Görsel kaynakları (aynı sayfada küçük kredi listesine açılır, `<details>`)

### 3.6 Başlık aritmetiği (copy.md §2)

| Başlık | Karakter | Yer ve boy | Satır |
|---|---|---|---|
| Fişten Luca'ya yevmiye kaydı | 28 | masaüstü 32px, ~600px; telefon 6.4vw ≈ 25px, 358px | 1 / 2 |
| İlk fişinizi çekin | 18 | masaüstü en çok 88px, 1-5 kolon ≈ 560px (12 karakter/satır sığar); telefon 13vw | 2 / 2 |
| Sizin hesap planınız | 20 | 1-4 kolon ≈ 400px, 40px | 1-2 |
| Bir fişin yolu, Luca'ya üç yol, Kontrol ekranından Luca'ya | 14-26 | `--step-head` | 1-2 |

`--step-display` bu yüzden `clamp(3.5rem, 6vw, 5.5rem)` (56-88px); kâğıdın 112px üst sınırı Türkçe satıra sığmadığı için düşürüldü.

## 4. Görsel planı

### 4.1 Öncelik

1. Ürünün kendi arayüz parçaları, HTML, `data-ui` köklü (sayfanın ana resimleri; software için resim tabanına sayılır): fiş tezgâhı, dört durum kartı, altı showcase parçası, hesap kuralları paneli, kayıt penceresi.
2. Açık koleksiyonlardan, ticari kullanıma uygun lisanslı, kredili gerçek resimler (aşağıda).
3. Kodla çizilen öğeler: termal fiş şeridi, işaret (monogram), dört panel ikonu, durum noktaları.
4. Yasak: fiş fotoğrafı (gerçek ya da açık koleksiyondan), kart fişi, VKN veya kişi adı içeren belge görüntüsü, stok "laptoplu insan" fotoğrafı, marka logosu taşıyan nesne fotoğrafı.

### 4.2 Arama sorguları (assets.mjs ile çalıştırıldı)

`ledger book handwritten accounts`, `accounting ledger`, `cash register receipt paper roll` (sonuç yok), `cash register`, `adding machine`, `carbon paper`, `Antalya Kaleici old town`, `Antalya harbour`; video: `Antalya`, `adding machine`.
Openverse bazı sorgularda 30 sn içinde cevap vermedi; Wikimedia Commons sonuçları kullanıldı.

### 4.3 Seçilenler (bakıldı, lisans ticari kullanıma uygun)

| Kullanım | Dosya (aday) | Başlık, yaratıcı | Lisans | Kaynak |
|---|---|---|---|---|
| Ana sayfa dinlenme resmi, 16:9 kırpım | `roman-harbour-of-antalya-2014-10-panoramio.jpg` | Roman Harbour of Antalya, rheins | CC BY 3.0, kredi zorunlu | https://commons.wikimedia.org/wiki/File:Roman_Harbour_of_Antalya_-_2014.10_-_panoramio_(1).jpg |
| Ana sayfa list bölümü, sağ yarı, dik | `pittsboro-merchant-business-ledger.jpg` | Pittsboro Merchant Business Ledger, 1833 | Kamu malı | https://commons.wikimedia.org/wiki/File:Pittsboro_Merchant_Business_Ledger_-_DPLA_-_4cbfce8f8f08c14f851ab74af046c082_(page_258).jpg |
| Giriş ve kayıt ekranları, sağ yarı tam kırpım (masaüstü) | `yevmiye-defteri-1833.jpg` (ana sayfadaki ile aynı) | Pittsboro Merchant Business Ledger, 1833 | Kamu malı | yukarıdaki satır. Önceki dekupe `ledger.png` tek görsel dili bozduğu için kaldırıldı (tur 1 jüri). |
| Yedek: list resmi veya 404 | `camp-chesterfield-general-account-ledger-1910-1916.jpg` | Camp Chesterfield general account ledger, 1910-1916 | Kamu malı | https://commons.wikimedia.org/wiki/File:Camp_Chesterfield_general_account_ledger,_1910-1916_-_DPLA_-_206e8c73ecb9419118717c75562a2497_(page_173).jpg |
| Yedek: dinlenme resmi | `antalya-kaleici.jpg` | Antalya Kaleiçi, Qubated | CC BY-SA 4.0 (değiştirilmeden kullanılır) | https://commons.wikimedia.org/wiki/File:Antalya_Kalei%C3%A7i.jpg |
| İsteğe bağlı hareketli resim (henüz izlenmedi, kullanmadan önce izlenmeli) | `commons:56935978` | Keystrokes in a vintage mechanical calculator | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Keystrokes_in_a_vintage_mechanical_calculator.webm |

Reddedilenler: Remington hesap makinesi kutusu (marka logosu baskın, kırmızı-turuncu palete aykırı), Sırbistan yazar kasası (müze kalabalığı, Kiril etiketler), "Mekan Müdavim" Kaleiçi fotoğrafı (bir işletmenin tabelası ön planda), tüm fiş fotoğrafları (gizli veri riski).

Adaylar şimdi yalnız `.taste-skill/adaylar/` altında (gitignore'da, repoya girmez). Kredileri `.taste-skill/adaylar/credits.json`'da.

### 4.4 Uygulama kuralları

- İndirme: `node "<skill>/scripts/assets.mjs" --get commons:59460712,commons:88032566,commons:65605464 --to public/gorseller --width 1920`, ardından `--credits --to public/gorseller` ile kredi satırları. `public/gorseller/credits.json` commit edilir.
- Hepsi `next/image` ile, gerçek `width`/`height`, `sizes`, kare köşe, aynı işlem (renk düzeltmesi yok; CC BY-SA olan değiştirilmez). Hero'da fotoğraf yok, LCP h1 ve tezgâh metnidir; diğer resimler `loading="lazy"`.
- CSP değişmez: resimler `self`, font `next/font` ile kendinden barındırılır (`font-src 'self'` yeter). Video kullanılırsa `public/` altından, `muted loop playsinline`, poster kare ile; `prefers-reduced-motion: reduce` altında oynamaz.
- Altyazı resmin ne olduğunu söyler; resimler asla Accountie'nin ürünü, müşterisi ya da ofisi gibi sunulmaz. Kredi satırları footer'daki "Görsel kaynakları" içinde.
- Alt metinler Türkçe ve ne gösterdiğini söyler: "Antalya Kaleiçi limanı, tekneler ve surlar, yukarıdan", "Elle tutulmuş 1833 tarihli yevmiye defteri sayfası", "Açık duran eski bir hesap defteri".

## 5. Panel (uygulama ekranları)

### 5.1 Stil seçimi

Komut (bölüm 12): `draw.mjs --app --kind finance --screens list,detail,settings --keep palette,type --options 3`. Kind'a ve açık temaya uyan iki stil geldi:

| Stil | Karar |
|---|---|
| **`achromatic-ledger`** | **Seçildi.** Muhasebeci masaüstünde uzun oturumla rakam kontrol eder; kabukta renk yok, rakamlar mürekkepte, tek renk ana veri öğesinde. Adı ve hareketi ürünün kendi defter dünyası. Mavi palet kuralıyla birebir: tek veri rengi defter mavisi. |
| `pastel-consumer` | Hayır. Pastel kategori karoları ve büyük radius tüketici cüzdanı içindir; muhasebe satırını oyuncaklaştırır. |

Stilin hareketi (korunur): kabukta marka rengi yok. Birincil eylem neredeyse siyah dolgu (koyu temada ters: açık dolgu, koyu yazı); ikincil gri. Tek veri rengi ana veri öğesinde. Başka renk yalnız durum ve değişen rakamda. Renkli piksel payı yaklaşık %1, en çok %3.

### 5.2 Kabuk: icon rail

- 56px dar ray, sayfa zemininde, sağda 1px `--border`. En üstte Accountie işareti (monogram) `/panel`'e gider.
- Öğeler: Fişler, Kurallar. Altta (yaklaşık 200px boşluk sonrası): tema seçici, hesap (e-posta tooltip'te değil, menüde), Çıkış.
- İkonlar 16px outline, 1.5px çizgi, `--muted`; özel çizilir (Lucide değil, dört ikon: fiş, tablo, güneş/ay, kapı). Her birinin `aria-label`'ı ve tooltip'i var. Aktif öğe yalnız renk ve 2% ton bandıyla, renkli pill yok.
- Kapsam satırı: sayfa başlığı satırının üstünde 12px `--muted`: kullanıcının e-postası değil, "Fiş listesi", "Fiş 0047" gibi kırıntı.
- Telefon: ray alttaki bara dönüşür: Fişler, Fiş çek (ortada birincil), Kurallar, Hesap; kısa etiketli, 56px + `env(safe-area-inset-bottom)`.
- Tablet (641-1100): ray kalır, tablolar 4-5 kolon, ikincil alanlar alt satırda.

### 5.3 Yüz ve imza

- **Yüz (seçildi):** defter için mavi-gri zemin `#f2f4f7` (koyuda `#0e1114`), kartlar beyaz; tek veri rengi defter mavisi Luca'ya gidecek rakamda. Kural her ekranda aynı ve ana sayfadakiyle aynı: **fişten okunan değer mürekkep veya gri, Luca'ya giden değer mavi.**
- **İmza öğe 1, fiş izi (kontrol ekranı):** bir yevmiye satırı hover veya focus olunca soldaki "Fişten okunan" kutusunda o satırın kaynağı işaretlenir: 770.08 için `Matrah 7.931,82 = 8.725,00 - 793,18`, 191.03.10 için `KDV %10 793,18`, 331.01 için `Toplam 8.725,00 · Kart`. İşaret `--accent-soft` zemin ve 2px `--accent` sol kenar değil, tam satır tonu (renkli kenar kartı yasak). Klavyeyle de çalışır.
- **İmza öğe 2, Luca dosyası doluluğu (liste):** onaylı ve aktarılmamış fişler için iki ince iz: `3 / 50 fiş`, `9 / 400 satır`. Dolu kısım `--accent`, iz `--rule`, iki ucu etiketli, gerçek oran. 50'yi aşınca "2 dosya" yazar.

### 5.4 Ekranlar

Hepsinde bir h1 (24px, 600), altında tek satırlık bulgu cümlesi (14-16px `--muted`), sağda yalnız gerçek eylemler. Sayılar satırlardan hesaplanır, ayrı yazılmaz.

**Fiş listesi, `/panel`**
- Soru: Hangi fişler bekliyor, Luca'ya ne gidecek?
- Bulgu (örnek, fikstürden hesaplanır): "2 taslak kontrol bekliyor. 1 onaylı fiş Luca dosyasına hazır."
- Ana iş: Fiş çek (birincil, başlık satırında), Galeriden seç (ikincil).
- Bloklar: alt çizgili sekmeler (Tümü 4, Taslak 2, Onaylandı 1, Aktarıldı 1; sayılar görünümden; URL `?durum=`), fiş tablosu, sağda 384px "Luca dosyası" bloğu (doluluk izi, "Luca için indir" ikincil, Luca'daki üç adım `<ol>`, eklenti `<details>`, telefona ekle notu).
- Tablo: Satıcı (en geniş, tek satır kırpılır, tam ad `title`'da), Evrak No (metin), Tarih (gg.aa.yyyy, Luca ile aynı), Hesap (gider kodu), Toplam (sağa, tabular, "TL" gri ek), Durum (soluk pill: Taslak nötr, Onaylandı mavi soluk, Aktarıldı yeşil soluk). Uyarı varsa satırın ikinci satırında `--muted` "2 uyarı". Zebra yok, başlık bandı yok, 12px gri başlık.
- Boş durum: çerçeve ve başlık kalır; tablo yerinde tek cümle "Henüz fiş yok. İlk fişi çekin." ve Fiş çek.
- Telefon: iki satırlı satırlar (satıcı ve toplam; "0047 · 05.09.2026 · Taslak"), Luca dosyası bloğu listenin üstünde tek satırlık özet ("1 fiş hazır · İndir").

**Fiş kontrol, `/panel/fis/[id]`**
- Soru: Bu fişin satırları doğru ve dengede mi?
- Bulgu: "Borç 8.725,00, alacak 8.725,00. Onaya hazır." ya da "Fark 27,00: borç ile alacak tutmuyor."
- Ana iş: Onayla (birincil). Dengesizken devre dışı ve nedeni yanında yazılı, okunur kontrastta.
- Masaüstü: sol sabit 360px sütun: fotoğraf (yalnız cihazda, yoksa "Fotoğraf bu cihazda değil" tek cümle) ve "Fişten okunan" anahtar-değer kutusu. Sağ: satır tablosu (Hesap kodu, Hesap adı, Açıklama, Borç, Alacak, Evrak No, Evrak Tarihi, BT; düzenlenebilir), alacak hesabı seçimi (beş seçenek), denge şeridi (tek kart, 1px bölücülerle: Borç toplamı, Alacak toplamı, 191 toplamı; en büyük rakam denge/fark, 30px).
- Uyarılar satırın yanında soluk uyarı pill'i ve metin; onayı engellemez.
- İkincil: Kopyala (Luca Fiş Detayı sırası), Taslağa al. Sil en sonda, kendi bölümünde, negatif renkte çerçeveli düğme; onay penceresi nesneyi adlandırır: "0047 numaralı fişi silmek istiyor musunuz?"
- Kaydedilmemiş değişiklik varken çıkışta uyarı.
- Telefon: fotoğraf üstte katlanabilir, satırlar iki satırlı, altta yapışkan bar (Borç, Alacak, Onayla), odaklanan alan barın altında kalmaz.

**Hesap kuralları, `/panel/kurallar`**
- Soru: Fişler hangi hesaplara yazılıyor?
- Kâğıttaki "Settings in two columns": ortalı 1152px; her bölüm bir satır: 450px etiket kolonu (16/500 başlık, 14px açıklama) ve 700px panel (`--raised`, radius 8, dolgu 16, çizgi ve gölge yok). Bölümler arası 1px çizgi, üst ve alt 32px.
- Bölümler: Gider hesapları (13 kategori), KDV hesapları (%1, %10, %20), Ödeme ve alacak (Nakit, Kart, Diğer), Belge türü (BT), Chrome eklentisi (bağlantı anahtarı paneli), Görünüm (tema: Sistem, Açık, Koyu).
- Etiket kolonu boş kalmaz: "ayarın ürettiği" önizleme: "Yemek ve ağırlama → 770.08 Yeme-İçme ve Ağırlama Giderleri, Borç 7.931,82".
- Kayıt modeli: panel başına bir Kaydet, panelin sağ altında; "Kaydedildi" durumu `aria-live`. Hesap kodu biçim hatası alanın yanında, `aria-describedby` ile.
- Yıkıcı eylem: "Varsayılan kurallara dön" en sonda, kendi bölümünde, onay pencereli.

**Giriş `/giris` ve üye ol `/kayit`** (app-screens §8)
- İki ayrı sayfa, ayrı h1: "Giriş yapın" / "Hesap oluşturun". Alt satır: "Fiş fotoğrafından Luca yevmiye kaydı hazırlayın."
- Masaüstü: sol yarıda form sütunu (en çok 400px, dikey ortalı), sağ yarı `--stage` tonunda açık duran eski hesap defteri resmi ve küçük altyazı. Telefon: yalnız form, resim yok.
- Üstte işaret ve "Accountie" `/`'a döner; sağ üstte tema seçici.
- Alanlar: etiket üstte (14/500, 8px), 40px alan (telefonda 16px yazı, iOS yakınlaştırmasın), `autocomplete` (`email`, `current-password`, `new-password`, `name`), e-postada `spellCheck={false}`, `type="email"`. Şifre kuralı alanın altında görünür: "En az 8 karakter" ve `aria-describedby`. Şifre göster/gizle düğmesi `aria-label`'lı.
- Hata: alanın yanında ya da formun üstünde `role="alert"`, ilk hatalı alana odak. Mevcut hata metinleri korunur.
- Turnstile widget'ı korunur. Düğme "Giriş yap" / "Hesap oluştur", bekleme "Giriş yapılıyor…" / "Hesap oluşturuluyor…". İstek başlayana kadar etkin.
- Geçiş: "Hesabınız yok mu? Hesap oluşturun" (`/kayit`), "Hesabınız var mı? Giriş yapın" (`/giris`).
- Giriş sonrası `/panel`. Dönüş yolu varsa yalnız `/panel` ile başlayan iç yol kabul edilir (açık yönlendirme yok).

### 5.5 Rota notu (uygulayan geliştirici için)

`/` herkese açık, kullanıcı verisi göstermez, oturum okumaz (statik). Panel: `/panel`, `/panel/fis/[id]`, `/panel/kurallar`; her biri sunucuda oturum ister. Proxy matcher `/`, `/giris`, `/kayit` ve görsel/font yollarını dışarıda bırakır; `/panel` ve `/api/*` korunur. Eski `/fis/[id]` ve `/kurallar` yeni yola kalıcı yönlendirilir (yer imleri ve ana ekrana eklenmiş PWA). Manifest `start_url` `/panel`. Önizleme: `/onizleme/panel`, `/onizleme/panel/fis/[id]`, `/onizleme/panel/kurallar`, `/onizleme/giris`, `/onizleme/kayit` fikstürlerle. Eklentinin uygulama içi yolları ve testler güncellenir.

## 6. Ortak tokenlar

Tek dosyada (`globals.css` `:root`), her şey token'a başvurur. Açık tema varsayılan; koyu tema hem sistem tercihiyle hem elle.

```
:root                                   → açık
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) → koyu }
:root[data-theme="dark"]                → koyu
```

### 6.1 Renk rolleri

| Rol | Açık | Koyu | Görev |
|---|---|---|---|
| `--ground` | `#f2f4f7` | `#0e1114` | Sayfa ve panel zemini (yüz) |
| `--surface` | `#ffffff` | `#161a1f` | Kart, tablo, form |
| `--raised` | `#f7f8fa` | `#1d2228` | Ayar paneli, anahtar-değer kutusu |
| `--stage` | `#e4e9f0` | `#1b2027` | Hero sağ yarısı, giriş sahnesi |
| `--active` | `#e8ebf0` | `#232931` | Seçili nav, seçili liste satırı |
| `--border` | `#e3e7ec` | `#262c34` | Kart ve panel kenarı (yalnız app ve `data-ui` içinde) |
| `--rule` | `#eef1f4` | `#1f242b` | Tablo satır çizgisi |
| `--control` | `#7d8896` | `#66717e` | Form alanı kenarı (3:1 üstü, WCAG 1.4.11) |
| `--ink` | `#141a22` | `#eef1f4` | Metin, rakam |
| `--muted` | `#4f5a67` | `#a9b2bd` | İkincil metin |
| `--faint` | `#5f6a77` | `#949eaa` | Meta, placeholder (yine 4.5:1) |
| `--thermal-ink` | `#4f5a67` | `#a9b2bd` | Fiş şeridindeki okunan rakamlar |
| `--accent` | `#2b5a9a` | `#8db0e0` | Defter mavisi: Luca'ya giden rakam, ana sayfa birincil düğme, odak |
| `--on-accent` | `#ffffff` | `#0e1114` | Vurgu dolgusu üstündeki yazı |
| `--accent-soft` | `#e4ecf6` | `#1d2a3a` | Fiş izi işareti, seçili veri |
| `--accent-field` | `#2b5a9a` | `#23406a` | CTA alanı ve 4. how-it-works alanı (üstünde `#ffffff` / `#eef1f4`) |
| `--primary` | `#161c24` | `#eef1f4` | Panel birincil düğme dolgusu |
| `--on-primary` | `#ffffff` | `#0e1114` | |
| `--secondary` | `#e5e8ec` | `#232931` | Panel ikincil düğme |
| `--deep` | `#111821` | `#0a0d10` | Showcase koyu alanı (iki temada koyu) |
| `--ink-on-deep` / `--muted-on-deep` | `#eef1f4` / `#a9b2bd` | aynı | |
| `--positive` | `#1f6b45` | `#6fcf9b` | Aktarıldı, dengede |
| `--negative` | `#b3261e` | `#f0948c` | Fark, hata |
| `--warn-ink` / `--warn-bg` | `#8a4b00` / `#fdf3df` | `#e8c477` / `#2a2412` | Uyarı notları |
| `--focus` | `--accent` | `--accent` | 2px odak halkası, 2px offset |

how-it-works dört alanı (komşular açıklıkta açıkça farklı): açık `#e4e9f0`, `#d3dbe6`, `#b9c7d9`, `--accent-field`; koyu `#161a1f`, `#1d232b`, `#252d38`, `--accent-field`.

Ölçülen kontrast (WCAG): açık temada `--ink` zemin üstünde 15.9, `--muted` zemin üstünde 6.4, `--faint` beyaz üstünde 5.5 ve `--stage` üstünde 4.5, `--accent` beyaz üstünde 6.9 ve zemin üstünde 6.3, beyaz yazı vurgu dolgusunda 6.9, `--control` beyaz üstünde 3.6, `--positive` 6.5, `--negative` 6.5, uyarı çifti 6.2. Koyu temada `--ink` 16.7, `--muted` yüzey üstünde 8.2, `--faint` yüzey üstünde 6.4 ve `--stage` üstünde 6.0, `--accent` 7.8 ile 8.5, `--accent-field` üstünde açık yazı 9.2, `--control` yüzey üstünde 3.5, `--positive` 9.2, `--negative` 7.8, uyarı çifti 9.3. Yeni çift eklenirse aynı ölçüm yapılır.

Kurallar: degrade yok, cam yok, parlama yok; dinlenen öğede gölge yok (yalnız menü, pencere, tooltip). Koyu tema lacivert veya slate değil, düşük doygunlukta soğuk nötr. Mor/indigo yok, krem-terrakota yok. `color-scheme` her temada doğru; `theme-color` meta zeminle eşleşir (açık `#f2f4f7`, koyu `#0e1114`). Native `<select>` için açık `background-color` ve `color`.

### 6.2 Tema seçimi ve yanıp sönmeme

Koyu tokenlar `<html data-look>` değerine bağlıdır (tema betiği yazar; JS yoksa medya sorgusu çalışır). Sistem teması değişince betik renkleri ve geçiş kilidini aynı görevde değiştirir, böylece hiçbir karede renk geçişi başlamaz.

- Üç seçenek: Sistem (varsayılan), Açık, Koyu. Radiogroup, her seçenekte `aria-label`; ana sayfa ve giriş sağ üstte, panelde ray altında ve Kurallar > Görünüm'de.
- Seçim `localStorage` anahtarı `tema` (`light`/`dark`, sistem için anahtar silinir). Okuma ve yazma try/catch içinde.
- `<head>` içinde boyamadan önce çalışan tek satırlık satır içi script `data-theme`'i `<html>`'e yazar (CSP'de `script-src 'unsafe-inline'` zaten var). `<html suppressHydrationWarning>`. Sistem seçiliyken `matchMedia` değişimi izlenir.
- Tema değişiminde geçiş animasyonu yok (renk sıçraması kabul, yanıp sönme değil). Uygulama: değişimin olduğu kare boyunca `<html>` üstünde `tema-degisiyor` sınıfı her `transition`'ı kapatır; elle seçimde `applyTheme`, sistem teması değişince baş script'i koyar.

### 6.3 Yazı sistemi

- **Stack Sans Headline** 300: yalnız sayfadaki büyük başlıklar (`--step-head`, `--step-display`). Tracking -0.022em, leading 1.05.
- **Stack Sans Text** 400, 500, 600: gövde, arayüz, tüm rakamlar, panel başlıkları. `latin-ext` alt kümesi (ğ, ş, ı, İ). İki font da `next/font/google` ile kendinden barındırılır (font-data'da var). Monospace yok.
- `font-variant-numeric: tabular-nums` her tablo, toplam ve değişen rakamda; Stack Sans Text `tnum` özelliğini taşıyor (font dosyasında doğrulandı).
- Inter, Space Grotesk, Instrument Serif, Geist kullanılmaz. IBM Plex Sans kaldırılır.

Sayfa ölçeği (beş adım):

| Token | Değer | Kullanım |
|---|---|---|
| `--step-small` | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` (13-14) | Meta, değerler, footer, tezgâh okuması |
| `--step-body` | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` (17-19) | Gövde, destek cümlesi |
| `--step-lead` | `clamp(1.375rem, 1.2rem + 0.7vw, 2rem)` (22-32) | Hero h1 (500), how-it-works cümleleri, FAQ cevabı, showcase adı |
| `--step-head` | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` (32-64; features başlığında en çok 40) | Bölüm başlıkları |
| `--step-display` | `clamp(3.5rem, 6vw, 5.5rem)` (56-88) | Yalnız CTA kapanış satırı |

Panel ölçeği: 12 / 14 / 16 / 24 ve tek cevap rakamı 30. Ağırlık: 400 gövde, 500 etiket ve kart başlığı, 600 h1 ve para toplamları. Telefonda form alanı yazısı 16px. Hiçbir metin 11px altında değil; sayfada gövde 16px altında değil.

Başlıklar `text-wrap: balance`, gövde `text-wrap: pretty`. Büyük harf yalnız fişin kendi baskısında (içerik), etiketlerde yok.

### 6.4 Boşluk ölçeği

4px tabanı: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48, `--s8` 64, `--s9` 96, `--s10` 128, `--s11` 160. Başka değer yok.
- Sayfa: kenar 40 / 32 / 16 (masaüstü / tablet / telefon), bölüm arası `--s11` masaüstü, `--s9` telefon.
- Panel: tek boşluk değeri 16 (yatay ve dikey), kart dolgusu 20 yerine `--s5` 24, kanvas yan boşluğu 24-32, başlığa üst boşluk 32.
- Kontrol yüksekliği: panelde 32 (araç çubuğu) ve 40 (form), telefonda en az 44 dokunma alanı. Tablo satırı 44-48.

### 6.5 Radius

Bir kez karar verildi, iki modlu kuralın sıkı tarafı: panel ve kart 8px, kontrol ve düğme 6px, pill ve çip 4px, iç içe adım adım küçülür. Sayfa düğmeleri de 6px (ürünle aynı). Fotoğraflar kare köşe (0). Tam yuvarlak yalnız 16px renk noktaları ve FAQ noktaları.

### 6.6 Hareket tokenları

```
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.76, 0, 0.24, 1);
--ease-soft: cubic-bezier(0.33, 1, 0.68, 1);
--ease-exit: cubic-bezier(0.55, 0.055, 0.675, 0.19);
--t-press: 140ms; --t-hover: 180ms; --t-ui: 240ms; --t-reveal: 800ms; --t-open: 1200ms;
--stagger-line: 90ms; --stagger-item: 70ms;
```

Çatışma kararı: taste-skill adım 9 "her bölümün parçalarına giriş" ister; `INSTRUCTIONS.md` "her bölüme fade-in yok, içerik hemen görünür" der. `INSTRUCTIONS.md` kazanır. Hareket yalnız bir şey anlattığı yerde:

1. **İmza (sayfa):** maskelenmiş başlık, hero h1 satırı kendi taban çizgisinin arkasından yükselir (`--t-reveal`, `--ease-expo`); destek cümlesi ve düğme 420-480ms gecikmeyle 12px yükselir. Toplam 1.2 sn içinde biter; içerik ilk karede DOM'da, gizleme yalnız `html.js` altında.
2. **Tezgâh:** örnek değişince satırlar yeniden hesaplanır; değişen rakam "rolling figures" ile döner (her hane `--stagger-item` arayla), yeni satır `--t-ui` ile 8px yükselerek gelir, çıkan satır `--ease-exit` ile gider. Ekran okuyucu için gerçek değer metinde.
3. **how-it-works:** kart alana girince bir sonraki durumuna geçer (alanlar dolar, pill değişir): ilerlemeyi anlatır, süs değil. Bir kez.
4. **Showcase:** kaydırma `scroll-snap`; ortadaki parçanın opaklığı ve ölçeği kaydırmaya bağlı (`--ease-out`). Klavye ve düğmeyle de ilerler.
5. **Features:** not hover/focus'ta panelin geri kalanı %30'a iner (`--t-hover`).
6. **FAQ:** cevap paneli 150ms çapraz geçiş.
7. **Hareketli resim:** Antalya limanı kaydırmaya bağlı yavaş ölçek (1.08 → 1, `--ease-soft`, scroll timeline, çerçeve `overflow: clip`).
8. **Geri bildirim, her kontrolde:** basış `scale(0.98)` `--t-press`; hover zemin tonu değişimi `--t-hover` (yalnız solma değil); `:focus-visible` 2px `--focus` halka. `transition: all` yok, özellikler tek tek yazılır.
9. **Panel:** giriş animasyonu yok. Yalnız geri bildirim, menü ve pencere açılışı (`--t-ui`), satır gelişi, "Kaydedildi" durumu.

`prefers-reduced-motion: reduce`: tüm yol, ölçek ve kaydırma bağlı hareketler düşer, son durum gösterilir; opaklık ve renk değişimi kalır; video oynamaz. Yalnız `transform`, `opacity`, `clip-path` canlandırılır.

## 7. Arayüz parçaları için ortak kurallar (`data-ui`)

- Her parça panelin gerçek bileşenleriyle aynı token'ları kullanır; ana sayfadaki parça ile panel ekranı yan yana konunca aynı ürün görünür.
- Parçanın içinde 1px kenar, küçük radius, açık menüde gölge serbest; dışında house rules.
- Tarayıcı ya da laptop çerçevesi yok. Gri çubuklardan sahte panel yok (yükleniyor durumu gerçek boyutlu ve tek kart).
- Rakamlar `formatTrAmount` ile; para iki ondalık, binlik nokta, ondalık virgül. Tarih `gg.aa.yyyy` (Luca biçimi), Evrak No metin.

## 8. Lint ve inspect kapıları

Her teslimden önce, repo kökünde:

```
node "<skill>/scripts/lint.mjs" src/app/page.tsx src/components/home
node "<skill>/scripts/inspect.mjs" http://localhost:3100/ --out .taste-skill/inspect-home
node "<skill>/scripts/lint.mjs" --app src/components src/app/panel src/app/giris src/app/kayit
node "<skill>/scripts/inspect.mjs" --app http://localhost:3100/onizleme/panel --out .taste-skill/inspect-panel
node "<skill>/scripts/inspect.mjs" --app http://localhost:3100/onizleme/panel/fis/00000000-0000-4000-8000-000000000001 --out .taste-skill/inspect-fis
node "<skill>/scripts/inspect.mjs" --app http://localhost:3100/onizleme/panel/kurallar --out .taste-skill/inspect-kurallar
node "<skill>/scripts/inspect.mjs" --app http://localhost:3100/onizleme/giris --out .taste-skill/inspect-giris
```

- 0 FAIL zorunlu; her WARN ya düzeltilir ya tek cümleyle savunulur. Son ölçüm production build üzerinde ayrı portta (`next build` + `next start -p 3200`), sonra kapatılır.
- Her iki tema da ölçülür (koyu tema için tarayıcı `prefers-color-scheme: dark` emülasyonu veya `data-theme="dark"`).
- inspect'in listelediği bütün ekran görüntüleri (1440, 768, 390) açılıp `references/critique.md` biçiminde (sayfa) ve app-screens §2.7 yedi sorusuyla (panel) eleştiri yazılır. En kötü üç sorun düzeltilir, en çok üç tur.
- Önceki durum kaydı: `.taste-skill/before/` (mevcut `/onizleme`, 1 FAIL `font-not-dealt`, 1 WARN `numeric-align`: 11 sayısal hücrenin 7'si sola yaslı).

## 9. Jüri için ölçüt

Jüri bu belgeye göre puanlar, yalnız yasak listesine bakmaz:
1. Yön uygulanmış mı: hero iki tonlu ve tezgâh çalışıyor mu, bölümler bölüm 3.4 sırası ve geometrisinde mi, komşu bölümler farklı mı?
2. Fikir her bölümde mi: mavi = Luca'ya giden rakam kuralı ana sayfada ve panelde tutarlı mı?
3. Canlı öğe gerçek mi: üç örnek doğru satırlar ve denge veriyor mu, kopyala gerçekten panoya yazıyor mu, script yokken tablo var mı, klavyeyle kullanılıyor mu?
4. İki tema birinci sınıf mı: ikisinde de AA, yanıp sönme yok, seçim hatırlanıyor mu?
5. Gerçek resimler indirilmiş, kredili, doğru alt metinli mi; fiş fotoğrafı yok mu?
6. inspect ve lint çıktıları 0 FAIL mi, ekran görüntüleri açılıp eleştiri yazılmış mı?
7. Vercel Web Interface Guidelines (bölüm 11) maddeleri dosya:satır biçiminde kontrol edildi mi?

## 10. Kapsam dışı

Fiyat sayfası, müşteri yorumları, blog, çoklu dil, çok firma seçimi, onboarding turu, illüstrasyonlu boş durumlar, tema geçiş animasyonu.

## 11. Vercel Web Interface Guidelines kontrol listesi

Kaynak: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md (2026-11-03'te çekildi). Geliştirici her ekranı bununla gözden geçirir; jüri bulguları `dosya:satır - sorun` biçiminde yazar.

- **Erişilebilirlik:** yalnız ikonlu düğmede `aria-label` (ray, tema, şifre göster); her form kontrolünde `<label>`; eylem `<button>`, gezinme `<a>`/`<Link>`, `div onClick` yok; resimde `alt`, süs ikonunda `aria-hidden="true"`; kopyalandı, kaydedildi, doğrulama gibi eşzamansız durumlar `aria-live="polite"`; başlıklar sıralı; "İçeriğe atla" bağlantısı korunur; başlık çapalarında `scroll-margin-top`.
- **Odak:** her etkileşimli öğede görünür `:focus-visible` halka; `outline: none` yerine koymadan yok; bileşik kontrollerde `:focus-within`; yapışkan bar odaklanan alanı örtmez (`scroll-padding-bottom` korunur).
- **Formlar:** `autocomplete` ve anlamlı `name`; doğru `type` ve `inputmode` (tutar alanlarında `inputmode="decimal"`); yapıştırma engellenmez; e-posta ve kodlarda `spellCheck={false}`; gönder düğmesi istek başlayana kadar etkin; hatalar alanın yanında, ilk hataya odak; placeholder "…" ile biter ve örnek gösterir (ör. "770.08…"); auth dışı alanlarda `autocomplete="off"`; kaydedilmemiş değişiklikte çıkış uyarısı.
- **Animasyon:** `prefers-reduced-motion`; yalnız `transform`/`opacity`; `transition: all` yok; doğru `transform-origin`; SVG dönüşümleri `<g>` üzerinde `transform-box: fill-box`; animasyon kesilebilir; 5 sn üstü otomatik hareket varsa durdurma.
- **Tipografi:** "…" (üç nokta değil); Türkçe tırnak için tipografik tırnak; `10&nbsp;MB`, `8.725,00&nbsp;TL` gibi bölünmez boşluk; yükleniyor metinleri "…" ile biter; rakam kolonlarında `tabular-nums`; başlıklarda `text-wrap: balance`.
- **İçerik:** uzun satıcı unvanları kırpılır (`min-width: 0`, ellipsis, tam ad `title`); boş dizi ve boş metin için durum; kısa, orta ve çok uzun içerikle denenir.
- **Resimler:** `width`/`height` açık (CLS yok); ekran altı resimlerde `loading="lazy"`; ekran üstü kritik resimde `priority`.
- **Performans:** 50 üstü satırda `content-visibility: auto`; render içinde layout okuma yok; fontlar `next/font` ile önyüklenir ve `swap`.
- **Gezinme ve durum:** sekmeler ve filtreler URL'de (`?durum=`); bağlantılar gerçek `<a>`; yıkıcı eylemler onay penceresiyle.
- **Dokunma:** `touch-action: manipulation`; `-webkit-tap-highlight-color` bilinçli; menü ve sayfa panellerinde `overscroll-behavior: contain`; kaydırmalı showcase için düğme ve klavye alternatifi; mobilde `autoFocus` yok.
- **Güvenli alan ve yerleşim:** tam genişlik bölümlerde ve alt barda `env(safe-area-inset-*)`; yatay taşma yok; yerleşim flex/grid ile.
- **Koyu tema:** `color-scheme: dark`; `theme-color` meta zemine eşit; native `<select>` için açık renkler.
- **Yerel ayar:** tarih ve sayı biçimi `Intl` veya projenin `formatTrAmount`'u (Luca biçimi kasıtlı olarak `gg.aa.yyyy`); "Accountie", "Luca", hesap kodları `translate="no"`.
- **Hydration:** `value` olan input'ta `onChange` veya `defaultValue`; tarih render'ı sunucu/istemci farkına karşı korunur; `suppressHydrationWarning` yalnız `<html>` (tema) için.
- **Hover:** her düğme ve bağlantıda hover durumu; hover, active ve focus dinlenme durumundan daha belirgin.
- **Metin:** etken çatı; somut düğme metni ("Satırları kopyala", "Luca için indir", "Kuralları kaydet"); hata mesajı sonraki adımı söyler. Not: kılavuzun "Title Case" ve "ikinci tekil şahıs" maddeleri İngilizce içindir; Türkçede cümle düzeni ve "siz" hitabı kullanılır.
- **Yasaklar:** `user-scalable=no` / `maximum-scale=1` yok; `onPaste` engeli yok; boyutsuz resim yok; etiketsiz input yok.

## 12. Yön kâğıtlarını yeniden üretmek

```
node "<skill>/scripts/draw.mjs" --sector finance --brief "Muhasebeciler icin: yazar kasa fisinin fotografindan Luca yevmiye kaydi hazirlayan web uygulamasi; fis, KDV, Luca Fis Detayi satirlari" --sections how-it-works,showcase,features,list,faq,cta,footer --have product-ui --keep palette --direction product-performs
node "<skill>/scripts/draw.mjs" --app --kind finance --brief "Accountie: muhasebeci yazar kasa fislerini ceker, kontrol eder, onaylar ve Luca'ya Excel ile aktarir; fis listesi, fis kontrol ekrani, hesap kurallari" --screens list,detail,settings --keep palette,type --out .taste-skill/app --style achromatic-ledger
```

Seed'ler: sayfa 975044981, panel 1951193909. Kâğıt ile bu belge çelişirse bu belge geçerlidir (çelişkiler burada bilerek çözüldü: CTA boyutu, showcase başlığı, giriş animasyonları, segmented kontrolün düşürülmesi).

## 13. Tur 2 kararları (jüri tur 1 bulgularına göre; bölüm 3, 4 ve 6'daki eski satırların üstündedir)

Skill'ler yeniden çağrıldı: `taste-skill:design-taste-frontend` (SKILL.md "The run", critique.md, motion.md) ve `web-design-guidelines` (command.md yeniden çekildi).

**Ana sayfa**
- Hero h1 display boyutunda: Stack Sans Headline 300, `clamp(2.375rem, 1rem + 5.2vw, 5.5rem)` (telefonda 38px, 1440'ta 88px), iki satır, satırlar `display: block`; maskelenmiş başlık imzası bu büyük h1'de. Sol yarıda dikey ortalı; üst çubuk (marka, tema, 44px "Giriş yap" ikincil düğmesi) iki tonun üstünde tek satır. 480px altında tema seçici tek düğmeye (`ThemeCycle`) iner.
- Bütün bölüm h2'leri `.t-head` (`--step-head`, Headline 300); SSS başlığı dahil.
- how-it-works: dört alan subgrid ile aynı satırlarda (başlık, kart, cümle); `min-height` yok, yükseklik içerikten. İlk kart gri iskelet yerine fişin termal baskısını gösterir.
- Liman fotoğrafı ve dinlenme bölümü kaldırıldı. Yerine "Defterin kuralı aynı" galeri bölümü: 1869-1870 hesap defteri (büyük), toplama makinesi klibi (durdur/oynat düğmeli, MP4 + WebM), mekanik yazar kasa. Sayfada 4 gerçek resim ve klip.
- Showcase karuseli kaldırıldı: altı parça 12 kolonluk ızgarada aynı anda (7+5, 5+7, 6+6), her biri adı ve cümlesiyle. Parçalar sayfa temasını izler (zorla açık tema yok).
- Liste: sayfa kenarından başlar (1-6), 1833 sayfası 8-12'de büyük; noktalar tek mürekkep, ilk satıra hizalı; grup adları h3; "İlk aktarımı tek fişle deneyin" cümlesi.
- CTA penceresi başlıkla alt hizada, gölgesiz (ton farkı). Footer: açıklama, bağlantılar, açık kredi listesi ve tam genişlikte "Accountie".
- Hareket: her bölümde başlık, metin, parça `--r` adımıyla 80 ms arayla; resimler deklanşör (clip-path) ile açılır; telefonda yalnız yükselme (solma yok).
- Örnek fiş satıcısı uydurma ad ("ÖRNEK BALIK LOKANTASI"); Luca hesap adları sayfada `shownAccountName` ile yazım kuralına göre gösterilir, veri değişmez.
- Chrome eklentisi parçası "deneysel" adını taşır ve gerçek "Alan bulunamadı" uyarısını gösterir. SSS: fotoğrafın Anthropic'e (ABD) gittiği yazılır; "Ücretli mi?" sorusu eklendi.

**Koyu tema tokenları (değişen)**: `--deep` `#15253a` (showcase alanı, zeminden belirgin ayrı), how-it-works alanları `#1b2129`, `#262e38`, `#333d4a` (yaklaşık 7-8 L* adım).

**Giriş ve kayıt**: form ve marka aynı sol kenarda; h1 Headline 300, en çok 32px (app-screens başlık sınırı). Hatalar `useActionState` ile alanın altında (`aria-invalid`, `aria-describedby`), odak ilk hatalı alana; yazılan e-posta ve ad korunur. "Şifre tekrar" kaldırıldı (göster/gizle var). Birincil düğme defter mavisi, ana sayfadaki "Hesap oluştur" ile aynı. Önizlemeler `?tema=acik|koyu` alır.

**Panel (tur 2; bölüm 5'teki eski satırların üstündedir)**
- Mavi kuralı tek anlamlı: **Luca satırına yazılacak tutar** mavi (kontrol ekranında satır Borç/Alacak alanları ve toplamlar, kurallar önizlemesindeki tutar, listede matrah ve 191 toplamları). Hesap kodları, fiş toplamı, sayaç sayıları mürekkep.
- Ray 80px, etiketler ikonların altında kalıcı (hover tooltip yok, WCAG 1.4.13). Telefon alt çubuğu: Fişler, Fiş çek, Kurallar, Hesap. Hesap native `<dialog>` açar: e-posta, tema, Çıkış yap. Çıkış artık tek dokunuşla olmaz. Ray altındaki tema seçici Hesap'a taşındı (Kurallar > Görünüm de duruyor).
- Kontrol ekranı: Onayla engelliyken `aria-disabled` ile odaklanabilir; basınca ya da çubuktaki eylem düğmesine ("Evrak tarihini girin") basınca ilgili alana kaydırıp odaklanır. Başlıktaki bulgu da aynı düğmedir. Telefonda çubuk iki satır: neden, sonra Fişler (geri) ve Onayla. 900px altında satırlar iki satırlı kart. Durum pill'i h1'in yanında.
- Liste: sekmede "Onaylı"; "Gider hesaplarına göre" matrahı (KDV hariç) 8px izli tek ton mavi çubukla gösterir, altında 191 İndirilecek KDV toplamı. Boş durumda kartın içinde Fiş çek / Galeriden seç ve Luca'ya giden dört adım.
- Kurallar: panel `--surface` + 1px kenar, önizleme `--stage`; telefonda bir kural tek satır (kod 7rem + ad), alanlar 44px, değişen grubun Kaydet çubuğu yapışkan.

## 14. Kullanıcı referansı: nirene.vercel.app/tr (tur 3'ten itibaren; bölüm 13'ün üstündedir)

Kullanıcı kendi sitesini örnek verdi: https://nirene.vercel.app/tr. Kopyalanmaz. Üst menü, tema düğmesi ve çerez kutusunda **ilham alınır ve daha iyisi yapılır**. Accountie'nin tokenları (radius 6/8, defter mavisi, Stack Sans, gölge kuralı) geçerli kalır. Geliştirici sayfayı kendi açıp masaüstünde ve 390px'te bakmalı. Çerez kutusunda yalnız "Tercihler"e basılabilir; kabul ve ret düğmelerine basılmaz.

Nirene'de gözlenenler:
- **Menü çubuğu:** yapışkan (`top: 16px`), sayfa kenarından ayrık, ortalı, en çok yaklaşık 1150px, 56px yükseklik. Yüzey rengi, ince halka ve yumuşak gölge var. Solda marka, ortada metin bağlantıları (hover'da zemin tonu), sağda tema düğmesi, dil, "Giriş yap" ve tek vurgulu birincil düğme. İlk öğe "İçeriğe geç" atlama bağlantısı. 1280px altında bağlantılar hamburger menüye iner.
- **Tema düğmesi:** tek ikon düğmesi (ay/güneş), 40px. Zayıf yanı: `aria-label` yok.
- **Çerez kutusu:** `section aria-labelledby`, sağ altta 26rem kart (telefonda kenarlardan 8px). h2 "Çerez tercihleri", tek dürüst cümle ("yalnızca zorunlu çerezler... analitik veya reklam yok") ve Gizlilik bağlantısı. "Tümünü kabul et" ve "Tümünü reddet" eşit ağırlıkta, "Tercihler" tam genişlikte ikincil. Düğmeler en az 44px. Zayıf yanı: kutu ilk ekranda başlığın üstüne biniyor.

Accountie için:
1. **Üst çubuk (ana sayfa, giriş, kayıt):** yapışkan, ayrık tek satır. Panel radius 8px, `--surface` ve 1px kenar. Dinlenen öğede gölge yok kuralı geçerli; ayrımı yalnız ton ve kenar sağlar. Kaydırma başlayınca çubuk zeminin üstünde kalır. Bağlantılar sayfadaki gerçek bölümlere gider: Nasıl çalışır (`#path-title` bölümü), Kontrol ekranı (`#show-title`), SSS (`#sss`), sonra "Giriş yap" ve "Hesap oluştur" (vurgu). "İçeriğe geç" atlama bağlantısı ilk odak. 768px altında bağlantılar native `<dialog>` ya da `<details>` menüye iner: odak tuzağı, Esc ile kapanma, 44px satırlar. Çubuk hero'nun iki tonlu bölünmesini bozmamalı.
2. **Tema düğmesi:** çubukta tek düğme (`ThemeCycle`), her genişlikte, 40px, `aria-label` ile "Tema: Koyu. Değiştir" biçiminde. Nirene'den daha iyisi: her basış görünen temayı tersine çevirir (üç adımlı döngüde sistem açıkken ilk basış hiçbir şey değiştirmiyordu); hedef sistem tercihiyle aynıysa seçim silinir ve sayfa yine sistemi izler. İkon görünen temayı gösterir, tooltip yerine görünür etiket gerekmez çünkü `aria-label` ve `title` var. Üç seçenekli `ThemeSwitch` Hesap ve Kurallar > Görünüm'de kalır.
3. **Çerez kutusu:** Nirene'deki yapı, ama ilk ekranı kapatmadan. Masaüstünde sağ altta 26rem, telefonda altta tam genişlikte ve en çok ekranın üçte biri kadar. Başlık ve birincil düğme görünür kalmalı. Metin olgu olarak yazılır: Accountie yalnız oturum çerezi kullanır, tema tercihi tarayıcıda saklanır, analitik veya reklam yoktur. "Tamam" ile "Tercihler" verilir. Uydurma bir seçim yaratan kabul/ret ikilisi yok, çünkü reddedilecek çerez yok; bu bilinçli bir farktır. "Tercihler" küçük bir `<dialog>` açar: "Zorunlu (oturum)", kapatılamaz anahtar ve açıklama. Seçim `localStorage` `cerez-bildirimi` anahtarında, try/catch ile saklanır. Kutu panelde gösterilmez (orada zaten oturum var). Gizlilik bağlantısı `/gizlilik` adresine gider. Bu sayfa yoksa kısa ve olgusal bir sayfa eklenir: fiş fotoğrafı okunmak için Anthropic'e (ABD) gönderilir ve saklanmaz, EXIF silinir, yalnız çıkarılan satırlar ve onaylanan kayıtlar saklanır, hesap silme talebi için e-posta. Sayfa KVKK aydınlatma metni yerine geçmez ve bunu söyler.
4. **Jüri:** bu üç parçayı Nirene ile yan yana değerlendirir. "Aynı" olması artı puan değildir. Ölçüt, Nirene'den daha erişilebilir, daha dürüst ve Accountie'nin diline daha uygun olmasıdır.

## 15. Kullanıcı isteği: animasyon ve resim (tur 3'ten itibaren; bölüm 6.6 madde 9'un ve bölüm 13'ün üstündedir)

Kullanıcı açıkça istedi: animasyonlar ve resimler unutulmasın, **panele de animasyon** eklensin. Kurallar geçerli kalır: anlam taşıyan hareket, yalnız `transform`/`opacity`/`clip-path`, `transition: all` yok, `prefers-reduced-motion: reduce` altında son durum hemen gösterilir. Hareket tokenları (6.6) kullanılır. Kaydırmada her bölüme solarak girme yine yok.

**Ana sayfa**
- **Resimler:** sayfada en az 6 gerçek resim ya da klip, hepsi gerçekten yüklenmiş olmalı. Son çekimlerde bazı büyük kutular boş ve bulanık görünüyordu. Her resim `next/image` ile, boyutlu, `placeholder` rengi zemin tonunda. Boş ya da bulanık bir kutu jüride kritik bulgudur. Krediler footer'da.
- **Animasyonlar:**
  - **Hero örneği:** fiş türü veya ödeme değişince satırlar yeniden dizilir. Tutarlar sayarak değil, eski değerden yeniye kısa bir geçişle değişir. "Dengede" işareti denge kurulunca belirir.
  - **"Bir fişin yolu":** dört aşama, kullanıcı bölüme geldiğinde bir kez sırayla oynar: fiş basılır, satırlar okunur, Onaylandı damgası düşer, Excel dosyası iner.
  - **Diğerleri:** resimlerin deklanşörle açılışı ve klip korunur.

**Panel**
- **Fiş yükleme:** "Fiş çek" sonrası kartta fişin okunduğunu gösteren ilerleme: termal kâğıt şeridi aşağı akar, satırlar tek tek gelir. Sahte yüzde gösterilmez; aşamalar gerçek (yükleniyor, okunuyor, satırlar hazır).
- **Liste:** yeni fiş listenin başına yükselerek girer. Sekme değişince alt çizgi seçilen sekmeye kayar. Sekme sayaçları değişince rakam kısa bir geçişle yenilenir.
- **Kontrol ekranı:**
  - Borç ve alacak toplamları eşitlenince denge çubuğu ve "Dengede" işareti belirir.
  - Onayla'ya basınca durum pill'i Taslak'tan Onaylı'ya geçer ve kısa bir damga hareketi oynar.
  - Engelli Onayla'ya basınca ilgili alana kaydırılır ve alan bir kez vurgulanır.
- **Luca dosyası kartı:** fiş ve satır çubukları onaylanan fişle birlikte dolar. "Excel indir" sonrası fişler Aktarıldı sekmesine kayar.
- **Geçişler:** fiş listesinden kontrol ekranına React View Transitions ile geçilir (`vercel-react-view-transitions` skill'i). Fiş kartı, kontrol ekranının başlığına dönüşür. Desteklemeyen tarayıcıda anında geçiş olur.
- **Süreler:** arayüz geri bildirimi 120–200 ms, damga ve view transition en çok 320 ms. Muhasebeci gün boyu çalışır, hiçbir hareket işi bekletmez.

**Jüri:** hareket-gorsel jürisi bu listeyi madde madde kontrol eder: oynatır, `prefers-reduced-motion` ile tekrar dener, boş resim kutusu arar. Eksik madde puan düşürür.

## 16. Tur 3 kararları: ana sayfa, giriş ve kayıt (bölüm 14 ve 15'in uygulanışı)

- **Üst çubuk:** `components/site/SiteBar.tsx`, ana sayfa, giriş, kayıt, şifre ve gizlilik sayfalarında aynı. Yüksekliği olmayan yapışkan bir yuvaya oturur, bu yüzden hero'nun iki tonu ekranın üst kenarına kadar uzanır ve kaydırmada çubuk zeminin üstünde kalır. Giriş ve kayıtta "Hesap oluştur" ikincildir; o ekranda tek vurgulu eylem formun düğmesidir. 768px altında bağlantılar `<details>` menüye iner (Esc ve dışarı tıklama kapatır). Ana sayfadaki telefon çubuğu (`.mbar`) kaldırıldı, işini bu çubuk görür.
- **Çerez bildirimi:** `components/site/CookieNote.tsx`. Kaydırma ilk ekranın yarısını geçince kenara çekilir, en üste dönünce yine görünür; yalnız "Tamam" ya da tercihler penceresinde "Kaydet ve kapat" onu kalıcı kapatır. Böylece hiçbir başlığın üstünde durmaz (inspect.mjs covered-text). Panelde yok. 1024px ve üstünde alçak bir şerittir (metin solda, Tamam ve Tercihler sağda alt alta); 26rem'lik kart giriş ekranında ürün parçasının açıklamasını örtüyordu.
- **Tema düğmesi:** `aria-label` ve `title` hem şimdiki temayı hem basınca ne olacağını söyler ("Tema: Açık. Koyu temaya geç"). Yapışkan çubuk yüzünden `html:has(.site-dock)` 88px `scroll-padding-top` alır; klavye odağı çubuğun altında kalmaz. 400px altında marka adı yalnız çubukta "Hesap oluştur" varken gizlenir (kayıtta görünür).
- **Görseller:** Amerikan defterleri ve yazar kasa kaldırıldı. Sayfada 5 fotoğraf ve 1 klip: Kapalıçarşı (Sébah & Joaillier, kamu malı), toplama makinesi klibi, Osmanlı Bankası kasa dairesindeki defterler ve 1863 imtiyaz belgesi (SALT Araştırma), tezgâhta para çekmecesi ve ödeme cihazı, defterdarlık dairesi gravürü (Lespinasse). Galeri iki satır: üstte Kapalıçarşı ve klip aynı yükseklikte, altta üç resim aynı 4:3 oranında. Kamu malı olanlar koyu temada `brightness(0.82)`; CC BY-SA olanlara işlem uygulanmaz.
- **Giriş ve kayıt:** fotoğraf yerine ürünün kendi parçası (termal fiş ve ondan çıkan üç Luca satırı, `Thermal.tsx` ortak). 900px altında form ortalanır, parça formun altında bir bant olur. Şerit yukarıdan basılır, satırlar sırayla gelir; reduced-motion'da son durum.
- **Şifre yenileme:** `/giris/sifre` (e-posta, Turnstile, `resetIp` ve `resetEmail` sınırları, hesap olsun olmasın aynı yanıt) ve `/giris/sifre/yeni?token=` (yeni şifre, sonra `/giris?mesaj=sifre-yeni`). Neon Auth projesinde site alan adı güvenilir alan adı olarak tanımlı olmalı; yoksa `redirectTo` reddedilir.
- **Derin bağlantı:** proxy `/giris?sonra=/panel/...` ekler; giriş eylemi yalnız `safeNextPath` ile doğrulanan panel yoluna döner.
- **Gizlilik:** `/gizlilik` olgusal bir sayfa; KVKK aydınlatma metninin yerine geçmediğini söyler. Veri sorumlusunun unvanı ve iletişim adresi ürün sahibinden gelmeli (sayfada bu yazılı).

## 17. Tur 3 kararları: panel

- **Hesap adları:** varsayılan adlar düz Türkçe yazılır (`%10 İndirilecek KDV`, `Yeme-İçme ve Ağırlama Giderleri`). Luca'ya giden Excel ve pano yalnız hesap kodunu taşır, ad yalnız insan içindir; bu yüzden Luca'nın kendi yazımını ("% 10 Lı İndirilecek Kdv") taklit etmenin karşılığı yoktu. Ana sayfa ve panel aynı adı gösterir. Eski yazımla kaydedilmiş kural tabloları kullanıcı değiştirene kadar öyle kalır.
- **Hesap kuralları:** hesap adı çerçevesiz alan (üzerine gelince ve odakta çerçeve), hesap kodu tek çerçeveli alan. Etiket kolonundaki örnek, örnek fiş 0047'nin üç Luca satırıdır; bölümün satırı açık tonla işaretli ve imleç ya da odak hangi kuraldaysa o kuralın kodu ve tutarıyla değişir. Kolon başlıkları cümle düzeninde. Kaydedilmemiş değişiklikte sekme kapatma ve uygulama içi bağlantı uyarır (`useLeaveGuard`, kontrol ekranıyla ortak). Telefonda kural adı ve kod bir satırda, hesap adı tam genişlikte altında.
- **Kontrol ekranı onay çubuğu:** telefonda `position: fixed` (yapışkan çubuk kendi kolonunun üstüne çıkamadığı için kısa telefonda ilk ekranın altında kalıyordu); masaüstünde yapışkan, `--stage` tonunda ve `--control` kenarlı, gölgesiz.
- **Liste:** telefondaki ikinci özet cümlesi bulgu cümlesine katıldı. "Gider hesaplarına göre" kapsamını yazar (açık sekme: "Tüm fişler, matrah"). Dolu liste kartı yan kolonun dibine kadar uzar; boş liste kendi boyunda kalır. Boş durumda telefonda dolu "Fiş çek" ve altında metin bağlantısı "Galeriden seç". Yükleniyor durumu gerçek altı kolonlu tabloyu ve başlık düğmelerini kullanır.
- **Hareket (bölüm 15'in panel kısmı):** fiş okunurken kartta kâğıt şeridi aşağı akar ve gerçek aşamalar sırayla gelir (Fotoğraf hazırlanıyor, Fiş okunuyor, Satırlar hazır; yüzde yok). Sekme alt çizgisi seçilen sekmeye kayar (paylaşılan view transition, 200 ms); yükleme ve Luca indirmesinden sonra sekme sayıları 140/180 ms ile yenilenir. Yeni fişler listenin başına yükselir (240 ms), indirilen fişler Aktarıldı sekmesine doğru çıkar (200 ms). Luca dosyası çubukları bu sekmenin son gördüğü dolulukdan yenisine dolar (320 ms, `sessionStorage`). Liste satırındaki satıcı adı kontrol ekranının başlığına dönüşür (280 ms); bunun için kontrol ekranında yükleniyor iskeleti yok, satırın altında açılırken ince bir çubuk akar. Borç alacağa eşitlenince denge hücresinde yeşil çizgi ve onay işareti belirir (200 ms geçiş, ilk yüklemede oynamaz). Onaylanınca durum pill'i damga gibi iner (320 ms). Engelli Onayla ilgili alana kaydırır, odaklar ve alanı bir kez büyütüp bırakır (280 ms). `prefers-reduced-motion: reduce` altında hepsi son durumda görünür.

## 18. Tur 5 kararları: ana sayfa, giriş ve kayıt (bölüm 16'nın üstündedir)

- **Üst çubuk:** bölüm bağlantıları 960px altında menüye iner (tam satır yaklaşık 880px ister; 768'de SSS tema düğmesinin altına giriyordu). 640px altında çubukta ad, tema, Giriş yap ve menü kalır; "Hesap oluştur" hero'da ve menüde. Menüde artık Giriş yap değil Hesap oluştur var.
- **Canlı tezgâh:** baskı, satırların sırayla gelişi ve "Dengede" yalnız ilk boyamada oynar (`data-first`). Seçim değişince satırlar hesap kodu ve tutarla anahtarlanır, yalnız değişen satır 240 ms ile girer; şerit ve toplamlar 180 ms çapraz geçişle yeni değere geçer, ara değer gösterilmez. 640px altında fiş tam genişlikte, satırlar altında, seçiciler fişin üstünde (kaynak sırası görsel sırayla aynı); hiçbir metin 12px'in altına inmez. Fiş satırı üç noktayla kesilmez, kalem adı gerekirse alt satıra kırılır, tutar kolonu her zaman tam; örnek kalem adları kısaltıldı.
- **Çerez bildirimi:** her genişlikte alçak bir şerit (görünmez başlık, tek cümle, yan yana Tamam ve Tercihler); ağır gölge yok, 1px kenar. Tamam ikincil düğmedir.
- **Galeri:** üst satır iki eşit yarım, ikisi de 4:3; altyazı resmin hemen altında. Para çekmecesi fotoğrafı (marka etiketleri, modern tezgâh) çıkarıldı, yerine Osmanlı Bankası Samsun şubesinin 1930 tarihli iç fotoğrafı (SALT Araştırma, bilinen telif kısıtlaması yok) geldi. Koyu temada hiçbir resme filtre uygulanmaz. Placeholder zemin tonudur (blur yok). Deklanşör 480 ms.
- **Showcase:** yatay kaydırılan satır kaldırıldı; altı parça aynı hücrede üst üste durur, seçilen parça 240 ms çapraz geçişle görünür, kenarda kesik komşu parça yok.
- **Diğer:** "Sizin hesap planınız" başlığı sol not kolonunda panelin üst kenarı hizasında; gravür 4:3 ve uzun listenin yanında yapışkan; "Bir fişin yolu" kartları içerik boyunda, ilk kartın durumu "Çekildi". Galeri cümlesindeki doğrulanmamış tarihsel iddia kaldırıldı.
- **Giriş ve kayıt:** formlar `noValidate` (boş gönderimde tarayıcı balonu yerine alanın altındaki hata), e-posta placeholder'ı yok, "Şifremi unuttum" DOM'da şifre alanından sonra, kayıtta Turnstile IP sınırından önce.

## 19. Tur 6 kararları: ana sayfa, giriş ve kayıt (bölüm 18'in üstündedir)

- **Renk:** koyu temada `--deep` lacivert değil, nötr `#171c22` (açık temada `#111821`); showcase sekmeleri için `--deep-raised`. Mavi alan koyu temada yalnız CTA'dır; "Bir fişin yolu" 4. kolonu koyu temada `--field-4` nötrü (`#282e36`), açık temada mavi kalır. Hero ve giriş/kayıt sağ yarısı `--split` (açık `#ccd6e2`, zeminle 1.33:1; koyu `#1d2229`). Hero seçicilerinde seçilmemiş seçenek `--choice` (açık beyaz, koyu `#2a3139`), seçili seçenek `--primary` dolgulu. Koyu temada termal kâğıt `#d8dadc` (krem değil, ekranın en parlak yüzeyi değil; kâğıt yazısı 5.0:1).
- **Hero:** başlık 7.5vw (1440'ta 107px), kolonlar 6fr/5fr, cümle "gider, KDV ve alacak satırları sizin hesap kodlarınızla hazırlanır, siz onaylayınca Luca'ya gider". Başlık animasyonu `backwards` dolgusuyla: dinlenme durumu yerinde. Arka planda açılan sekmede (`visibilityState` hidden) giriş animasyonları hiç başlamaz. Tablo satırları odak durağı değil.
- **Bir fişin yolu:** cümle kartın hemen üstünde, dört kolonda aynı çizgide. Dört perde 350 ms arayla bir kez oynar: şerit basılır, alanlar tek tek okunur, Onaylandı damgası iner (scale 1.6, -8°, 320 ms), Excel dosyası ve tablo yukarıdan iner, sonra Aktarıldı. Tablette çiftin ikincisi 350 ms sonra, telefonda her kolon kendi geldiğinde. Hiçbir şey animasyondan önce gizlenmez; başlangıç durumu animasyonun kendi dolgusundan gelir.
- **Kural bölümü (eski galeri):** başlık "Borç alacağa eşit olmadan onay yok". Büyük öğe ürünün kendi dengesiz fişi (alacak 8.752,00, fark 27,00, Onayla kapalı); yanında Dedo'nun 1876 defteri (Debet/Credit kolonları ve toplamlar, kamu malı). Altında kasa dairesi, 1863 imtiyaz belgesi ve toplama makinesi klibi. Samsun 1930 çıkarıldı. Kapalıçarşı CTA'ya taşındı.
- **Resimler:** hepsi tek tonda: siyah beyaz, aynı kontrast eğrisi, en çok 1600 px, 100-260 KB (klip ve posteri de). Kredilerde "siyah beyaza çevrildi" yazar; BY-SA 3.0 RS bağlantısı tam lisansa gider; başlıklar `lang` taşır. Deklanşör yalnız resim çözüldükten sonra açılır (en çok 3 s bekler) ve örtü yalnız animasyon sırasında vardır. Klip posteri videonun arka planıdır, siyah kare yok.
- **Showcase:** parça 12 kolonun 8'inde, büyük ölçekte (iç yazı 15-16 px); sağda dolgulu sekmeler, altında seçilen parçanın adı (h3) ve cümlesi. Beş parça (dengesiz fiş kural bölümüne geçti); kısa parçalar ikinci bir bağlamla (ilgili Luca satırları) iki kolon.
- **Hesap planı:** başlık panelin sol üst kenarında, notlar tek kolonda sağda, her not anlattığı parçanın satırında.
- **SSS:** cevap paneli içerik boyunda, listenin ilk satırı hizasında ve yapışkan; soruların yanında yöne dönen ok (telefonda aşağı, açıkken yukarı).
- **CTA:** form kaldırıldı (iki form ve JS'siz gönderimde URL'ye düşen ad/e-posta sorunu); tek "Hesap oluştur" bağlantısı, "Giriş yapın" ve Kapalıçarşı fotoğrafı. Kayıt formundaki sessionStorage ön doldurması da kaldırıldı.
- **Üst çubuk:** sayfa kenar boşluklarına hizalı (hero ile aynı sol kenar). Kaydırma başlayınca çubuğun üstü ve arkası zemin rengiyle dolar (scroll-timeline; desteklemeyen tarayıcıda eski hal). 640 px altında çubukta Hesap oluştur yok (hero ve menüde var): giriş ekranı 360'ta taşmaz.
- **Çerez şeridi:** telefonda tek satır ve tek düğme (Tamam); Gizlilik bağlantısı aynı bilgiyi verir.
- **Giriş ve kayıt:** form ve fiş aynı üst çizgide (`--auth-top`), kolonlar 5fr/7fr, Luca kartı 380 px. Geçersiz gönderimde bütün alan hataları birden görünür, odak ilk hatalı alana gider. Giriş/kayıt arası bağlantı 44 px. Kayıt metni: "Hesap oluşturmadan önce gizlilik sayfasını okuyun: fiş fotoğrafı okunmak için Anthropic'e (ABD) gönderilir ve saklanmaz." (yayından önce hukuki onay gerekir).
- **Metin:** "Fotoğraf okunduktan sonra saklanmaz."; "Accountie'de borç alacağa eşit olmadan Onayla açılmaz"; "50 fiş ya da 400 satırda yeni dosya, fiş bölünmez"; liste başlığı "Excel ya da pano ile Luca'ya" (eklenti deneysel grup olarak kalır).

## 20. Tur 7 kararları: panel (bölüm 17'nin üstündedir)

- **Kontrol ekranı:** "Fiş bilgileri" (Evrak No, Evrak tarihi, BT, Açıklama) sol sütunda "Fişten okunan"ın altında; fişin söyledikleri ile satırlara yazılan başlık alanları yan yana durur, sol sütunda boşluk kalmaz. Sol sütun ekran yüksekliğine sığdığında (en az 820px, fotoğraf yokken) yapışkandır. 1100px altında tek kolon ve sıra: uyarılar, yevmiye satırları ve denge, fişten okunan, fiş bilgileri, eylemler, sil. Telefonda ilk ekran satırlarla açılır.
- **Uyarı yüzeyleri:** "Kontrol edilecekler" kutusu kalır. Kontrol isteyen alan yalnız `--warn-ink` kenar ve "Kontrol edin" notu taşır, krem dolgu yok; VKN yalnız uyarı rengindeki yazıyla. Veri rengi mavi kalır.
- **Kolon başlıkları:** cümle düzeni ("Hesap kodu", "Hesap adı", "Evrak tarihi"). "Evrak No" ve "Fiş No" kısaltma olduğu için büyük N ile kalır. Luca'nın Excel şablonundaki başlıklar (`src/lib/luca/export.ts`) Luca'nın kendi yazımıdır ve değişmez.
- **Liste:** satır hover'ı `--active` (açık temada beyaz üstünde fark edilir). Boş ve yükleniyor durumunda liste kartı ile Luca kolonu aynı tabanda biter (kısa taraf uzar); yükleniyor durumu 12 satır ve iki yan blok iskeleti gösterir. Tablet kart satırında numara, tarih ve kod sabit kolonlarda, tabular rakamla.
- **Fiş okunurken:** okuma kartı düğmelerin kendi yerine, onların üstüne açılır (düğmeler yer tutar, gizlenir); başlık ve liste kıpırdamaz. Kart 180ms opaklık ve 6px yükselişle girer; aşamalar tek satırda, kâğıt şeridi 40x56px. Telefonda alt çubuğun üstünde durur. Sunucu yanıt verip mesaj göndermezse "Sunucu fişi işleyemedi. Tekrar deneyin.", yanıt yoksa "Bağlantı kurulamadı".
- **Geçişler:** eski ekran 120ms'de söner, yeni ekran 60ms sonra 140ms'de gelir; başlık morfu 240ms. Aktarılan satır Aktarıldı sekmesine doğru sol üste çıkar.
- **Kurallar:** Gider hesapları etiket kolonunda örnek fişin altında sayfanın diğer bölümlerine atlama listesi (sayılarıyla); yapışkan kolonla birlikte iner, 900px altında yok.
- **Önizleme:** `/onizleme/panel*` sayfaları `PreviewApi` ile `/api` çağrılarını tarayıcıda yanıtlar: yükleme gerçek aşamaları oynatıp ilk taslağı açar, onay, taslağa alma, elle girdim ve Luca indirmesi durumu oturum çerezinde değiştirir (`?sifirla=1` sıfırlar). Yalnız `next dev`te var.

## 16. Tur 5 sonrası kararlar (tur 6'dan itibaren; önceki bölümlerin üstündedir)

Bu kararlar 3-5. turlarda birden çok jürinin tekrar tekrar bulduğu sorunları kapatır. Geliştirici ve jüri bunları tartışmaya açmaz, uygular ve uygulanıp uygulanmadığına bakar.

**Ana sayfa**
1. **Hero tezgâhı:**
   - 1440x900'de Luca kartı en az 560px geniştir. Hesap adları en çok iki satır kaplar.
   - "Satırları kopyala" ilk ekranda görünür ve çerez şeridinin üstünde kalır. Şerit hero'yu örtmez: masaüstünde ilk kaydırmaya kadar sol alt köşede kompakt durur ya da hero dışında görünür.
2. **Hero geçişi:** seçim değişince tablo boşalmaz. Eski satırlar ile yeni satırlar 160-200 ms çapraz geçiş yapar, tutarlar doğrudan yeni değere geçer. Ara rakam ve sayma yoktur.
3. **Boş kutu yasağı:** hiçbir içerik (kart, resim, metin) görünmez başlayıp sonra belirmez. Açılış hareketleri yalnız görünür bir başlangıçtan yapılır: hafif `transform` ya da `clip-path` ile en az %85'i baştan açık. Resimlerin arkasında zemin tonunda placeholder vardır. Görsel yüklenemezse kutu çökmez, altyazı tek başına anlamlı kalır.
4. **"Bir fişin yolu":** dört kart içerikleri baştan görünür halde eşit yükseklikte durur (grid `align-items: stretch`). Alanlarda büyük boş tepe kalmaz. Sıralı hareket (basılma, okunma, damga, iniş) içerik görünürken üstüne oynar. Tetik eşiği yaklaşık %35'tir.
5. **Showcase ve galeri:**
   - 1440'ta ölü alan yoktur: parça alanın genişliğini doldurur ya da iki parça yan yana durur.
   - Koyu temada ürün kartı alandan bir ton açıktır.
   - Galeride en parlak leke sorunu: siyah beyaz resimler koyu temada `filter` yerine kaynakta hafif karartılmış olarak ya da `opacity` 0.9 ile verilir.
6. **Yazı ölçeği:** her genişlikte en çok 6 farklı yazı boyu. SSS'de soru, cevaptan büyüktür.
7. **Resimler:** en az 6 resim. Her resmin altyazısı resmin ürünle bağını tek cümleyle söyler. Para çekmecesi gibi modern ve markalı resimler çıkarılır.

**Sistem ve panel**
8. **Tema düğmesi:** üç ikon da HTML'de bulunur, hangisinin görüneceğini `<html data-theme>` üstünden CSS seçer. Böylece ilk boyamada doğru ikon görünür ve hidrasyon farkı oluşmaz. Önizlemedeki `?tema=` `data-look` ve `theme-color`'ı da ayarlar.
9. **Odak:** "İçeriğe atla" odaklanınca üst çubuğun üstünde görünür. Onayla'dan sonra odak durum pill'ine ya da bir sonraki fişe bağlantıya gider, sayfa gövdesine düşmez. Kaydedilmiş fişte Onayla yenilenene kadar "Onaylandı" olarak devre dışı kalır. 1100px altında Tab sırası görsel sırayla aynıdır.
10. **Giriş ve kayıt:** boş ya da geçersiz alanlar istemcide de (aynı Zod şeması) gönderimden önce yakalanır. Sunucu doğrulaması kalır.

**Kapsam:** bu listede ve önceki bölümlerde olmayan yeni bir bölüm ya da özellik eklenmez. Jüri yeni kapsam isteyemez; mevcut kapsamın kalitesini puanlar.

## 21. Tur 8 kararları: ana sayfa, giriş ve kayıt (bölüm 16, 18 ve 19'un üstündedir)

- **Hero tezgâhı:** sahne dikeyde ortalanmaz; tezgâh sabit bir üst çizgide (`--stage-top`, çubuk + 96px) durur, seçim değişince seçiciler kıpırdamaz, yalnız altlarındaki fiş ve satırlar uzayıp kısalır. 1181px ve üstünde kolonlar 4.5fr/7.5fr, satırlar 16px, kâğıt 14px, şerit 256px; Luca kartı 1440'ta 568px, tezgâh yaklaşık 556px yüksek (ekranın %60'ı). View transition'da seçiciler (`home-pickers`) ve showcase sekmeleri (`show-tabs`) kendi anlık görüntüsündedir ve çapraz geçmez; yalnız fiş, satırlar ve parça geçer.
- **Koyu temada yükselti:** alan üstündeki ürün kartları alanın bir ton üstünde: hero ve giriş/kayıt kartı `--lift` #252b33 ve `--lift-edge` #2f363f; "Bir fişin yolu" kartları `--path-card-1..4` (her alanın bir üstü). Açık temada hepsi `--surface`. Footer adı koyu temada `--foot-name` #b9c1ca.
- **Bir fişin yolu:** kısa kartlar aşamanın kendi içeriğiyle doldu (Okundu: Ödeme satırı; Onaylandı: Evrak No, tarih, BT; Aktarıldı: dosya satırı ve Luca'da yükleme cümlesi); içerik ile dipnot arası 40px altında. Bekleyen damga yerinde ve 0.6 opaklıkta durur, kendi perdesinde 1.2 ölçek ve -4° ile kalkıp iner (420ms).
- **Showcase:** Luca dosyası parçası paneldeki gerçek kart (88 onaylı fiş, 2 dosya, çubuklar, ilk indirmeden sonraki "38 fiş kaldı" notu, yükleme adımları). Alacak hesabı listesinde hesap adı, 309.01'in yanında "şirket kartı". 640px altında sekmeler parçanın üstünde, sarılan tek blok.
- **Telefon:** Excel/pano listesi iki kolonlu tanım ızgarası; hesap planı parçasındaki kodlar alan çerçevesi olmadan metin.
- **Görseller:** klip 8 sn, 640x360 (mp4 236 KB, webm 199 KB); Dedo defteri kenarları kırpıldı. Kural bölümü altyazıları resmin ürünle bağını söyler. BY-SA işlerde "değiştirilmiş hali aynı lisansla paylaşılır" notu.
- **Metin:** "Accountie fotoğrafı saklamaz."; kayıtta "Anthropic'e (ABD) gönderilir; Accountie fotoğrafı sunucuda ve veritabanında saklamaz."; sayfa ve bağlantı adı "Gizlilik"; çerez penceresinde "Kapat".
- **Giriş ve kayıt:** başlık 36px (uygulama ekranı kuralı 32px üstünü uyarır; iki tonlu alanın yanında ölçek için bilinçli). Odak alan uyarı kutusu halka çizmez. Çerez şeridi açıkken 900px altında forma alt boşluk ve `scroll-padding-bottom`. E-posta doğrulamalı kayıttan sonra `?sonra=` girişe taşınır.

## 22. Tur 8 kararları: panel (bölüm 20'nin üstündedir)

- **Kontrol ekranı, masaüstü:** satırlar: uyarılar, yevmiye satırları (1fr), tepsi, Fişi sil. İkincil eylemler (Taslağı kaydet, Satırları kopyala) tepsinin üst satırı, Onayla satırı altı; tek blok, `--stage` zemin, ikincil düğmeler `--surface`. Fiş kolonu daha uzunsa yevmiye paneli uzar ve toplam şeridi panelin dibine iner; iki kolon tepsinin tabanında aynı çizgide biter, Fişi sil tepsinin altında. Fiş bilgileri iki satır: Evrak No ile tarih, BT ("Belge türü") ile Açıklama.
- **Tablet (721-900):** yevmiye satırları tablo kalır (kod 8rem, tutarlar 7rem), denge şeridi ilk ekranda tepsinin üstünde. Kart satırları yalnız telefonda.
- **Engelli Onayla:** düğme alanı odaklarken tepsinin cümlesi klavye açıkken de görünür kalır (`data-pointed`, alan odaktan çıkınca biter).
- **Telefonda onaylı fiş:** tutar etiketinin altında, sola hizalı.
- **Geçiş:** liste satırından kontrol ekranına yeni ekran 60ms sonra 140ms'de gelir (eski kökle örtüşür, boş kare yok).
- **Formlar:** hata görünürken şifre kuralı ipucu gizlenir; e-posta `enterkeyhint=next`, son alan `go`; kurallar alanlarının `name`'i var.

## 21. Görseller ve fiş hareketi (2026-11-04, kullanıcı kararı; 15 ve 16'daki resim ve damga kurallarının yerine geçer)

- Arşiv fotoğrafları, gravürler ve toplama makinesi klibi kaldırıldı: kullanıcı ürünle ilgisiz buldu. Sayfada yalnız ürünün kendi ekran görüntüleri var: fiş kontrol ekranı (Borç alacağa eşit bölümü), Fişler ekranı (Excel ya da pano bölümü) ve telefonda Fişler (CTA). Her biri açık ve koyu temada ayrı çekildi (`public/gorseller/urun-*`), ziyaretçinin temasına göre gösterilir. Kaynak: `/onizleme/panel` örnek fişleri, dev göstergesi çıkarılarak. Panel değişince yeniden çekilir.
- Footer'daki görsel kaynakları listesi, üçüncü taraf görsel kalmadığı için kaldırıldı.
- Fiş hareketi tek motif: "fiş okunuyor" = fişin üzerinden geçen defter mavisi tarama çizgisi. Hero tezgâhında fiş değişince bir kez, Bir fişin yolu'nun ilk kartında bir kez, panelde okuma sırasında çekilen fotoğrafın küçük görüntüsünün üzerinde sürekli. Altındaki Luca satırları kısa bir kaymayla gelir; içerik hiçbir anda gizli değildir.
- Kaldırılanlar: termal fişin yazıcıdan inmesi, Bir fişin yolu'ndaki damgalar ve inen Excel dosyası, resimlerin perde açılışı ve yakınlaşması, tezgâhtaki view-transition çapraz geçişi. Panelde Onaylandı damgası yerine 220 ms'lik kısa bir ton geçişi.

## 23. Premium görsel ve hareket dili (2026-11-05, kullanıcı kararı; 21'deki görsel ve hareket kararlarının üstündedir)

Kullanıcı: "fotolar ve animasyonlar hâlâ çok kötü". İstek: premium, akıllı, minimal, ama efektli; ölü, düz bir sayfa değil. Kaynak: `.taste-skill/arastirma/NOTLAR.md` (13 site ölçüldü: Mercury, Ramp, Linear, Stripe, Brex, Pennylane, Qonto, Dext, Expensify, Vic.ai, Paraşüt, Moto Card, Possible). Bu bölümde çağrılan skill'ler: `taste-skill:design-taste-frontend` ve `web-design-guidelines` (Vercel `command.md` güncel sürümü, Animation/Images/Performance).

Bu bölüm şunların yerine geçer: 21'deki ürün ekran görüntüleri (`public/gorseller/urun-*.jpg`) ve "tarama çizgisi" motifi; 7'deki "tarayıcı ya da laptop çerçevesi yok" satırı (yalnız aşağıda tanımlanan uygulama penceresi ve telefon çerçevesi için); 16.2'deki "tutarlar 180 ms çapraz geçişle değişir" satırı (yerine odometre, 23.3.3). Geçerli kalanlar: `INSTRUCTIONS.md` (her bölüme fade-in yok, içerik hemen görünür), 16.3 boş kutu yasağı, mavi = Luca'ya giden rakam, Stack Sans iki aile, radius 6/8/4, degrade/cam/parlama yasağı.

**Tek cümle:** Ürünün kendisi, canlı HTML olarak, derinlikli bir çerçevenin içinde çalışır; fişteki rakam kalkar ve Luca satırına iner. Fotoğraf değil, ürün resimdir.

### 23.1 Palet: aynı mavi, daha derin nötrler

Mavi kimlik değişmez (`--accent` #2b5a9a / #8db0e0). Premium his renkten değil, nötrlerin derinliğinden ve yüzeyler arasındaki ton adımlarından gelir. Değişen tokenlar (geri kalanı bölüm 6.1, 19 ve 21'deki gibi):

| Token | Açık (eski → yeni) | Koyu (eski → yeni) | Not |
|---|---|---|---|
| `--ground` | #f2f4f7 → **#f4f6f8** | #0e1114 → **#0b0d10** | Koyu temada Linear'ın rgb(8,9,10) düzeyine yakın, nötr; lacivert değil |
| `--surface` | #ffffff | #161a1f → **#14171c** | |
| `--raised` | #f7f8fa | #1d2228 → **#1b1f25** | |
| `--ink` | #141a22 → **#0f141b** | #eef1f4 | |
| `--muted` | #4f5a67 → **#4b5563** | #a9b2bd | |
| `--faint` | #5f6a77 → **#5b6573** | #949eaa | |
| `--plate` (yeni) | **#e9edf2** | **#111418** | Çerçevenin oturduğu yüzey plakası (23.2) |
| `--bezel` (yeni) | **#161c24** | **#2a3038** | Telefon çerçevesi; iki temada da koyu, ekranı öne çıkarır |
| `--edge-hi` (yeni) | yok | **rgb(255 255 255 / 0.06)** | Koyu temada yükseltilmiş yüzeyin üst kenarında 1px iç ışık (`inset 0 1px 0`) |
| `--shadow-lift` (yeni) | `0 24px 48px -12px rgb(15 20 27 / 0.18), 0 2px 6px rgb(15 20 27 / 0.06)` | `0 24px 48px -12px rgb(0 0 0 / 0.55)` ve `--edge-hi` | Yalnız 23.1'deki "öne binen katman" |

Ölçülen kontrast (WCAG, bu bölüm için hesaplandı): açık `--ink`/`--ground` 17.1, `--muted`/`--ground` 7.0, `--faint`/beyaz 5.9 ve `--plate` üstünde 5.0, `--accent`/beyaz 6.9 ve `--ground` üstünde 6.4, `--accent`/`--accent-soft` 5.8, `--ink`/`--paper-lit` 14.7; koyu `--ink`/`--ground` 17.2, `--muted`/`--surface` 8.4, `--faint`/`--raised` 6.1, `--accent`/`--ground` 8.7 ve `--surface` üstünde 8.1. Yüzey adımları bilerek küçüktür (`--plate`/`--ground` 1.09, koyu `--surface`/`--ground` 1.08): ayrım çizgiyle değil tonla. Geliştirici bölüm 6.1'deki diğer çiftleri (`--stage`, `--split`, `--field-*`, `--lift`) yeni zeminle yeniden ölçer; `theme-color` yeni zeminle eşleşir.

**Vurgu oranı:** her masaüstü ekranında defter mavisi piksellerin %5'inden azı (ölçülen sitelerde %1-5). Mavi yalnız şunlarda: birincil düğme, Luca'ya giden rakamlar (`to-luca`), odak halkası, imza sahnesindeki uçan rakamlar ve spotlight bağ çizgisi. Tek istisna CTA'nın `--accent-field` alanı (sayfanın tek renk alanı, bir kez).

**Derinlik dili (üç katman, gölge son çare):**
1. **Ton adımı:** zemin → plaka → yüzey → yükseltilmiş; her biri bir adım. Çizgi değil.
2. **Çerçeve:** ürün parçaları bir uygulama penceresi ya da telefon çerçevesi içinde ve bir plakanın üstünde durur (23.2).
3. **Örtüşme:** girdi (fiş) çıktının (Luca satırları) üstüne kısmen biner. Öne binen katman, gerçekten başka bir yüzeyin üstünde yüzdüğü için `--shadow-lift` taşır. **Her ekranda en çok bir** gölgeli katman. inspect bunu WARN verir; savunma cümlesi: "öne binen katman gerçekten alttaki pencerenin üstünde duruyor, ayrım başka türlü okunmuyor." CSS'te `/* taste-skill-ignore: lift layer, YON 23.1 */`.

Yasak kalır: degrade, cam/blur, parlama, nokta ızgara zemin, renkli gölge, iki ve daha fazla gölgeli katman, kart ızgarası.

### 23.2 Görseller: her yuva için ne konacak

Ortak kurallar:
- **Ürün parçaları canlı HTML,** `data-ui` köklü, panelin gerçek token ve bileşen stilleriyle; her DPR'de keskin. Ana sayfada raster ekran görüntüsü **kullanılmaz**: `public/gorseller/urun-*.jpg` ve `page.tsx`'teki `Shot` kaldırılır (artık kullanılmayan importlarla birlikte).
- **Uygulama penceresi çerçevesi:**
  - radius 8, `--surface`, 1px `--border`;
  - 36px üst şerit `--raised` tonunda, içinde yalnız ekranın adı (ör. "Fiş 0047, kontrol") ve solda küçük Accountie işareti;
  - trafik ışığı noktaları, adres çubuğu ve sahte sekme yok;
  - Luca'nın logosu, rengi ya da arayüzü taklit edilmez. Luca'ya giden kolonlar (Hesap Kodu, Evrak No, Tarih, Açıklama, Borç, Alacak, BT) Accountie'nin kendi tablosu olarak çizilir.
- **Plaka:** pencerenin arkasında, 24px aşağı ve iki yana 48px taşan, radius 12, `--plate` tonunda dikdörtgen: ekranın "oturduğu yüzey" (Linear'ın taban plakası). Telefonun plakası yok.
- **Telefon çerçevesi:** CSS ile, `--bezel` 10px çerçeve, dış radius 44, ekran radius 34, üstte 88x24 hap biçiminde kamera kesiği. Marka düğmesi, logo, gerçek cihaz silüeti yok.
- **Termal fiş:** mevcut `Thermal.tsx` (fikstür fiş 0047 ve örnekler); kâğıt `--paper`, yazı `--paper-ink`. Gerçek fiş fotoğrafı yok.
- Satırlar `buildJournalLines`/`journalFor` ile gerçek kurallardan; rakamlar `formatTrAmount`; uydurma müşteri, istatistik, logo yok.
- CLS 0: her çerçeve sabit `aspect-ratio` ya da sabit yükseklikle; LCP h1 metnidir.

| Yuva | Ne konacak | 1440 | 768 | 390 |
|---|---|---|---|---|
| **Hero sahnesi** (`.hero-stage`, mevcut tezgâh) | Arkada uygulama penceresi içinde canlı "Luca'ya gidecek satırlar" tablosu (tezgâhın Luca kartı, toplamlar ve Satırları kopyala dahil). Önde, pencerenin sol alt köşesine binen telefon çerçevesi, ekranında termal fiş (`Thermal`). Pencere sağda sayfa kenar boşluğunu geçip görünüm kenarına kadar taşar (hero'da `overflow-x: clip`). Telefon öne binen tek gölgeli katman. Seçiciler pencerenin üstünde, sabit üst çizgide (21). | Pencere 780x500, plakasıyla görünüm kenarına taşar; tablo kartı en az 568 geniş (16.1); telefon 260x540 (ekran 240), pencerenin solundan 120px içeri biner, tabanı pencere tabanından 48px aşağıda | Tek kolon: pencere tam genişlik, sağdan 48px taşar; telefon 220x456, sol altta 96px biner | Pencere yok. Telefon 280x580 solda; Luca satırları kartı altında, tam genişlik, telefonun alt kenarına 40px biner (öndeki katman). Eğim yok |
| **Kural bölümü** (`.rule`, eski `urun-fis` ekran görüntüsü) | İmza sahnesi (23.3.1): uygulama penceresi "Fiş 0047, kontrol", solda termal fiş, sağda Luca satırları ve denge şeridi. Sahne bitince mevcut dengesiz fiş kartı (8.752,00, fark 27,00) pencerenin sağ alt köşesine binen katman olarak durur: "eşitse açılır, değilse kapalı" tek karede | Sahne 12 kolonun 5-12'si, pencere 880x560; dengesiz kart 400 geniş, 64px biner | Pencere tam genişlik, 520 yükseklik; dengesiz kart altında, 32px biner | Pencere yok; fiş kartı ve satırlar kartı alt alta; dengesiz kart ayrı, tam genişlik |
| **Bir fişin yolu** (`.path`) | Masaüstünde yapışkan bölünmüş anlatı (23.3.4): solda dört cümle, sağda tek bir fiş kartı dört durumdan geçer, zemin dört alan tonu arasında perdeyle değişir. Kart uygulama penceresi değil, panelin kendi kartı (`ui-card`) ve plakası | Sahne 12 kolonun 6-12'si, `100vh - 96px` yapışkan, kart 480 geniş | 1100 altında bugünkü gibi dört kart alt alta, her biri kendi alan tonunda | Aynı, tek kolon |
| **Kontrol ekranından Luca'ya** (`.show`, koyu alan, `ShowRow` beş parça) | Her parça uygulama penceresi içinde, `--deep` alan üstünde `--deep-raised` plaka; parça adı pencerenin üst şeridinde. "Kontrol ekranı" parçasında spotlight bağ (23.3.5) | Pencere 12 kolonun 8'i (yaklaşık 880), sabit 560 yükseklik (parçalar arası CLS yok) | Tam genişlik, 520 | Üst şerit yok, yalnız kart; sekmeler üstte (21) |
| **Sizin hesap planınız** (`.feat`) | Değişmez (zaten canlı HTML panel); yalnız arkasına `--plate` plakası ve koyu temada `--edge-hi` | aynı | aynı | aynı |
| **Excel ya da pano ile Luca'ya** (`.routes`, eski `urun-liste` ekran görüntüsü) | Uygulama penceresi "Fişler": canlı HTML liste (6 satır: fiş no, satıcı, tarih, tutar, durum pill'i; Taslak, Onaylı, Aktarıldı karışık) ve yanında Luca dosyası kartı (21'deki gerçek kart). Mevcut `luca-fisler-20260905.xlsx` kartı pencerenin sol alt köşesinden dışarı binen katman: dosya uygulamadan çıkıyor. Satıcı adları örnek ("ÖRNEK BALIK LOKANTASI" biçiminde, gerçek işletme adı değil) | Pencere 12 kolonun 7-12'si, 640x440; Excel kartı 520 geniş, 56px biner | Pencere tam genişlik; Excel kartı altında, 32px biner | Pencere yerine liste kartı; Excel kartı ayrı, yatay kaydırma bölgesi kalır (WCAG 2.1.1) |
| **CTA** (`.cta`, eski `urun-telefon`) | Varsayılan: telefon çerçevesi, ekranında Accountie'nin kamera ekranı (vizörde CSS termal fiş, dört köşe kılavuzu, "Fiş çek" düğmesi, altında son çekilen fişin taslak satırı). İsteğe bağlı fotoğraf: aşağıda | Telefon 300x620 | 280x580 | 260x540 |

**İsteğe bağlı tek fotoğraf (CTA yuvası, varsayılanın yerine).** Yalnız şu beş koşulun hepsi tutarsa kullanılır:
1. Ticari kullanıma izinli lisans: Unsplash License, Pexels License, CC0 ya da CC BY.
2. Konu birebir: telefonla termal yazar kasa fişi çekilen masa ya da elde tutulan termal fiş, arkada muhasebe masası.
3. Fişin yazıları okunmuyor (unvan, VKN, kart numarası yok); marka logosu yok; yüz yok ya da odak dışında.
4. Kaynak en az 2000px ve keskin.
5. Hesap açmadan ve çerez kabul etmeden indirilebiliyor.

Arama sorguları: `phone photographing receipt`, `thermal receipt paper close up`, `hand holding receipt smartphone`, `cash register receipt desk`, `bookkeeping desk receipts`, `fiş fotoğrafı telefon`. Önce `assets.mjs` ile Openverse/Commons, sonra Unsplash ve Pexels sitelerinde aranır.

Fotoğrafın üstünde keskin HTML çipler durur: "770.08  7.931,82", "191.03.10  793,18", "Dengede" (Pennylane/Qonto). Biçim: 4:5, 1440'ta 520x650, `next/image`, `sizes`, `loading="lazy"`, tek işlem (renk düzeltmesi yok), koyu temada `--picture-opacity`. Kredi gerekiyorsa footer'da tek satır "Görsel kaynakları" geri gelir.

Koşullardan biri tutmuyorsa fotoğraf yok, varsayılan telefon çerçevesi kalır: alakasız ya da "idare eder" bir fotoğraf, hiç fotoğraf olmamasından kötüdür (21). Kullanıcının kendi fiş veya Luca fotoğrafları repoya girmez.

**Giriş ve kayıt:** mevcut fiş ve Luca kartı parçası aynı dile geçer: kart plakanın üstünde, fiş kartın sol üstüne binen katman. Yeni hareket yok.

### 23.3 Hareket: bir imza, dört destek

Genel:
- Yalnız `transform`, `opacity` ve `clip-path` canlandırılır. `transition: all` yok, `transform-origin` doğru verilir. SVG dönüşümleri `<g>` üstünde, `transform-box: fill-box` ile.
- Hiçbir içerik JS'e bağlı olarak gizlenmez. SSR çıktısı her sahnenin **son durumudur**; hareket yalnız bu durumdan geriye kurulur (16.3).
- Her hareket kesilebilir: yeni girdi gelince son değere atlar. 5 sn'den uzun kendiliğinden hareket yok.
- Kütüphane yok (GSAP, Lenis, Framer eklenmez). CSS scroll-driven animations (`animation-timeline: view()/scroll()`, `@supports` içinde) ve küçük bir IntersectionObserver yedeği yeter.
- Layout okuma render içinde yapılmaz; yalnız sahne görünür olunca ve yeniden boyutlandırmada, toplu yapılır.
- Tokenlar 6.6'dakiler, ölçülen sitelerle uyumlu. Yeni tokenlar: `--t-flight: 640ms`, `--t-digit: 420ms`, `--t-wipe: 900ms`.

`prefers-reduced-motion: reduce` altında her hareketin aşağıda yazan karşılığı geçerlidir. Yol, ölçek, eğim ve kaydırmaya bağlı hareket düşer; son durum hemen ve tam görünür; yapışkan sahneler normal akışa döner.

#### 23.3.1 İmza: "rakam uçuşu" (kural bölümü)

Fişteki rakam kalkar, Luca satırına iner. Tarama çizgisinin yerine geçer; sayfanın tek büyük anı.

| Adım (ilerleme) | Ne olur | Süre/eğri (zamanlı modda) |
|---|---|---|
| 0 - 0,2 | Pencere açık, fiş solda tam okunur. Luca tablosunun Borç/Alacak hücreleri boş değil, `--rule` tonunda yer tutucu tire taşır | |
| 0,2 - 0,65 | Fişte `*7.931,82` (matrah satırı), `*793,18` (TOPKDV) ve `*8.725,00` (TOPLAM) sırayla `--paper-lit` ile işaretlenir. Her rakamın `aria-hidden` kopyası fişten kalkıp hedef hücreye uçar (FLIP: başlangıç ve hedef kutusu bir kez ölçülür, kopya yalnız `translate` ve `scale` ile gider; hafif yay için X ve Y ayrı eğri). İnince hücredeki gerçek rakam görünür, kopya kaybolur, hücre bir kez `scale(1.04)` → 1 | Her uçuş `--t-flight` `--ease-expo`, aralarında 180ms |
| 0,65 - 0,85 | Hesap kodları 770.08, 191.03.10, 331.01 satır başlarına gelir: kodun maskesi `clip-path: inset(0 100% 0 0)` → `inset(0)`, soldan sağa | 280ms `--ease-out`, satır başına `--stagger-item` |
| 0,85 - 1 | Denge şeridi gelir: "Borç 8.725,00, Alacak 8.725,00, Fark 0,00" ve "Dengede". Onayla devre dışı tondan etkin tona geçer; fiş `opacity` 1 → 0.72 ile geri çekilir | 240ms `--ease-out` |

- **Tetikleyici:**
  - ≥1100px ve `animation-timeline` destekleniyorsa kaydırmaya bağlı: bölüm 220vh, sahne `position: sticky` (üst `--stage-top`), `animation-timeline: view()`, `animation-range: contain 0% contain 100%`. Geri kaydırınca geri oynar.
  - Diğer durumlarda (telefon, tablet, desteklemeyen tarayıcı) sahne %35 görünür olunca **bir kez** zamanlı dizi oynar (toplam yaklaşık 2,4 sn); bölüm normal yükseklikte.
- **Reduced motion ve JS yok:** son durum. Fiş ve dolu üç satır yan yana; fişteki üç kaynak rakam ve hedef hücreler `--accent-soft` işaretle eşleşik; denge şeridi görünür.
- **Ekran okuyucu:** tablo baştan gerçek değerleriyle DOM'da; uçan kopyalar `aria-hidden`.

#### 23.3.2 Destek 1: hero penceresi eğimden düzleşir

- **Durgun hal:** pencere ve plaka `perspective(1600px) rotateX(8deg) scale(0.96)`, `transform-origin: 50% 0`. Telefon eğilmez; öndeki katman düz kalır, derinlik farkı buradan gelir.
- **Tetikleyici:** sayfa kaydırması. `animation-timeline: scroll(root)`, `animation-range: 0 400px`, keyframe eğrisi `--ease-out`; 400px'te `rotateX(0) scale(1)`.
- **Yükleme:** pencere boyandıktan sonra telefon 32px alttan ve 16px soldan yerine gelir, `--t-reveal` `--ease-expo`, 200ms gecikme. Baştan opaktır (görünür başlangıç).
- **Kapsam:** yalnız ≥1100px ve `@supports (animation-timeline: scroll())`; aksi halde pencere baştan düz.
- **Reduced:** düz, telefon yerinde.

#### 23.3.3 Destek 2: tezgâhta odometre (hero, Luca satırları ve toplamlar)

- **Tetikleyici:** örnek fiş ya da ödeme şekli değişince.
- **Hareket:**
  - Yalnız değişen basamaklar oynar: eski basamak yukarı çıkar (`translateY(-100%)`, `opacity` → 0), yeni basamak alttan gelir.
  - İki yuva vardır, **ara basamak yok**; 16.2'deki "sayma yok" kuralı korunur.
  - `--t-digit` `--ease-out`, basamaklar arası 24ms, soldan sağa. Nokta ve virgül sabit kalır.
  - `font-variant-numeric: tabular-nums` zorunlu; basamak kutusu `overflow: clip`.
- **Hesap kodu değişimi** (331.01 → 309.01 → 100.01): aynı iki yuvalı kayma, 240ms.
- **"Dengede":** yalnız toplamlar eşitlenince `scale(0.96)` → 1 ve `opacity`, 160ms.
- **Kesilebilirlik:** hızlı art arda seçimde süren geçiş son değere atlar.
- **Ekran okuyucu:** gerçek değer görünmez metin olarak durur, toplamda `aria-live="polite"`; basamak yuvaları `aria-hidden`.
- **Reduced:** değer anında değişir.
- Panelde aynı bileşen kullanılır (23.4).

#### 23.3.4 Destek 3: "Bir fişin yolu" yapışkan sahne ve perde

- **Masaüstü (≥1100px, `html.js`):**
  - Solda dört cümle (çekildi, okundu, onaylandı, aktarıldı), aralarında yaklaşık 70vh. Sağda yapışkan sahne.
  - Etkin cümle IntersectionObserver ile seçilir (`rootMargin: -45% 0px -45% 0px`). Etkin olmayan cümleler `opacity` 0.45 alır; metin yine okunur, kontrastı ölçülür.
- **Durum değişince:**
  - Sahne zemini bir sonraki alan tonuyla alttan perdeyle örtülür: `clip-path: inset(100% 0 0 0)` → `inset(0)`, `--t-wipe` `--ease-in-out`. Tonlar mevcut `--field-1..4`: tek renk ailesi, gökkuşağı değil.
  - Kartın içeriği 240ms çapraz geçer; durum pill'i odometre kaymasıyla değişir.
  - Kart 8px yükselip iner (`--t-ui`).
  - Geri kaydırınca ters yönde çalışır.
- **JS yok, 1100 altı ve reduced:** bugünkü gibi dört kart alt alta, hepsi kendi son durumunda; yapışkanlık yok.

#### 23.3.5 Destek 4: spotlight bağ (showcase "Kontrol ekranı" parçası, hero tezgâhı)

- **Tetikleyici:** Luca satırının üstüne gelme, klavye odağı ya da dokunma.
  - Showcase'te satırlar odak durağıdır (`tabindex="0"`) ve `aria-describedby` ile kaynak fiş satırının metnini okutur.
  - Hero'da satırlar odak durağı değildir (21); orada yalnız işaretçi.
- **Hareket:**
  - Fişte kaynak satırlar `--accent-soft` zemin alır, 180ms.
  - Luca satırı ile kaynak satır arasında tek bir SVG yol çizilir (1.5px, `--accent`, uçlarda 4px nokta). Yol `clip-path` ile soldan sağa açılır, 360ms `--ease-out`.
  - Parçanın geri kalanı `opacity` 0.55'e iner, 180ms.
  - Ayrılınca hepsi 120ms'de geri döner.
- **Reduced:** işaret ve yol anında görünür, açılma yok.
- Panelde "Fiş izi" ile aynı görsel dil (23.4).

#### 23.3.6 Taban (efekt sayılmaz, her yerde)

- **Basış:** `scale(0.98)`, `--t-press`.
- **Hover:** zemin tonu değişir, `--t-hover`; yalnız solma değil.
- **Odak:** `:focus-visible` 2px `--focus` halka.
- **Menü ve pencere açılışı:** `opacity` ile `scale(0.98)` → 1, 160ms, `transform-origin` tetikleyiciden.
- **Hero başlığı:** maskeli satır yükselişi kalır (6.6 madde 1).

Başka giriş hareketi yok: bölümler kaydırmada solarak ya da yükselerek gelmez (`INSTRUCTIONS.md`). Mevcut `data-reveal` girişleri gözden geçirilir; yalnız bu bölümdeki sahnelere ait olanlar kalır.

#### 23.3.7 Ucuz ve yasak efektler

- Önceki turlarda reddedilenler:
  - tarama çizgisi;
  - yazıcıdan inen fiş;
  - Onaylandı damgasının inişi ve sıçraması;
  - inen Excel dosyası;
  - resim perdesi, deklanşörü ve yakınlaşması.
- Yükleme ve kaydırma:
  - önyükleyici ya da açılış ekranı;
  - JS bitene kadar boş kalan hero;
  - yumuşak kaydırma (Lenis vb.) ve kaydırma kaçırma (scroll-jacking);
  - zıplayan "aşağı kaydır" oku.
- Giriş efektleri:
  - her bölüme fade-in;
  - harf harf ya da kelime kelime metin dökülmesi, daktilo efekti.
- Sayılar:
  - 0'dan sayan sayaç;
  - ara değer gösteren rakam;
  - sürekli artan sahte sayaç (Stripe GDP türü; gerçek verimiz yok).
- Fare ve imleç:
  - fareyi izleyen 3B kart eğimi;
  - imleç ışığı ya da blob;
  - manyetik düğme.
- Görsel süs:
  - parlama, dönen degrade kenar, kenar süpürme ışığı;
  - parçacık, WebGL dalga, video arka plan;
  - çok katmanlı paralaks (birden fazla hız).
- Hareketin kendisi:
  - 1.05'ten büyük aşmalı ya da elastik yaylar;
  - `filter: blur` animasyonu;
  - konfeti;
  - pazarlama sayfasında iskelet parıltısı;
  - 5 sn'den uzun sonsuz döngü;
  - kayan logo bandı.
- CSS:
  - `width`, `height`, `top`, `left` ya da `background-position` animasyonu (mevcut `home-scan` `top` kullanıyor, kaldırılır);
  - `transition: all`.

### 23.4 Panel: mikro etkileşimler

Panel çalışma ekranıdır: hareket yalnız geri bildirim ve durum değişimi içindir, 120-240ms sürer ve hiçbiri işi bekletmez. Bölüm 15, 17, 20 ve 22'deki hareketler geçerli; şunlar eklenir ya da değişir:

1. **Odometre:** 23.3.3'teki bileşen panelde 240ms ile kullanılır. Yerleri:
   - kontrol ekranında Borç, Alacak ve Fark toplamları;
   - liste sekme sayaçları;
   - Luca dosyası kartında "N / 50" ve "N / 400".

   Yazarken her tuşta değil, alan değeri tamamlanınca oynar (blur ya da 300ms duraklama).
2. **Fiş izi spotlight:** yevmiye satırı seçilince ya da odaklanınca fotoğrafta ve okunan alanlarda kaynak işaretlenir. İki kolon yan yanayken 23.3.5'teki bağ çizgisi de çizilir; tek kolonda yalnız işaret.
3. **Okuma kartı:** sürekli tarama çizgisi kaldırılır. Yerine:
   - küçük görüntü yerine geldiğinde bir kez `scale(0.98)` → 1;
   - gerçek aşamalar (Fotoğraf hazırlanıyor, Fiş okunuyor, Satırlar hazır) iki yuvalı dikey kaymayla, 200ms;
   - etkin aşamanın yanında 3 noktalı bekleme göstergesi: yalnız `opacity`, 1,2 sn döngü, reduced'da durur.

   Sahte yüzde yok.
4. **Denge:** borç alacağa eşitlenince onay işareti `clip-path` ile 200ms'de çizilir. Onayla `--secondary`'den `--primary` tonuna 180ms'de geçer; renk ile birlikte imleç ve `aria-disabled` de değişir.
5. **Onay:** durum pill'i Taslak'tan Onaylı'ya iki yuvalı kaymayla geçer (220ms; 21'deki ton geçişinin yerine). Damga yok.
6. **Satır ekleme ve silme:** yeni satır 8px yukarıdan `opacity` ile 180ms'de gelir. Silinen satır 140ms `--ease-exit` ile gider, alttakiler `transform` ile yukarı kayar (FLIP). Yükseklik animasyonu yok.
7. **Luca dosyası çubukları:** dolum `scaleX` ile (`width` değil), 320ms.
8. **Kopyala ve İndir geri bildirimi:** düğme etiketi iki yuvalı kaymayla "Kopyalandı" olur, 1,6 sn sonra geri döner; `aria-live` ile okunur.
9. **Liste satırı hover:** `--active` zemin 120ms; satırın sağındaki "Aç" oku 4px sağa kayar.
10. **Reduced:** hepsi anında son durumda; renk değişimi kalır.

### 23.5 Jüri: 9 puan için ölçütler

Jüri her alanı 10 üzerinden ayrı puanlar ve her puanı ekran görüntüsü ya da ölçümle gerekçelendirir. **Hedef: her alanda en az 9.** Bir alanın 9 alabilmesi için o alandaki bütün maddeler sağlanmalıdır. Tavanlar her şeyin üstündedir.

**Animasyon (9 için):**
- İmza sahnesi masaüstünde kaydırmaya bağlı, telefonda bir kez çalışıyor. Üç rakam doğru hücreye iniyor, "Dengede" en sonda geliyor. Geri kaydırınca bozulmuyor.
- Dört destek efekti var ve beşinci bir efekt yok.
- `getAnimations()` ve keyframe denetiminde canlandırılan özellikler yalnız `transform`, `opacity` ve `clip-path`.
- Sahne kaydırılırken 4x CPU kısıtlamasında Performance izinde 50ms üstü uzun görev yok ve kare düşmesi görünmüyor.
- Süreler ve eğriler bu bölümdeki değerlerde (±20%).
- Hızlı art arda tıklamada odometre son değere atlıyor.
- Reduced motion ile tekrar denendiğinde her sahne son durumunda ve eksiksiz.
- Yasak listeden (23.3.7) hiçbir öğe yok.

**Görseller (9 için):**
- Ana sayfada raster ekran görüntüsü yok. Her ürün parçası canlı HTML ve 1440 ile 390'da 2x yakınlaştırmada keskin.
- Hero'da pencere, plaka ve telefon katmanları okunuyor. Pencere kenardan taşıyor, telefon üstüne biniyor.
- Her yuva 23.2 tablosundaki boyutta (±10%).
- Hiçbir kutu boş ya da bulanık değil.
- CLS ≤ 0.02 ve LCP metin.
- Fotoğraf kullanıldıysa 23.2'deki beş koşulun hepsi sağlanıyor ve kredisi doğru.
- Fiş fotoğrafı, alakasız stok fotoğraf ya da Luca taklidi yok.

**Renk paleti (9 için):**
- 23.1 tokenları uygulanmış.
- İki temada da bütün metin çiftleri AA, ölçümü yazılmış.
- Vurgu her masaüstü ekranında %5'in altında, mavi yalnız sayılan yerlerde.
- Yüzeyler ton adımıyla ayrılıyor ve her ekranda en çok bir gölgeli katman var.
- Koyu tema lacivert değil, nötr; yanıp sönme yok.

**Kompozisyon ve tipografi (9 için):**
- Komşu bölümler farklı.
- Her ekranın bir baskın öğesi var, yarım ekrandan uzun boşluk yok.
- Başlıklar iki satırı geçmiyor ve kenar boşlukları eşit.
- Yazı boyları her genişlikte 6'yı geçmiyor.

**Panel mikro etkileşimleri (9 için):**
- 23.4'teki on madde çalışıyor.
- Hiçbir hareket 240ms'yi geçmiyor (okuma kartındaki bekleme göstergesi hariç).
- Hiçbiri işi bekletmiyor ve klavyeyle de tetikleniyor.

**Erişilebilirlik ve sağlamlık (9 için):**
- JS kapalıyken her bölüm tam içerikle görünüyor.
- Uçan kopyalar ve basamak yuvaları `aria-hidden`, gerçek değerler okunuyor.
- Spotlight klavyeyle çalışıyor.
- `npm test`, typecheck, lint ve build geçiyor.
- `inspect.mjs` 0 FAIL veriyor; her WARN tek cümleyle savunulmuş (gölge WARN'ı 23.1'deki cümleyle).

**Tavanlar:**

| Durum | Hangi puan | Tavan |
|---|---|---|
| Ana sayfada raster ekran görüntüsü var | Görseller | 6 |
| Herhangi bir öğe bulanık | Görseller | 6 |
| Tarama çizgisi ya da damga duruyor | Animasyon | 6 |
| Reduced motion'da içerik eksik | Animasyon | 5 |
| JS'e bağlı gizli içerik var | Genel | 5 |
| `transform`, `opacity` ve `clip-path` dışında bir özellik canlandırılıyor | Animasyon | 7 |
| CLS 0.05'in üstünde | Görseller | 7 |
| İki ve daha fazla gölgeli katman var | Renk | 7 |
| inspect FAIL veriyor | Genel | 6 |
| Uydurma müşteri ya da istatistik var | Genel | 4 |

### 23.6 Uygulama notları (ana sayfa, giriş ve kayıt; 2026-11-05)

- "Bir fişin yolu" yapışkan sahnesinde dördüncü durumun zemini `--field-4` (mavi) değil `--deep`: sayfanın tek mavi alanı CTA olarak kalır (23.1 vurgu oranı). 1100 altında dört alan eskisi gibi `--field-1..4`.
- Etkin olmayan cümlelerin opaklığı 0.45 değil 0.56: 0.45 açık temada 2.7:1 ölçüldü, 0.56 büyük metin için 3:1'i geçer.
- Plaka taşması komşusu olan kenarda kolon boşluğu kadardır (24px), dış kenarda 48px (`--pl`, `--pr`); 48px her iki yanda komşu metnin üstüne biniyordu.
- Giriş ve kayıtta öne binen katman fiştir (`drop-shadow`, yırtık kenarı izler); kart plakasının üstünde.
- inspect WARN savunmaları: fotoğraf ve video yok (23.2: koşulları tutan fotoğraf bulunmadı, varsayılan telefon çerçevesi); 1440'ta sağ kenar 69px (hero penceresi durgun halde `scale(0.96)` eğik, kaydırmayla düzleşir ve görünüm kenarına taşar).

### 23.7 Uygulama notları (panel; 2026-11-05)

- Odometre ve iki yuvalı kayma (`Roll`) tek bileşen ailesi (`components/home/Odometer.tsx`), stili `globals.css`te; panelde `--odo-t` 240ms (durum pill'i 220, okuma aşaması 200). Toplam şeridi yazarken değil, 300ms duraklamadan sonra oynar; reduced motion'da beklemez. Sekme sayaçlarındaki view-transition kaymasının yerine geçer.
- Okuma kartı: tamamlanan aşamaların listesi yerine tek satır, yalnız etkin aşama kayar; yanında üç nokta (yalnız `opacity`). Tarama çizgisi ve `top` animasyonu kaldırıldı.
- Fiş izi bağ çizgisi panelde 240ms açılır (23.3.5'teki 360 yerine; panel tavanı 240), satırın tarafından fişe doğru, yalnız 1100px ve üstünde. Ekranın geri kalanı sönükleşmez: çalışma ekranında yalnız işaret ve çizgi.
- Liste satırı: sağ boşlukta küçük "Aç" oku (işaretçili masaüstü, 901px ve üstü).
- Denge onayı `clip-path` ile çizilir. Onayla'nın ton geçişi zaten `--t-hover` (180ms) ile vardı, değişmedi. Luca dosyası çubukları zaten `scaleX` 320ms idi.

### 23.8 Palet tur 2: taş nötrler, tek renk mavi (2026-11-05; 23.1'deki açık tema nötrlerinin üstündedir)

Jüri: açık temanın bütün yüzeyleri aynı pudra mavisi-gri tonundaydı; mavi vurgu kendi alanında kayboluyor, sayfa kurumsal şablon gibi okunuyordu. Karar: açık temada nötrler mavi tondan çıkar, çok düşük kromalı sıcak taş tonuna geçer (kanallar arası fark en çok 3-8 birim, R ≥ G ≥ B). Böylece defter mavisi sayfadaki tek renkli öğe olur. Koyu alanlar (vitrin, yolun son alanı, telefon ekranı) zaten `--deep`; o da sıcak siyaha geçer. Koyu tema nötrleri değişmez (jüri onayladı), yalnız derinlik sırası düzeltilir.

| Token | Açık (eski → yeni) |
|---|---|
| `--ground` | #f4f6f8 → **#f5f5f3** (`theme-color`, manifest ve çevrimdışı sayfa da) |
| `--raised` / `--stage` / `--active` | #f7f8fa / #e4e9f0 / #e8ebf0 → **#f8f8f6 / #e8e7e3 / #ebeae6** |
| `--border` / `--rule` / `--control-edge` | → **#e4e3df / #efeeeb / #84837d** (beyazda 3.8:1) |
| `--ink` / `--muted` / `--faint` / `--thermal-ink` | → **#121211 / #4e4d48 / #5e5d57 / #514f4a** |
| `--primary` / `--secondary` | → **#171716** (hover #2c2b29) / **#e8e7e3** (hover #dcdbd6) |
| `--deep` / `--deep-raised` / `--ink-on-deep` / `--muted-on-deep` | → **#131312 / #20201e / #f0efec / #aeada7** |
| `--plate` / `--bezel` | → **#eae9e5 / #1a1a18** |
| `--field-1..3`, `--split`, `--show-field`, `--show-tabs` | → **#e7e6e1, #dad8d2, #cbc8c0**; `--split` #dad8d2 (zemine 1.31:1) |
| `--paper` / `--paper-ink` / `--paper-strong` | #ffffff / #4f5a67 → **#faf8f3 / #3d3c38 / #121211**: fiş kâğıdı beyaz pencereden bir ton ayrılır ve nesne olarak okunur; mürekkep koyulaştı, %72 opaklıkla geri çekilen fiş 4.6:1'de kalır |
| gölge ve perde rengi | rgb(15 20 27) / rgb(20 26 34) → **rgb(18 18 17)** |

Koyu tema: `--plate` #111418 → **#1d2228** ve `--split` #1d2229 → **#0f1216**. Eski sırada plaka sahne alanından koyuydu, pencerenin çevresinde çukur ya da sert ofset gölge gibi okunuyordu. Yeni sıra: zemin #0b0d10 < sahne #0f1216 < pencere `--surface` #14171c < plaka #1d2228. Plaka artık pencereyi taşıyan yükseltilmiş bir taban. Koyu `--paper-ink` #33363a (geri çekilmiş fişte 9.9:1).

Ölçülen (WCAG): açık `--ink`/`--ground` 17.2, `--muted`/`--ground` 7.8, `--muted`/`--split` 5.9, `--faint`/beyaz 6.6, `--faint`/`--plate` 5.4, `--faint`/`--split` 4.6, `--accent`/`--ground` 6.4, `--ink`/`--paper-lit` 14.9, `--muted-on-deep`/`--deep` 8.3. Telefonda vitrin açıklaması (`.show-cap-text`) koyu alanda `--muted` yerine `--show-soft` kullanır.

Hareket: durum sayfasındaki Luca çizgisi `stroke-dashoffset` yerine `clip-path: inset(0 100% 0 0)` → `inset(0)` ile çizilir (23.3'ün transform/opacity/clip-path kuralı). ReviewEditor satır anahtarları modül sayacından değil satır indeksinden gelir (yeni satırlar bileşen içi `useRef` sayacı), sunucu ve tarayıcı aynı `data-key`'i yazar; hydration uyarısı ve FLIP'in yanlış satırı bulması kalktı.

### 23.9 Tur 2 hareket ve kompozisyon: ana sayfa, giriş ve kayıt (2026-11-05; 23.2, 23.3 ve 23.6'daki ilgili satırların üstündedir)

Jüri tur 1 (animasyon 5, görsel 6, premium 7, mobil 6): büyük anlar görünmeden oynuyordu, hero durgun halde bulanıktı, fiş giriş/kayıtta hâlâ yazıcıdan iniyordu. Kararlar:

- **Hero penceresi:** durgun halde eğim yok, tam boyutta ve düz durur (yeniden örnekleme bulanıklığı kalktı). Eğim yalnız yüklemede bir kez: `perspective(1600px) rotateX(10deg) translateY(24px) scale(0.95)` → düz, 1100ms `--ease-expo`, 120ms gecikme; telefon 320ms'de biner. Kaydırmaya bağlı eğim kaldırıldı (23.3.2'nin yerine). Başlık satırı maskede %72'den yükselir, 700ms. Pencere en az 540 (tablet 500) yüksek: Market'in beş satırı pencereyi ve telefonu oynatmaz.
- **Tezgâh seçicileri:** seçili seçenek siyah dolgu değil, `--surface` tab, mürekkep etiket ve 1px `--control-edge` iç kenar; seçili olmayanlar zeminsiz `--muted`. Telefonda (≤640) Luca satırları kartı seçicilerin hemen altında, telefon kartın altında ortalı ve üst kenarı kartın altına 40px girer; telefon içeriği kadar uzundur. Tablette telefon 240.
- **Termal fiş:** kalem adı tek satır, sığmazsa üç nokta (ÖKC gibi sabit kolon); kelime ortasından kırılmaz.
- **Bir fişin yolu:** dört cümle satırından sonra 60vh bekleme satırı; sahne ve kart 2-7 satırlarını kaplar, "Aktarıldı" yaklaşık 450px yapışkan kalır. Kart 520 geniş, 15-16px, içerik kadar uzun ve tepeden akar. Durum değişimi önce çıkış (120ms `--ease-exit`), sonra giriş (200ms, 120ms gecikme); iki düzen üst üste basılmaz. Durum `--on` özel özellik zinciri yerine doğrudan seçiciyle; sahne `contain: layout paint`. Etkin olmayan cümle 0.72 opaklık. Dördüncü alan her genişlikte ve JS yokken de `--deep` (masaüstü perdesinde `--deep` ile `--field-3` karışımı, siyaha sert sıçrama yok).
- **İmza (kural sahnesi):** Luca hücreleri 18px, fiş 15px. Uçan kopya `--surface` üstünde `--accent-soft` bir çip: geçtiği fiş metnini örter, çift baskı olmaz; kalkışta ölçek fiş boyundan 1.45'e çıkar, hücre boyuna iner. Kaynak rakam uçuş sürerken kâğıttan kalkar (opaklık 0) ve iniş sonrası geri basılır. Kaydırma aralıkları: işaretler %4-26, uçuşlar %8-58, kodlar %60-82, kapanış %82-94; iz 220vh yerine 170vh. Yapışkan üst en az 96px. Fiş geri çekilmesi `opacity 0.9` ve `scale(0.97)` (0.72 yerine, AA). Pencere sabit yükseklik yerine içerik artı 72px boş alt bant; dengesiz kart 420 geniş, sağa yaslı, yalnız bu banda biner, Onayla ve "Dengede" örtülmez. Telefonda zamanlı dizi `.rule-ledger` %60 görününce başlar ve fişin kalem satırları gizlenir, sahne tek ekrana sığar.
- **Kontrol ekranından Luca'ya:** dört bölünmüş bölümden biri kırıldı: sekmeler tek şerit olarak pencerenin üstünde, yanında parçanın cümlesi; pencere on iki kolonun tamamında, 452 yükseklik (en uzun parça). Seçili sekme beyaz değil, `--deep-raised` üstünde bir ton adımı. Parça değişince yeni içerik 8px yükselerek 220ms'de gelir; SSS yanıtı da aynı ve 24-28px, 30ch. Tablet ve telefonda sekmeler sarılır (ekran kenarında kesik metin yok).
- **Spotlight:** her kaynak alandan bir çizgi, değerin metin sonundan başlar ve okuma panelinin boş yanını geçerek satıra gider; pencere yeniden boyutlanınca kapanır. 760 altında çizgi yok, yalnız işaret.
- **CTA:** vizör bir masa tonu, fiş -2.5 derece; vizör kırpar, telefon taşmaz; alt satır "Önceki fiş 0047". Telefonda telefon 280 ve fiş kalemleri gizli.
- **Üst çubuk:** kutu yok; tam genişlik, sayfa kenar boşluklarında, kaydırılınca zemin tonunda bir şerit.
- **Maket düğmeler** (`[data-ui] span.btn`): imleç, hover ve basış yok.
- **Giriş ve kayıt:** `auth-print`, satır ve denge girişleri kaldırıldı. Yalnız form 12px yükselir (500ms) ve kart plakasına oturur (300ms, 200ms gecikme); her şey 600ms'de durur.
- **Performans:** katlama altındaki bölümler `content-visibility: auto`; odometrede `clip-path` yalnız dönen basamakta; çerez notu yalnız değer değişince render eder; marka bağlantısı `prefetch={false}`; arka planda açılan sekme `js` bayrağını ilk görünüşte alır. Ölçülen (prod, 4x CPU): tezgâh tıklaması 168/96/72ms; 7000px tekerlek kaydırmada uzun görev yok, en uzun kare 49ms (1440) ve 35ms (390).
- inspect WARN savunmaları: fotoğraf ve video yok (23.2); 1440'ta sağ metin kenarı 73px (sağa yaslı olmayan metin bloklarının bitişi, çerçeve iki yanda 40px).

### 23.10 Tur 2 panel hareketi ve mavi sınırı (2026-11-05; 23.4 ve 23.7'deki ilgili satırların üstündedir)

- **Liste → fiş geçişi:** React bu geçişte kök çapraz solmasını iptal eder; eski liste ilk karede gider. Bu yüzden yeni ekranın gövdesi gecikmesiz gelir (160ms, opacity ve 6px yükselme). Uçan başlık kendi katmanında kalır. Sabit alt bar (`.action-bar`) ve rail krom sayılır, hiç solmaz. Hiçbir karede ekran boş kalmaz.
- **Odometre panelde:** basamak süresi 192ms, basamak başına 8ms gecikme; altı basamak 240ms'de biter (tavan 23.4). Ana sayfa 24ms aralıkla kalır (`--odo-stagger`).
- **Odometre seçimi:** görünen basamaklar seçilir ve kopyalanır; ekran okuyucu metni seçime girmez, tutar iki kez yapışmaz.
- **Kilitlenme:** onaylanan alanların kenarı ve iç boşluğu aynı karede gider (geçiş yok); metnin kenarlığa yapıştığı ara kare olmaz.
- **Satır silme:** görünmeyen sekmede çıkış animasyonu beklenmez, satır hemen silinir; sekme animasyon ortasında gizlenirse 200ms zamanlayıcı silmeyi tamamlar.
- **Durum işareti** (hata ve çevrimdışı sayfaları): mavi çizgi clip-path ile 240ms'de çizilir.
- **Mavi yalnız Luca'ya giden rakamda:** `Onaylandı` pill'i nötr zeminde mürekkep noktayla gösterilir (her yerde: panel, ana sayfa, giriş kartı). "Gider hesaplarına göre" çubukları gri, en büyük hesap mürekkep; Luca dosyası çubuğu mürekkep. Tutarlar mavi kalır.

### 23.11 Tur 3 palet ve tasarım sistemi: tek sıcaklık, tek birincil eylem, kopyalanabilir rakam (2026-11-05; 23.1, 23.8 ve 23.10'daki ilgili satırların üstündedir)

Jüri tur 2 (renk 7, işlev 7, erişim-perf 7, mobil 6.5): iki tema iki ayrı sıcaklıktaydı (açık sıcak taş, koyu soğuk mavi-siyah); birincil eylem ana sayfa ve giriş/kayıtta mavi, panelde mürekkepti, koyuda pastel mavi düğme tebeşir gibi duruyordu; odometreli tutarlar seçilip kopyalanınca her basamak ayrı satıra düşüyordu. Kararlar:

- **Koyu nötrler de sıcak taş:** açık temayla aynı aile, kanallar arası fark 1-4 ve R ≥ G ≥ B. Ton sırası ve parlaklık adımları korundu, yalnız kroma değişti. `--ground` #0c0c0b (`theme-color` ve çevrimdışı sayfa da), `--surface` #151513, `--raised` #1c1c1a, `--stage` #1d1d1b, `--active`/`--secondary` #262523, `--border` #2a2926, `--rule` #21201e, `--control-edge` #75736d, `--ink`/`--primary` #f0efec, `--muted`/`--thermal-ink` #aeada7, `--faint` #9c9a94, `--deep` #181816, `--deep-raised` #242422, `--plate` #1f1f1c, `--bezel` #2e2d2a, `--split` #10100f, alanlar #151513 / #1b1b19 / #22221f / #2a2a27, `--lift` #272725, `--paper` #dcdad5 (krem fişin koyu karşılığı), `--paper-ink` #383733. Mavi değişmez: `--accent` #8db0e0, `--accent-soft`, `--accent-field` #23406a ve `--paper-lit` mavi kalır; sayfadaki tek renkli öğe odur.
- **Tek birincil eylem:** her yerde `.btn-primary` (açıkta mürekkep #171716, koyuda açık nötr #f0efec): ana sayfa hero'su, üst çubuktaki Hesap oluştur, giriş ve kayıt formu, panel. `.btn-accent` ve `--on-accent` kaldırıldı. Mavi yalnız Luca'ya giden rakamlarda, bağlantılarda, odak halkasında, imza ve spotlight çizgilerinde ve CTA'nın tek renk alanında. Bu, 23.1'deki "mavi: birincil düğme" satırının yerine geçer.
- **Odometre seçimi:** `.odo-digits` `inline-flex` değil `inline` (ve `nowrap`); flex öğeleri blok sayıldığı için seçim her basamaktan sonra satır sonu ekliyordu. Ölçüldü (getSelection): panel toplamı "8.725,00", KDV "793,18", sekme sayacı "10", hero tablosu "770.08 … 7.931,82 … 8.725,00"; panel ve liste ekranında rakam içinde satır sonu yok.
- **İmza başlangıcı:** telefonda Luca kartı %60 göründüğünde ölçüm bir karede (bölüm content-visibility ile çizildikten sonra), dizinin başlaması bir sonraki karede. 390, DPR 2, 4x CPU: imza başlangıcındaki en uzun kare 82-97ms'den 0-62ms'ye indi (dört koşu); 1x'te 0-58ms. Kalan pay React'in belgedeki `animationstart` dinleyicisi (aynı anda başlayan animasyon sayısıyla büyür).

Ölçülen kontrast (WCAG, koyu): `--ink`/`--ground` 17.0, `--muted`/`--surface` 8.1, `--faint`/`--raised` 6.1, `--faint`/`--lift` 5.3, `--accent`/`--ground` 8.8 ve `--lift` üstünde 6.7, `--control-edge`/`--surface` 3.9 ve `--lift` üstünde 3.2 (1.4.11), `--on-primary`/`--primary` 16.7, `--paper-ink`/`--paper` 8.5, `--muted`/`--deep` 7.9.

### 23.12 Tur 3 ana sayfa, giriş ve kayıt: uçuş yolu, tek kart, mavi malzeme (2026-11-05; 23.2, 23.3, 23.6, 23.9 ve 23.11'deki ilgili satırların üstündedir)

Jüri tur 3 (animasyon 6.5, görsel 6.5, renk 7, premium 7, mobil 6.5, erişim-perf 7): uçan çip kâğıttan ayrılmadan yana kayıp yanlış satırın hizasında duruyordu; "Bir fişin yolu" slayt gibi değişiyordu ve yarısı boştu; açık temada geniş macun grisi alanlar; aynı fiş 0047 her yuvada. Kararlar:

- **Uçuş yolu:** çip kaynağın üstünde belirir ve kaynak aynı %2'de kâğıttan kalkar (çift baskı yok). Önce yerinde büyür, Y ekseni önden gider (`--ease-out`, %4'ten sonra), X %24'e kadar bekler sonra `--ease-in-out` ile kayar: çip kâğıdın üstünde hedef satırın yüksekliğine çıkar, sonra o satır boyunca sağa gider; başka bir hesabın yanında durmaz. Kaydırma aralıkları: işaretler %2-24, uçuşlar %4-48, kodlar %50-68, kapanış %68-78; son %20 sabit sahnede son durumda kalır (Onayla açık görünür).
- **Zamanlı mod (telefon, tablet):** tetik `.rule-close` üçte biri görününce (ya da sahne çoktan geçildiyse hemen). Kodlar baştan görünür, tutarlar 0.25 tonda bekler, denge şeridi 0.4'te; boş kart ve boş bant yok. Yazdırmada son durum.
- **Bir fişin yolu (masaüstü):** tek kart kabuğu ("Fiş 0047" ve durum pill'i) sabit kalır; pill Çekildi > Taslak > Onaylandı > Aktarıldı iki yuvalı kayar; yalnız gövde değişir (120ms çıkış, 200ms giriş ve 6px oturma; `path-lift` sıçraması kaldırıldı). Kart 640x440, sahne `100vh - 56px`. Cümleler 44-46px (bölüm başlığı 52, h1 76), her cümle kendi satırını doldurur ve satır geçerken ekranın ortasında yapışık kalır; satırlar 56vh, bekleme 36vh. Etkin durum ekranın orta çizgisinin içinde olduğu cümle kutusundan (`rootMargin: -50% 0px -50% 0px`): PageDown, çapa ve sayfa ortasında yenilemede de doğru. Perde `clip-path` yerine `transform: translateY(100%)` → 0 (kompozitör).
- **Alan renkleri, tek aile:** `--path-1..4` açıkta #eae9e5 (plaka), #cfdcee (açık defter mavisi), `--accent-field`, `--deep`; koyuda #1f1f1c, #1c2638, `--accent-field`, #0e1a2e (zemine 1.12). Mavi burada bir malzeme: fiş kâğıttan Luca mavisine geçer. Bu, 23.1'deki "tek renk alanı CTA" kuralının istisnasıdır: yolun üçüncü durumu ve CTA iki mavi alandır; %5 vurgu ölçüsü bu iki alan dışındaki ekranlar içindir. Telefonda dört kart aynı tonlarda, üçüncü ve dördüncü alanda metin `--on-accent-field`.
- **Mavi derinleşti:** `--accent-field` #2b5a9a → **#1d3f73** (beyaz 10.4:1), koyu #23406a → **#1a2f52** (`--on-accent-field` 11.6:1, `--accent` 6.0:1). `--accent` değişmedi.
- **Hero:** sahne `--split` yerine `--plate` ve üst çubuğun altından (64px) başlar; pencerenin ikinci plakası kaldırıldı (sahnenin kendisi plaka). Eğim `rotateX(13deg) translateY(40px) scale(0.95)`, telefon 520ms'de. Örnek fiş değişince fiş kâğıdı 200ms solarak ve 8px yükselerek gelir, yeni satırlar 180ms 8px düşüşle; uzunluğu değişen tutar (8.725,00 → 480,00) basamak basamak değil tek blok olarak kayar (ara tutar yok). KDVK notu nötr `--raised` zeminde mürekkep metin, solda 3px `--warn-ink` çubuk. Telefonda (≤640) önce telefon (280), Luca kartı telefonun alt 40px'ine biner; telefonun üstü ilk ekranda.
- **Vitrin:** "Fiş ve satırlar" Market 2214 fişini okur (iki oran, iki gider ve iki 191 satırı, `journalFor` ile); okunan alanlar tek satır (etiket solda, değer sağda). Spotlight çizgileri kaynak sırasıyla satırın üstünden altına 8px aralıkla iner, kesişmez; sönükleşme 0.7. Koyu temada vitrin alanı `--show-ground` #1d1d1b, plaka `--show-plate` #2a2a27, kart #262623 (zeminden ayrılır). "Luca dosyası" parçası 38 / 50 ve 296 / 400 gösterir (aşım gibi okunmaz). Telefonda pencere en az 470 (sekme değişince altı oynamaz).
- **Kural sonrası:** not ve dengesiz kart aynı üst kenarda.
- **CTA:** vizör iki temada aynı koyu masa tonu (`--deep-raised`); fişin altında tek yumuşak gölge (`drop-shadow`, ekranın tek gölgeli katmanı); köşe kılavuzları telefon görüne girerken bir kez yerine oturur (kaydırmaya bağlı, `translate`/`opacity`). Telefon 340, metin dikeyde ortalı.
- **Koyu tema:** fiş kâğıdı #dcdad5 → **#e9e6df** (`--paper-ink` 9.4:1); telefon çerçevesinde 1px `--edge-hi` dış kenar.
- **Rotalar:** ikincil satırlar küçük boyda (14px); telefonda değer etiketin altında.
- **SSS:** odak soruyu açmaz; açmak tıklama/Enter/Space ile, masaüstünde odak yalnız önizler (`aria-expanded` değişmez).
- **Performans:** katlama altındaki bağlantılar (üst çubuk bölüm bağlantıları, CTA, footer) `prefetch={false}`; hero ve üst çubuktaki Hesap oluştur/Giriş yap önceden yüklenir. Hero penceresi ve telefonu `contain: layout style`.
- **Giriş ve kayıt:** plaka kartın her yanından eşit 24px (telefonda 12px) taşar; telefonda çerez notu için alt boşluk sabit (not istemcide yüklenince sahne kaymaz).

### 23.13 Tur 3 panel: başlık tek başına uçar, kanıt editörün üstünde, okuma kartı düğmenin yerinde (2026-11-05; 23.4, 23.7 ve 23.10'daki ilgili satırların üstündedir)

- Liste satırından fişe geçişte (`fis-ac`) başlığın komşuları (yol, durum pill'i, bulgu cümlesi) 200 ms bekler ve 120 ms'de solarak gelir; başlık 240 ms'lik uçuşunu tek başına yapar, uçan başlık çizilmiş cümleyi ya da yalnız kalan pill'i hiç kesmez. Gövde 23.10'daki gibi gecikmesiz yükselir.
- 1100 px altında (fiş sütunu satırların altına düşer) `.read-brief` şeridi Matrah, KDV ve Toplam'ı satırların ve uyarıların üstünde tek satırda gösterir; odaktaki satırın kaynağı bu şeritte yanar, yani telefonda fiş izi ekranda kalır. "Fişi göster" (fotoğraf varsa) ya da "Tüm alanlar" bağlantısı tam "Fişten okunan" bölümüne iner. Masaüstünde şerit yoktur.
- Telefonda galeriden okuma kartı düğmenin kendi yuvasına oturur (yuva genişliğinde, birkaç px yüksek, sekmelere değmez); boş bant kalmaz. Alt çubuktaki Fiş çek ile başlayan okumada kart alt çubuğun üstünde kalır, listenin alt boşluğu kartın yüksekliği kadar büyür, son satır kartın altında kesilmez.
- Hesap penceresinin `h2`'si yerinde kalır: kapalı `dialog` `display: none`'dur, erişilebilirlik ağacında yoktur; açıkken modalın başlığıdır.

### 23.14 Tur 4 tasarım sistemi: tek uyarı dili, koyu temada yükselen pencere, erişilebilir çerez notu (2026-11-05; 23.1, 23.8, 23.11 ve 23.12'deki ilgili satırların üstündedir)

Kullanıcı kararı (tur 3'ten sonra, bağlayıcı): "çeşitlendirin, jüriler ne diyorsa yapılsın". Jürinin kritik, yüksek ve orta bulgularının hepsi uygulanır; yalnız güvenlik ve veri gizliliği kurallarıyla çelişen bulgu atlanır ve nedeni yazılır. Bölümler aynı beyaz tablo kartını ve aynı Fiş 0047'yi tekrar etmez; farklı fişler, ölçekler, kırpımlar ve en az bir malzeme anı gösterir. Telefonda ilk ekranda ürün görseli olur, vitrin Luca satırlarını kesmez, SSS cevapları JS kapalıyken de açılır (`details`/`summary`).

- Uyarı kutusu her yüzeyde tek dildir: `--raised` zemin, `--ink` metin ve başlık, solda 3 px `--warn-ink` çubuk (`inset` gölge). Panelde `.alert-warn`, ana sayfada `.counter-warn` ve `.ui-warn` aynıdır. `--warn-bg` (krem) artık uyarı kutusunda kullanılmaz; yalnız `.pill-warn`'da kalır.
- Koyu temada derinlik açık temayla aynı yöndedir: zemin < alan < plaka < pencere. Ürün parçalarının (`[data-ui]`) içinde `--surface`, `--raised`, `--border` ve `--rule` sırasıyla `--ui-surface`, `--ui-raised`, `--ui-border` ve `--ui-rule` olur. Açık temada bu tokenlar aynı değerdir; koyuda pencere `#252523`, plaka `#1d1d1b`. Bir bölüm `--raised` ya da `--rule`'u yerelde değiştiriyorsa `--ui-*` karşılığını da değiştirir (`.show`).
- Koyu bölüm alanları zeminden ölçülebilir biçimde ayrılır: `--split` `#171715`, vitrin alanı `#141413`, plakası `#20201e`, kartı `#2c2c29`. Hiçbir alan zeminin 1.03 kat yakınında kalmaz.
- Açık temada `--split` `#e2e1dc`'dir (eski macun grisi `#dad8d2` yerine); plaka (`#eae9e5`) onun üstünde açık kalır, `--faint` bu alanda AA'nın rahat üstündedir. `--split`, `--plate` ya da `--faint` değişirse `--faint`/`--split` çifti yeniden ölçülür (sınır 4.5).
- Panel eylem çubuğunun kenarı `--border`'dır (önceki `var(--control)` bir yükseklikti, kenar hiç çizilmiyordu).
- Çerez notu DOM'da atlama bağlantısından hemen sonradır (ana sayfa, giriş, kayıt): Tab, not en üstte görünürken ona ulaşır. Not içinde odak varken kaydırma onu gizlemez.
- İmza sahnesinin ilk ölçümü sahne bir ekran uzaklığa gelince yapılır; yüklemede `content-visibility` bölümü hydration görevinde çizdirilmez.

### 23.15 Tur 4 ana sayfa, giriş ve kayıt: her yuva kendi fişi, X önce uçuş, tam genişlik fark (2026-11-05; 23.2, 23.3, 23.9, 23.12 ve 23.14'teki ilgili satırların üstündedir)

Jüri tur 3 (animasyon 7.5, renk 7, görsel 6.5, premium 6.8, mobil 6.5, erişim-perf 6.5, işlev 6.5) ve kullanıcı kararı ("çeşitlendirin, jüriler ne diyorsa yapılsın", 23.14). Kararlar:

- **Her yuva kendi fişi:** hero tezgâhı Lokanta 0047 (seçicide Kırtasiye 0912 ve Market 2214), Bir fişin yolu ÖRNEK KAFE 0331, imza sahnesi ÖRNEK AKARYAKIT 1185 (%20, 1.791,67 / 358,33 / 2.150,00), vitrin Market 2214 ("Fiş ve satırlar"), Kafe 0331 ("Alacak hesabı"), 0047 ("Uyarı notları", ağırlama notu olan tek fiş), Kırtasiye 0912 ("Eklenti uyarısı"); rotalardaki Excel dosyası listedeki iki onaylı fişin 8 satırı (0047 ve 2214; 2 / 50 ve 8 / 400 sayaçlarıyla aynı); CTA vizöründe Kırtasiye 0912; giriş ve kayıtta Kafe 0331. Örnek adlar hep ÖRNEK biçiminde (samples.ts: ÖRNEK KIRTASİYE, ÖRNEK MARKET). Akaryakıt ve Kafe `samples.ts`'te `AKARYAKIT` ve `KAFE`, testle.
- **Bir fişin yolu, durum başına başka nesne:** Çekildi: vizör (koyu masa, iki düz ton, köşe kılavuzları, hafif eğik kâğıt); Taslak: kâğıt ve yanında okunan alanlar; Onaylandı: satırlar, büyük toplamlar ve Onaylandı düğmesi; Aktarıldı: sütun harfleri ve satır numaralarıyla Excel ızgarası (boş satırlar ızgaranın kendisi). Kart `min(540px, 100vh - 200px)`, sahnenin %60'ından fazlası; her gövde içeriğini dikey ortalar. Cümleler bölüm başlığıyla aynı boy (46 kalktı, sayfada 6 boy). Pill gövdenin girişiyle aynı 100 ms gecikmede kayar. Durum `.path-stage[data-active]` ve tek alanın `data-on`'u (bütün bölüm yeniden stillenmez); ilk durum bilinene kadar geçiş yok. Alanlar: açık #eae9e5, #e2e1dc (taş), `--accent-field`, #12294d (en koyu mavi; siyah levha kalktı); koyu #181b20, #1c2433, `--accent-field`, #12223d, kart `--path-shell` #262a30 (soğuk nötr, sıcak taş kart mavi alanda durmaz).
- **İmza uçuşu (masaüstü, kaydırmaya bağlı):** X önce gider: çip kendi satırının yüksekliğinde kâğıttan defterin henüz boş olan hesap alanına çıkar, sonra kendi tutar kolonunda hedef satıra iner ya da çıkar; hesap kodu ve adı birlikte (`.rule-code`) uçuşlardan sonra açılır, yani çip yolda hiçbir basılı metnin üstünden geçmez. Zirve ölçeği 1.4 → 1.15. Çip opak ve satır boyu (6 px üst ve alt pay). Kaynak rakam uçuşta 0.3 tonda kâğıtta kalır. Tire, çip hücreye girmeden (%70-78) söner. Telefonda (zamanlı) Y önce kalır, tetik `.rule-close` tamamen (≥0.9) görününce.
- **Fark, sayfanın ölçek anı:** imzadan sonra 360,00 footer wordmark'ıyla aynı boyda (tek boy, `--mark-size`), altında not ("Fark 360,00." kırmızı), dengesiz kart rakamın bitişinin altında; kart rakamın üstüne binmez. Bölünmüş düzen değil, tam genişlik. Kapalı Onayla bir `span` üstünde `aria-disabled` taşımaz: devre dışı görünüm (`.btn-off`) ve görünmez "(kapalı)".
- **Hero:** seçiciler pencerenin araç çubuğunda, pencerenin solunda panelin rayı (Fişler, Kurallar, Luca dosyası; telefon alt kısmına biner), başlık şeridi tam genişlik, pencere plakada dikey ortalı, 628 px sabit (Market sığar, seçimde kayma yok). Telefonda fişin altında "Okundu, Evrak No" ve "N satır hazır, Dengede" kutusu. h1 maskesiz ve hareketsiz (ilk karede tam). Telefonda (≤640) fiş kalemleri gizli, Luca kartı telefona biner ve seçiciler kartın üstünde: seçim ve sonucu aynı ekranda; ilk ekranda telefonun üstü ve fişin başı görünür; telefon yalnız dikey yükselir. Kâğıt değişimi aynı DOM'da tek Web Animation (yeniden mount yok); pencere ve telefon `contain: layout style paint`.
- **Odometre:** uzunluğu değişen tutarda eski değer yeni kutunun dışına taşmaz (`clip-path` yalnız taşma yönünde kesilir; panel de aynı bileşeni kullanır).
- **Vitrin:** 760 px altında "Fiş ve satırlar" tek kolon (alanlar iki sütun, sonra satırlar tam genişlik), kesik tablo yok. Pencere şeridi sekme adını değil ekranın adını taşır ("Fiş 2214, kontrol"); sekme adı yanındaki başlıkta tekrar edilmez. Seçili sekme zemini tek katman olarak yeni sekmeye kayar (şeridin kopyası, `clip-path` geçişi, `--t-ui`). Spotlight: okunan alan etiket ve değerden ibaret, panelin sağ yarısı boş; çizgiler değerin sonundan bu boşluğu geçip satırın kenarında tek noktada birleşir (uçlarda 4 px nokta). JS kapalıyken beş parça alt alta görünür (`.js` gizler).
- **SSS:** `details`/`summary`; JS kapalıyken her cevap kendi sorusunun altında açılır, masaüstü bölmesi yalnız `.js` ile.
- **Diğer:** özellik plakası panelin dört yanından eşit 24 px; rotalar `content-visibility` dışında (yapışkan kartın gölgesi kesilmez), Bir fişin yolu içinde; CTA köşe kılavuzları telefon tamamen görününce tamam (`entry 0% entry 100%`); çift çapa ofseti kalktı (yalnız `scroll-padding-top`); footer wordmark'ı iki kenar boşluğu arasına tam sığar; koyu temada pencere şeridinde `--edge-hi`; ürün parçalarındaki paragraflarda `text-wrap: pretty` yok.
- **Giriş ve kayıt:** renk kodunu anlatan altyazı kalktı; telefonda çerez payı form ile plaka arasında değil sahnenin dibinde.
- **Tek fotoğraf yolu (23.2), arama yapıldı:** Openverse ve Wikimedia Commons ("phone photographing receipt", "thermal receipt paper close up", "cash register receipt", "hand holding receipt smartphone") ve Unsplash ("thermal receipt"). Çıkanlar ya okunur marka ve fiş yazısı taşıyor (McDonald's, Albert Heijn fişleri, koşul 3), ya konu dışı (ödeme terminali turuncu zeminde, koşul 2), ya Unsplash+ (ücretli). Beş koşulu tutan yok: fotoğraf kullanılmadı; malzeme anı CSS kâğıtla (vizörde eğik, uzak ucu hafif kalkık, tek yumuşak gölge, masa iki düz ton).
- **Yapılmayan, nedeni:** dört font dosyasının ön yüklemesi kaldı (h1 ve gövde Türkçe karakter için latin-ext ister; ilk ekranda dördü de kullanılıyor). Çerez notunun kaydırma render'ı `CookieNote` (site bileşeni) alanında, bu turda dokunulmadı.

### 23.16 Tur 4 panel: onayda bloklar kayar, Fiş bilgileri satırların altında, sakin çubuklar (2026-11-05; 23.4, 23.10 ve 23.13'teki ilgili satırların üstündedir)

Jüri tur 3 panel bulguları ve kullanıcı kararı ("çeşitlendirin, jüriler ne diyorsa yapılsın", 23.14). Kararlar:

- **Onayda ve Taslağa al'da yeniden dizilim FLIP ile:** 23.10'daki "aynı karede, geçiş yok" kararının yerine geçer. İstek başarılı olunca blokların (başlık satırı, `.review` çocukları, telefonda fiş sütununun parçaları) ekran konumu ölçülür; kilitli görünüm gelince her blok eski yerinden yenisine 180 ms `translateY` ile kayar (yalnız transform, yükseklik animasyonu yok). Başlık da kayar: kısalan sayfa kaydırmayı geri çektiğinde durağan başlık kayan blokların altında kalmasın. Satır panelinin içi yerinde değişir (girdiler metne döner), yeni gelen Fiş bilgileri şeridi 180 ms'de solarak belirir. Reduced motion'da ölçüm yapılmaz, dizilim tek karede.
- **Fiş bilgileri satırların altında, eylemlerin önünde:** 1100 px ve üstünde düzenlenebilir Fiş bilgileri kartı sol fiş sütunundan sağ kolona, satır panelinin altına taşındı (dört alan tek sırada, Açıklama en geniş). Tab sırası Alacak hesabı, satırlar, Satır ekle, Fiş bilgileri, eylemler; odak kolon atlamaz (WCAG 2.4.3). Sol sütunda yalnız "Fişten okunan" kalır. 1100 px altında sıra değişmedi.
- **Gider hesapları çubukları:** en büyük çubuk mürekkebin %70'i, diğerleri `--faint`'in %55'i, iz `--rule`. Koyu temada hiçbir çubuk Fiş çek ile dikkat yarışmaz; vurgu değerin mavisi.
- **Okuma şeridi (`.read-brief`):** başlık ve rakam aynı sol kenarda (rakamlar `tabular-nums`); 390 px'te kolonlar kaymaz.

### 23.17 Tur 4 işlev, performans ve güvenlik: dar public CSP, imza sahnesi boşta kurulur (2026-11-05)

Jüri tur 3 işlev bulgusu (public CSP) ve erişim-perf bulgusu (4x CPU kaydırmada 217 ms LoAF), kullanıcı kararı (23.14). Kararlar:

- **Public CSP'de Cloudflare yok:** Turnstile yalnız giriş ve kayıtta yüklenir. `challenges.cloudflare.com` yalnız nonce politikasında (`connect-src`, `frame-src`) kalır; ana sayfa, /gizlilik ve 404 politikasında `script-src 'self' 'unsafe-inline'`, `connect-src 'self'`, `frame-src 'none'`. Build testi public politikada `cloudflare` geçmediğini doğrular.
- **Yapılmayan, nedeni:** public sayfalarda `'unsafe-inline'` yerine hash konmadı. Sabit olan yalnız iki layout scripti; App Router RSC yükünü build'e ve sayfaya göre değişen satır içi `<script>` olarak akıtır, bunu ancak nonce kapsar ve nonce statik prerender'ı dinamik render'a çevirir (LCP ve maliyet). Sayfada oturum, girdi ve ham HTML girişi yok; ödünleşim 23.17 itibarıyla aynı.
- **İmza sahnesi boşta kurulur:** `data-mode` yazmak sahnenin yaklaşık 20 animasyonunu başlatır ve 4x CPU'da yaklaşık 100 ms'lik bir stil geçişidir. Bu ilk ölçüm artık fontlar hazır olunca `requestIdleCallback` ile (Safari'de `setTimeout`) yapılır; sahneye yaklaşırken yalnız yeniden ölçülür (mod değişmediyse yazılmaz, okumalar yazmalardan önce). Ölçüm, aynı makinede iki koşu: kaydırmadaki 206 ile 250 ms'lik `IntersectionObserverCallback` LoAF'ı kalktı, en uzun kare 1440'ta 215 ile 250 ms'den 76 ile 104 ms'ye, 390'da 182 ile 215 ms'den 90 ile 118 ms'ye indi; CLS 0. Kalan 60 ile 120 ms'lik kareler script içermiyor (content-visibility bölümlerinin ilk render'ı ve makine yükü).

### 23.18 Tur 5 tasarım sistemi: tek mavi yol alanı, sıcak koyu yol, vitrin odağı, imza sahnesi play() ile (2026-11-05; 23.12, 23.15 ve 23.17'deki ilgili satırların üstündedir)

Jüri tur 4 (renk 7.5, mobil 7.5, erişim-perf 6.5, işlev 8) ve kullanıcı kararı ("çeşitlendirin, jüriler ne diyorsa yapılsın", 23.14). Kararlar:

- **Mavi alan yolda bir kez:** "Bir fişin yolu"nda yalnız son durum (Excel ile Luca'ya) mavi alandır; onay durumu taş ailesinin üçüncü adımı (açık `--path-3: #d6d4ce`, mürekkep metin). Sayfada mavi alan artık iki kez geçer: Luca'ya giden dosya ve kapanış (CTA). Mavi = Luca'ya giden şey.
- **Koyu yol sıcak taş:** koyu temada yol alanları ve kartları sayfanın taş ailesinden (`--path-1..3` #161614, #1c1c1a, #242422; kabuk #2e2e2b; kartlar #232321, #282826, #30302d, mavi alanın üstünde #2c2c29). 23.15'teki "koyu yol alanları soğuk aile" kararının yerine geçer.
- **Vitrin odağı:** vitrinin koyu zemininde odak halkası `--on-accent-field` (açık temada beyaz), ürün penceresinin (`.win`) içinde yine `--accent`. Halka iki zeminde de 3:1'in üstünde.
- **İmza sahnesi oynatması:** telefondaki zamanlı modda başlatma artık kök sınıf (`.is-playing`) değil, duraklatılmış CSS animasyonlarına `getAnimations({ subtree: true })` ile `play()`; oynatma anında yeniden ölçüm yok (boşta ve yaklaşırken ölçülmüş). Sınıf değişimi sahnenin bütün alt ağacının stilini yeniden hesaplatıyordu. Ölçüm (390, DPR 2, 4x CPU, gerçek tekerlek, üç koşu): y≈4000'deki 51 ile 93 ms'lik kare (stil/yerleşim 46 ile 57 ms, ya da 85 ms `FrameRequestCallback`) kalktı.
- **content-visibility yer tutucuları:** `.path`, `.show`, `.feat`, `.faq`, `.cta` için `contain-intrinsic-size` her düzende ölçülen gerçek yüksekliğe yakın (masaüstü, 1099 px altı, 640 px altı; örn. yol telefonda 2020 px, masaüstünde 2580 px). Bölüm yeniden tasarlanırsa değerler yeniden ölçülür.
- **Kalan uzun kareler:** Tracing izinde ana iş parçacığında 40 ms üstü görev kalmadı; kaydırmadaki 60 ile 90 ms'lik boşluklar headless Chrome'un GPU işleminde (`FinishPaintRenderPass`, yazılım raster) ve ana iş parçacığının commit beklemesinde. CPU kısıtlaması GPU işlemine uygulanmaz; bu bir ortam ölçüsü, sayfa işi değil.
- **Hero alt metnindeki 12 px:** yazı kayması değil. Web yazısı engellenmiş ve yüklenmiş iki yüklemede h1, alt metin ve düğme aynı konumda (88, 186, 312). Görülen 12 px, `home-load` giriş hareketi (500 ms, 12 px yükselme); metrik eşli yedek yazılar (globals.css) zaten yerinde.
- **Tema düğmesi:** `title` kalktı, ad yalnız `aria-label` (ekran okuyucu iki kez okumaz).
- **Çevrimdışı sayfa:** service worker önbellek adı `cevrimdisi-v2`; yüklü PWA'lar yeni paletli çevrimdışı sayfayı alır. Çevrimdışı sayfa değişirse ad artırılır.

### 23.19 Tur 5 tasarım sistemi: sayfada tek mavi alan, derinlik merdiveni, fotoğraf çerçevesi (2026-11-05; 23.18'deki "mavi alan iki kez" satırının üstündedir)

Koordinatör tur 4 planı (kullanıcı konuyla ilgili lisanslı fotoğrafı onayladı) ve renk jürisinin "mavi alan üç kez geçiyor" bulgusu. Kararlar:

- **Sayfada tek büyük mavi alan:** yalnız "Bir fişin yolu"nun son durumu (Excel ile Luca'ya giden dosya). Kapanış (CTA) artık taş alanı `--cta-field` (açık #dcdad4, koyu #1d1d1b), metin `--ink`, tek eylem sayfanın birincil dolgusu (`--primary`), odak halkası sayfanın `--accent`'i. Mavi = Luca'ya giden şey; küçük mavi (rakamlar, bağlantılar, logo çizgisi) değişmedi.
- **Derinlik merdiveni:** zemin < plaka (`--plate`) < pencere (`--ui-surface`) < pencerenin üstüne kalkan katman (`--ui-lift`). Açıkta pencere ve kalkan katman ikisi de beyaz, gölge ayırır; koyuda kalkan katman bir ton adımı yukarıda (`--ui-lift` #32312e, kenar `--ui-lift-edge` #45443f). Uygulandığı yerler: dengesiz kart (`.rule-card`), Luca dosyası (`.routes-file`), hero'da telefonun üstündeki pencere (`.counter-win .win`). Koyu `--shadow-lift` 1px siyah dış halka ve daha koyu düşen gölge taşır; koyu zeminde gölge tek başına görünmüyordu.
- **Fotoğraf çerçevesi (ortak, iki tema):** `.photo` sarmalayıcı (içinde `next/image`): köşe `--photo-radius` 0 (6.5), yüklenirken ve kırpım boşluğunda `--photo-mat` (plaka tonu), koyuda beyaz noktası düşük (`--photo-dim` 0.88, mat üstünde opaklık). Gölge yalnız fotoğraf başka katmanın üstüne biniyorsa: `.photo.is-lifted` (`--photo-shadow` = `--shadow-lift`). Fotoğrafın üstündeki HTML çipler `--ui-lift` yüzeyini kullanır.
- **23.18'den doğrulanan:** koyu yol sıcak taş (`--path-1..3`, kartlar), vitrin koyu zemininde açık odak halkası, content-visibility yükseklikleri, tema düğmesinde `title` yok, SW `cevrimdisi-v2`. Hero alt metnindeki 12 px giriş hareketidir, yazı kayması değil (metrik eşli yedek yazılar globals.css başında).


### 23.20 Tur 5 ana sayfa, giriş ve kayıt: iki lisanslı fotoğraf, kalıp kırıldı, durgun halde dönüşüm yok (2026-11-05; 23.2, 23.3, 23.6, 23.12, 23.15 ve 23.19'daki ilgili satırların üstündedir)

Koordinatör tur 4 planı (kullanıcı konuyla doğrudan ilgili lisanslı fotoğrafı onayladı) ve jüri tur 4 bulguları (görsel 6.5, premium 7.3, animasyon 7, mobil 7.5, erişim-perf 6.5). Kararlar:

- **Fotoğraf (23.2'deki "fotoğraf yok" ve CTA'daki "isteğe bağlı tek fotoğraf" satırlarının yerine):** iki fotoğraf, ikisi de okunur yazı, kart numarası, yüz ve marka logosu taşımıyor.
  - `public/gorseller/pos-fis-seridi.webp` (2400x1601, 46 KB): ödeme cihazından çıkan boş termal fiş şeridi, turuncu zemin. Towfiqu barbhuiya, Unsplash Lisansı (unsplash.com/photos/payment-terminal-with-white-receipt-xkArbdUcUeE).
  - `public/gorseller/termal-rulo.webp` (1190x1190 kare kırpım, 147 KB): elde iki rulo termal kâğıt. Acheolg, CC BY-SA 4.0, Wikimedia Commons (curid 156143903). Kırpım arka plandaki bulanık depo çalışanlarını dışarıda bırakır.
  - `next/image` statik importla (boyutlu, `sizes`, tembel), CSP `img-src 'self'` içinde. Kredi footer'da tek satır "Görsel kaynakları".
  - Aranıp elenenler (bakıldı): SumUp fişi (logo, unvan, VKN), Staples fişi (logo), UABB fiş yığını (etkinlik logosu), Epson, Square, Vagaro, Zettle ve Clover POS fotoğrafları (logo), Tamil bilet ve Hollanda fişi (okunur yazı, düşük kalite), CC0 Hollanda fiş yığını (yalnız 1024 px ve okunur kart satırı), kafe tezgâhı (odak dışı yüz). Pexels 403 verdi, hesap açılmadı. Üçüncü bir uygun fotoğraf bulunamadı.
- **Malzeme anı (yeni bölüm `.paper`, hero'dan hemen sonra):** fiş şeridi fotoğrafı tam genişlik, masaüstünde bir ekran yüksekliği (`min(100svh, 66.7vw)`), başlık "Termal fiş solar" ve tek cümle fotoğrafın boş sağ yarısında, her iki temada `--paper-strong` mürekkep (turuncu üstünde 7:1 ve üstü). 960 px altında metin fotoğrafın altında, telefonda 4:5 kırpım. Hareket: fotoğraf girerken çerçeveli kırpımdan (`clip-path` inset) tam genişliğe açılır, görüntü 1.06'dan 1'e iner (kaydırmaya bağlı, yalnız compositor). inspect "lopsided" WARN savunması: sol yarı fotoğrafın konusu (cihaz ve şerit), boş değil.
- **CTA:** CSS telefon ve vizör kalktı; termal rulo fotoğrafı (kare, 520 px) ve üstünde keskin HTML çipler: Kırtasiye 0912 nakit satırları (770.02 400,00, 191.03.20 80,00, 100.01 480,00) ve "Dengede". Çipler `--ui-lift` yüzeyi ve kenar, gölge yok.
- **Kalıp kırıldı ("başlık sol + plakalı pencere sağ" yalnız hero'da):**
  - İmza sahnesi bölünmüş değil: başlık ve cümlesi bir satırda (başlık 1-6, cümle ve üç eşleşme 7-12), pencere on iki kolon, plakasız; fiş 16 px, tutarlar 20 px, toplamlar 30 px, gövde 380 px fiş + defter. Uçuşlar ekranın yaklaşık üçte birini geçer.
  - Hesap planı paneli plakasız (metin ölçeğinde tablo). Rotalardaki Fişler penceresi plakasız. Plaka artık yalnız hero'da (sahnenin kendisi) ve yol kartında.
- **Durgun halde dönüşüm yok (bulanıklık):** yol vizöründeki fiş düz (rotate, perspective ve `filter` kalktı; masa bandı kalktı); imza sahnesinde fiş yalnız tonla geri çekilir (`opacity` 0.86, ölçek yok); hero eğimi 5 derece, 680 ms ve animasyon bitince `transform` yok. İmza sahnesinde uçuş sırasında pencereye kısa bir kamera itmesi (`scale` 1 → 1.015 → 1, kaydırmanın %2-66'sı), dinlenmede düz.
- **İmza sahnesi telefonda:** tetik fiş ve satırlar kartı birlikte ekrandayken (`.rule-body` %85, ekrandan uzunsa sığan kadarı). Bekleyen rakam çeyrek ton değil tiredir, kopya inince tek kez belirir: aynı rakam iki yerde görünmez. Denge şeridi oynayana kadar görünmez (zamanlı), masaüstünde 0.3 tonda yerini tutar. Telefonda plaka ve iç dolgu kalktı, tutar hücreleri 4.2em: hesap adları tek satır.
- **Bir fişin yolu:** Onaylandı durumu Borç ve Alacak ayrı kolonlu tablo (MiniLines). Yapışkan kart 480 px ve gövde başlığın altından başlar (dikey ortalama ve boş bantlar kalktı). Perde 560 ms, gövde ve pill 220 ms gecikmeyle: değişim perdenin kartı geçtiği anda. Kafe fişinde "FİLTRE KAHVE 2" (üç noktayla kısalmaz).
- **Hero:** rayda iki öğe (Fişler, Kurallar); telefon artık yazı kesmez. Yüklemeden 1.4 sn sonra bir kez, 1.8 sn: fişte TOPLAM ve ödeme satırları ile 331.01 satırı birlikte işaretlenir (spotlight, mevcut `hot` durumu); herhangi bir girdi ya da reduced motion ile hiç oynamaz. Telefonda kartın üstünde fiş çipi (satıcı ve TOPLAM, odometre): seçim ve değişen fiş aynı ekranda.
- **Vitrin:** sekmeler `role="tablist"`, `tab`, `aria-selected`, `aria-controls`, ok tuşları ve Home/End (roving tabindex); DOM'da pencereden önce (odak sırası görsel sırayla aynı). Telefonda tek satır, yana kayar, sayfa kenar boşluğu içinde (seçili sekme kendi dolgusunu taşır). inspect "side-scroll" WARN savunması: sekmeler kendi satırında yana kayar (app-screens §12, mobil jüri).
- **Erişilebilirlik:** spotlight satırının açıklaması alan adıyla birlikte ("%1 toplam 412,50"); çerez notu ana sayfada ve giriş/kayıtta DOM'da içerikten sonra (sabit konumlu, görünüm aynı).
- **Performans:** odometre ilk render'da düz metin, basamak yuvaları ilk değişimde açılır. Counter kökündeki kullanılmayan `--rows` kalktı. content-visibility yükseklikleri yeniden ölçüldü (CTA masaüstü 810, 1099 altı 750, telefon 950; yol telefonda 2190). Ölçüm (3318 production, 390 DPR 2, 4x CPU, 150 ms RTT, 1.6 Mbps, iki koşu): FCP=LCP 1436 ve 1608 ms, TBT 718 ve 1012 ms; 1440: LCP 1448 ms, TBT 516 ms. Jürinin profiliyle aynı makine ve koşu değil.
- **Efekt sayısı (23.5):** imza ve dört destek aynı; CTA vizörü kalktı, yol vizöründeki köşe kılavuzlarının kaydırma hareketi kaldırıldı. Malzeme bandının açılışı sayfanın tek "hareketli resmi"dir (taste-skill motion adım 9.4), destek sayılmaz; hero'daki tek seferlik spotlight mevcut Destek 4'ün ilk ekrandaki kullanımıdır.
- **Yapılmayan, nedeni:** hero'ya fotoğraf konmadı (hero sayfanın tek canlı öğesi tezgâh, 3.3; fotoğraf hemen altındaki bantta). Hero penceresinin altındaki yaklaşık 100 px boşluk kaldı (Market fişi sığsın diye 628 px sabit; seçimde kayma yok). TBT 200 ms'nin altına inmedi (ilk layout'taki asıl maliyet hero tezgâhı; `contain` zaten var). Video yok (konuyla ilgili lisanslı klip aranmadı, inspect WARN). Yol sahnesinde etkin durum görünüm ortasındaki cümleye bağlı kaldı (23.3.4).

### 23.21 Tur 5 panel: toplam şeridi eylem çubuğuyla aynı karede (2026-11-05; 23.7'deki "300 ms duraklamadan sonra" satırının üstündedir)

- Toplam şeridi (Borç, Alacak, KDV, Fark ve "dengede" durumu) eylem çubuğu ve başlıktaki bulguyla aynı değerlerden, aynı render'da gelir. Gecikme değer düzeyinde değil yalnız hareket düzeyindedir: tuşlar gelirken (son tuştan 300 ms sonrasına kadar) rakamlar odometresiz anında değişir; satır silmek gibi bütün satırı değiştiren bir eylem odometreyle yuvarlanır. Ekranın iki parçası bir an bile birbirini yalanlamaz (animasyon jürisi tur 4).
- Yapılmayan, nedeni: panel toplamlarının ve gider özetlerinin mavisini mürekkebe çekmek (renk jürisi, düşük) bu tur koordinatör planı dışında kaldı.

### 23.22 Tur 5 işlev, performans ve güvenlik: tezgâh seçimi geçişte, vitrin ilk ölçümü yaklaşınca, fikstürde ÖRNEK satıcı (2026-11-05)

Jüri tur 4 (işlev, erişim-perf, mobil) ve koordinatör tur 4 performans planı. Ölçüm: 3330 production, 4x CPU; yükleme 150 ms RTT ve 1.6 Mbps, 390 DPR 2; aynı makinede önce ve sonra. Kararlar:

- **Gizlilik:** test fikstürü, önizleme fikstürü ve dokümanlardaki gerçek örnek fişin satıcı adı ve VKN'si kalktı. Yerine "ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ" ve sağlama toplamı geçerli sahte VKN `1111111114`. Tutarlar, fiş no ve tarih aynı kaldı; bunlar kişiyi ya da işletmeyi tanıtmaz.
- **Tezgâh seçimi (INP):** seçici radyolar denetimsiz (`defaultChecked`, `autoComplete="off"`), seçim `startTransition` içinde işlenir. Tıklamanın karesinde yalnız tarayıcının kendi radyosu boyanır; satırlar, fiş ve odometre sonraki işte gelir, hızlı art arda seçimde geride kalan render'lar atılır. Fişin yükselme hareketi yeni fiş işlenince (layout effect) oynar. Ölçüm (6 tek seçim + 80 ms arayla 6 hızlı seçim): 390'da tek seçim 64-152 ms'den 32-64 ms'ye, hızlı seçim 192-248 ms'den 120-168 ms'ye; 1440'ta tek seçim 40-144 ms'den 40-56 ms'ye, hızlı 128-152 ms'den 96-120 ms'ye. Son durum son tıklanan seçimle aynı (Lokanta, Ortağın kartı, 8.725,00 dengede).
- **Vitrin sekme dolgusunun ilk ölçümü:** artık hydration'da değil, bölüm ekrana yarım ekran yaklaşınca (IntersectionObserver). Hydration'da okumak content-visibility bölümünü o işin içinde yerleştiriyordu (4x'te yaklaşık 50 ms zorunlu stil ve yerleşim). Ölçülene kadar seçili sekme kendi zeminini taşır.
- **Ölçülen, değişmeyen:** mobil LCP metin (hero-sub) 1.1-1.4 s, 2.5 s hedefinin altında; fotoğraflar ilk ekranda değil, tembel, `sizes` ile (828 px sürümler 10 ve 60 KB), CSP `img-src 'self'` yeterli, dış alan eklenmedi. Tam sayfa tekerlek kaydırmada 4x'te ana iş parçacığında 50 ms üstü uzun görev 0 (1440 ve 390); kalan 51-82 ms'lik LoAF'larda script ve stil payı yok (23.18'deki GPU ortam payı). CLS 0.
- **Yapılmayan, nedeni:** mobil TBT 450-560 ms (önce 540-600) 200 ms'nin altına inmedi. Kalan iki uzun görev React'in hydration'ı (4x'te 320-390 ms, framework chunk'ı) ve hemen ardından ilk ekrana yakın bölümlerin render'ı (stil 535, yerleşim 732 nesne, 200-290 ms). `.rule` ve `.routes`'a content-visibility A/B ölçüldü (üç koşu): fark gürültü içinde, eklenmedi. Web yazıları engellendiğinde de aynı iki görev duruyor, yani yazı geçişinden değil.

### 23.23 Tur 6 tasarım sistemi: sıcak taş ve defter mürekkebi, koyuda ayrılan bölümler, tek karede tema, yazı geçişsiz (2026-11-05; 23.1, 23.8, 23.11, 23.14 ve 23.19'daki ilgili satırların üstündedir)

Koordinatör tur 5 planı (madde 1-4) ve jüri tur 5 bulguları (renk 7, erişim-perf 7.5, mobil 7). Ölçüm: 336x production, 4x CPU; makine paralel jüri yükü altındaydı (CPU %57), aralıklar geniş. Kararlar:

- **Palet karakteri:** nötrler ölçülebilir sıcak taş, her tonda R > G > B. Açık: zemin #f4f1ea (R-B 10), sahne #e9e5dc, plaka #ebe7de, alan #e3ded3, CTA #ddd8cc; yüzey beyaz kalır. Koyu: zemin #100f0d, yüzey #1a1815, plaka #25221d. Mürekkep açıkta lacivert-siyah #141a22 (logo rengiyle aynı), birincil eylem de bu mürekkep. Vurgu daha derin defter mavisi: açık #1f4d9e (zemin üstünde 7,1:1, beyazda 8,0:1), koyu daha doygun #7fa7f2 (zeminde 8,0:1; eski pastel #8db0e0 kalktı). Luca alanı #132e63 (açık) ve #172f63 (koyu). Bütün metin çiftleri AA'nın üstünde (ink/zemin 15,5 ve 16,7; muted 7,6 ve 8,6; faint en düşük 4,8 CTA alanında). `theme-color` ve manifest yeni zeminle eşleşir.
- **Vitrin mürekkep alanıdır:** iki temada da lacivert-siyah ters bölüm (`--deep` açık #121826, koyu #1a2439). Bu Luca mavisi değil, mürekkebin kendisi; "sayfada tek mavi alan" (23.19) Luca dosyası için geçerli kalır.
- **Koyuda bölüm ayrımı:** komşu alanın zemine parlaklık oranı en az 1,2: vitrin 1,24, hero sahnesi ve plaka 1,21, CTA 1,22, yolun ilk alanı 1,21. Alanların üstündeki kartlar bir ton daha yukarıda (vitrin kartı 1,22, pencere plakaya 1,13).
- **Tema değişimi tek karede:** `applyTheme` ve sistem teması dinleyicisi artık `getComputedStyle` ile senkron stil hesabı yapmaz; dondurma sınıfı aynı işte eklenir, ilk kare onunla hesaplanır. Dondurma seçicisi `*` değil, yalnız renk geçişi taşıyan öğeler (a, button, label, summary, form alanları, tr, svg, .btn ve birkaç sınıf); sınıf kalkınca bütün sayfa değil yalnız onlar yeniden hesaplanır. Koyu tema artık yazı ağırlığını değiştirmez (`--w-medium` 500, `--w-strong` 600 iki temada): tema değişimi metni yeniden yerleştirmez. Ölçüm (tema düğmesi, üç basış): 1440'ta 936/888/304 ms'den 208-360/120-192/112-176 ms'ye, 390 DPR 2'de 328/376/96 ms'den 88-208/112-136/72-136 ms'ye; işlem süresi 3-15 ms.
- **Web yazısı `display: optional`:** ilk ~100 ms'de gelmeyen yazı o sayfa görünümünde metrik eşli yedek olarak kalır (ikinci ziyarette önbellekten gelir). Yazı geçişindeki tam sayfa yeniden yerleşim (4x'te 513 ms, 779 nesne) ve yüklemede görülen yazı sıçraması kalktı.
- **Hydration parçalı:** ana sayfada hero ve malzeme bandından sonraki yedi bölüm ayrı `<Suspense>` sınırında; React bunları kabuktan sonra ayrı işlerde hydrate eder. Hiçbir bölüm istemci bileşenine taşınmadı, DOM aynı.
- **İmza sahnesi telefonda:** zamanlı modda uçan parçalar mod kurulurken (boşta) `will-change: transform, opacity` alır; `play()` karesi katman oluşturmaz. 4x 390 tekerlek kaydırmada sahne bölgesinin en uzun karesi 56-118 ms (önce 181).
- **Mobil yükleme TBT (390 DPR 2, 4x, 150 ms RTT, 1.6 Mbps):** önce 909-1869 ms, sonra 392-1781 ms (aynı makine, yük altında). Kalan uzun görevler: ayrıştırma sonundaki ilk yerleşim (165-220 ms, temiz koşuda), framework chunk'ında kabuğun hydration'ı (250-480 ms) ve headless Chrome'un kendi `AIPageContentAgent` görevi (250-430 ms, 23.22'deki "stil 535, yerleşim 732 nesne" görevi budur; sayfadan değil tarayıcıdan gelir).
- **Yapılmayan, nedeni:** ilk tema değişimi 1440'ta hâlâ 200 ms üstüne çıkabiliyor (koyu değerlerin ilk soğuk stil hesabı, 933 öğe); sonraki basışlar ve telefon hedefin altında. TBT 200 ms'nin altına inmedi (kabuğun hydration'ı ve ilk yerleşim kaldı). Fotoğrafların renk işlemi (turuncu POS karesi) ana sayfa alanında, bu turda dokunulmadı.

### 23.24 Tur 6 ana sayfa, giriş ve kayıt: fotoğraf yok, kâğıdın kendisi malzeme, kaydırmaya yayılan uçuş, kendini kuran hero (2026-11-05; 23.2, 23.3, 23.12, 23.15 ve 23.20'deki ilgili satırların üstündedir)

Koordinatör tur 5 planı (A-G) ve jüri tur 5 bulguları (animasyon 6.5, renk 7, görsel 6, premium 7.2, mobil 7, erişim-perf 7.5, işlev 8). Bu turda `taste-skill:design-taste-frontend` ve `web-design-guidelines` çağrıldı. Kararlar:

- **Fotoğraflar kalktı (23.20'deki iki fotoğrafın yerine):** `pos-fis-seridi.webp` (turuncu, kart terminali, 1440'ta büyütülüp yumuşuyor) ve `termal-rulo.webp` (depo zemini, 1190 px) silindi, footer'daki "Görsel kaynakları" satırı da. Zayıf fotoğraf hiç fotoğraftan kötüdür (21). Unsplash ve Pexels'ta yeni arama yapılmadı: bu oturumda dosya indirme onayı yok ve 23.20'deki geniş arama uygun üçüncü bir kare bulamamıştı. Planın kendi yedeği uygulandı: malzeme sahnesi HTML/CSS. Bir gün fotoğraf gelecekse 23.2'deki beş koşul ve tek renk işlemi geçerlidir; kaynağın yarısından geniş CSS boyutunda gösterilmez.
- **Malzeme anı (`.paper`):** başlık ve cümle solda (1-5), sağda sayfa kenarına taşan bir masa (`--stage`, 6-12) üstünde listedeki otopark fişi 0768 (`OTOPARK` örneği, %20, 770.04) 20 px büyük baskıyla: masanın üst kenarından girer (rulodan kopmamış), tek kıvrımı düz ton adımı ve 1 px çizgiyle, altı kesik kenar. Luca satırları kartı kâğıdın kesik ucunun üstüne biner (ekranın tek gölgeli katmanı), kâğıttaki rakamları örtmez. Hareket: bölüm geçerken baskı satır satır, yukarıdan aşağı 0.2 tona solar (TOPLAM 0.4), kartın satırları tam mürekkepte kalır; kart 32 px yükselir. Kaydırmaya bağlı, yalnız opacity/transform; timeline yoksa, JS yoksa ya da reduced motion'da baskı tam ve hareketsiz. Telefonda masa kenardan kenara, kart kâğıdın ucuna 72 px biner.
- **CTA:** CSS telefon ve kamera ekranı geri geldi (23.2 varsayılanı), Kırtasiye 0912 vizörde; Luca satır çipleri telefonun sol kenarından metne doğru çıkar (metin ile görsel arasındaki boşluğu hikâye kapatır) ve bölüm girerken kademeli oturur (kaydırmaya bağlı, her çip %5 sonra). Telefonda çipler "Önceki fiş" satırının yerinde, telefonun ayağına biner. CTA dolgusu 96 px, footer'a 64 px.
- **Rotalar:** Excel kartı bölüm geçerken pencereden 24 px dışarı çıkar (kaydırmaya bağlı, 641 px ve üstü).
- **Hero ilk yükleme:** başlığın iki satırı maskesinde yükselir (900 ms, ikinci satır 90 ms sonra; yalnız CSS, ilk boyamadan, hydration'ı beklemez), alt metin ve düğme 20 px, pencere `rotateX(9deg) translateY(56px) scale(0.95)`'ten 1100 ms'de düzleşir, telefon 96 px aşağıdan 1000 ms'de oturur; `--ease-out` (expo değil), böylece 150/300/600/1000 ms karelerinde hareket görülür. Tek seferlik spotlight 1,2 sn'de. Reduced motion'da hiçbiri yok. 23.15'teki "başlık ilk karede tam" kararının yerine geçer.
- **Yedek yazı genişliği:** `Stack Sans Text/Headline Fallback` `size-adjust` 92 ve 91 (önce 109.72 ve 104.3; tarayıcıda ölçüldü, Arial gövdede %19, başlıkta %13 genişti ve h1 üç satıra düşüyordu), ascent/descent aynı satır kutusunu verecek şekilde ölçeklendi. Yazı gelmese de h1 iki satır.
- **Hero penceresi:** pencerenin dibinde Luca dosyası şeridi ("luca-fisler-AAAAGGGG.xlsx, 1 fiş, N satır", seçilen fişin tarihiyle); boş bant yok. Telefonda fişin ilk iki kalemi görünür, kâğıt ödeme satırından hemen sonra biter. Seçiciler ve Satırları kopyala JS gelene kadar `disabled` (JS yokken seçim fişi değiştirmediği için yanıltıyordu). "Dengede" yalnız denge değişince oynar.
- **Odometre:** uzunluğu değişen tutarda eski değer hiç çizilmez, yenisi kutusuna alttan yükselir: kırpılmış eski tutar (8.725,00 → "725,00") ya da etiketin üstüne taşan tutar hiçbir karede yok (23.15'teki taşma yönünde kesme kararının yerine). Hesap adı koduyla aynı 240 ms iki yuvalı kaymayla değişir.
- **İmza sahnesi:** track 220vh (120vh bekleme). Her uçuşun kaydırmada kendi beşte biri var: %4-26, %26-48, %48-70; Dengede ve Onayla %88-96. Kaydırmaya bağlı her parça linear (eğri tekerlekten gelir). Ölçüm: 100 px'lik yumuşak tekerlek adımı (130 ms) modelinde her uçuşun ana adımında 5-9 ayrı ara konum (önce 0-2). Başlangıçta hesap kodları ve adları çeyrek tonda yazılı (boş tablo değil), tutarlar ve toplamlar tire; kodlar %71-79'da tam mürekkebe geçer, toplamlar %78-86'da, son rakam indikten sonra (sonuç sebepten önce değil). Uçan çip kendi satırında çeyrek tondaki hesap adının üstünden geçer; opak olduğu için yarım harf bırakmaz. Çip, rakamı hücrede belirmeden önce görünmez olur (`visibility`), ikisi aynı karede üst üste durmaz (inspect covered-text). Kamera itmesi (`rule-push`) kalktı. Açık Onayla kapalının üstüne gelir, kapalı altında tam kalır: etiketsiz gri hap yok. Tutarlar 24 px, toplamlar 32 px. Telefonda (zamanlı) tetik denge şeridi tam görününce; şerit tirelerle baştan yerinde, boş bant yok.
- **Bir fişin yolu:** sahne karttan her yana 40 px büyük bir plaka (720 x 560), üst kenarı başlıkla aynı çizgide, ekran ortasında yapışır; kart plakanın %76'sı. Eski gövde 120 ms'de çıkarken yeni gövde 60 ms gecikmeyle 200 ms'de gelir; ölçülen karelerde kabukta görünen gövde opaklığı en düşük 0,64, toplam 0,86 (boş kare yok). Satır arası 55vh. Alan tonları komşusundan en az 1,14 ayrı: açık #ebe7de, #ddd8cb, #cdc6b6; koyu #25221d, #322e28, #403a32; kabuk #3a362f, üçüncü alanın kartı bir adım aşağıda #2e2a25 (mavi tutar 5,9:1; bir adım yukarısı mavi tutarı 4,1:1'e düşürüyordu). Dört kart düzeninde "Sonra fiş okunur" kartı fişin başını ve toplamlarını alanların üstünde gösterir (boş üst yarı yok). Yol bölümü ekrana bir buçuk ekran kala boşta çizilir (`is-near`), imza sahnesinin yaklaşma ölçümü de boşta.
- **Erişilebilirlik:** çerez notu ana sayfada atla bağlantısından hemen sonra (ileri Tab ilk durakta ulaşır; yarım ekrandan sonra çekildiği için sonda kalınca hiç ulaşılmıyordu). Vitrinde `tabpanel` rolü figure'dan sarmalayıcı div'e geçti, panel `tabIndex=0`.
- **Yapılmayan, nedeni:** yeni fotoğraf aranıp indirilmedi (yukarıda). Telefonda imza çipinin "Borç" başlığının üstünden geçmesi kaldı (opak, iki kare; düşük). 8 yazı boyu, menü açılış geçişi, telefonda çerez notunun yüksekliği, giriş/kayıt form genişliği (düşük bulgular) bu turda yapılmadı. Telefondaki yükleme sonrası uzun yerleşim görevi 23.23'te tarayıcının kendi görevi olarak ölçülmüştü; yeniden ölçülmedi.

### 23.25 Tur 6 panel: telefonda iki satırlık yevmiye satırı, Borç/Alacak anahtarı, toplamlar mürekkepte, tek tonlu çubuklar (2026-11-05; 23.10, 23.16 ve 23.21'deki ilgili satırların üstündedir)

Koordinatör tur 5 planı (panel 1-3) ve jüri tur 5 panel bulguları. `taste-skill:design-taste-frontend` (app-screens §12) ve `web-design-guidelines` çağrıldı.

- **Telefonda yevmiye satırı (720 px ve altı):** her satır iki satırlık kart. Birinci satırda hesap kodu (7,25rem) ve hesap adı. İkinci satırda Borç/Alacak anahtarı, satırın taşıdığı tek tutar ve dar Sil (44 px). Boş taraf formda kalır, yalnız gizlenir (`tr[data-side]`); id'ler (`satir-N-borc/alacak`), onay hedefleri ve testler değişmedi. Anahtar tek dokunuşla tarafı değiştirir; doluysa tutarı karşı tarafa taşır, hiçbir değer silinmez. İki taraf birden doluysa ikisi de görünür ve anahtar gizlenir (onay zaten "hem borç hem alacak" der). Onay engeli gizli bir alana işaret ederse görünen tutara gidilir. Seçili taraf alanın kendisi gibi çizilir (yüzey, kontrol kenarı, mürekkep, kalın); öbürü `--active` zeminde soluk. Masaüstü ve tablet tablosu aynı kaldı.
- **Kilitli satır (onaylı, aktarıldı):** kod ve ad bir satır, altında taraf adı kodun altında, tutar adın altında; değerler 44 px kutu değil metin. 390'da kırtasiye fişi 1618'den 1450 px'e, taslak fiş 2644'ten 2284 px'e indi.
- **320 px:** kod sütunu 6,5rem olur, tutar anahtarın yanında tam görünür. Fiş kontrolde `scrollWidth = clientWidth` (320, 390, 1440).
- **Toplamlar ve gider özetleri mürekkepte:** Borç/Alacak/KDV toplamları, Gider hesaplarına göre tutarları ve 191 satırı `--ink`, tabular-nums. Luca mavisi yalnız satır tutarlarında (Luca'ya giden alan). Fark değeri dengede yeşil, açıkta kırmızı kalır.
- **Gider çubukları tek ton:** bütün çubuklar `color-mix(--ink %55, --surface)`, iz `--rule`; iki temada izden en az 3:1. İlk çubuğun ayrı tonu kalktı (sıralama uzunlukta görünür).
- **Okuma kartı girişi:** kart ilk karesinden opaktır, yalnız 8 px yükselir (180 ms); içerik 140 ms'de belirir. Alttaki liste kartın içinden görünmez.
- **Önizleme fikstürü:** bütün satıcı adları ÖRNEK biçiminde (ÖRNEK AKARYAKIT A.Ş., ÖRNEK KARGO, ÖRNEK PANSİYON, ÖRNEK OTOPARK ve diğerleri).

### 23.26 Tur 6 işlev, performans ve güvenlik: doğrulama ve tur 5 ile aynı makinede karşılaştırma (2026-11-05)

Koordinatör tur 5 planı (kapılar, fotoğraf verisi, CSP, 4x mobil ölçüm) ve jüri tur 5 işlev/erişim-perf bulguları. `taste-skill:design-taste-frontend` ve `web-design-guidelines` çağrıldı. Bu bölüm kod değiştirmez; kalıcı kararları kaydeder.

- **Jüri bulguları:** CC BY-SA kredisinin lisans bağlantısı ihtiyacı kalktı, çünkü iki fotoğraf ve footer'daki kredi satırı 23.24'te silindi (`public/` altında yalnız simgeler var, sayfada `<img>` yok). Önizleme fikstüründeki gerçek işletme adları 23.25'te ÖRNEK biçimine geçti. JS yokken yanıltan hero denetimleri (`fieldset disabled`, Satırları kopyala `disabled`) ve çerez notunun Tab sırası (atla bağlantısından sonra ilk iki durak) production HTML'inde ve headless Chrome'da doğrulandı.
- **Güvenlik:** `/` genel CSP ile (`img-src 'self' blob: data:`, `font-src 'self'`, `frame-src 'none'`); bu tur yeni dış alan yok, CSP değişmedi. Tam sayfa kaydırmada 1440 ve 390'da `securitypolicyviolation` 0, konsol hatası 0, dış `src`/`href` 0, yatay taşma 0. `/onizleme/*` production'da 404; `/panel`, `/giris`, `/api/receipts` `.env.local` olmadan 500 (kapalı kalır, gerileme değil; `csp.build.test.ts` aynı akışı yer tutucu env ile geçer). Yeni fotoğraf olmadığı için EXIF temizliği konusu yok; fotoğraf gelirse 23.2 koşulları ve meta veri temizliği geçerli.
- **Ölçüm yöntemi:** tur 5 sonu (`cb803b1`) ayrı worktree'de production build, HEAD ayrı port; ikisi aynı makinede sırayla ve iki tur dönüşümlü, 4x CPU. Telefon 390 DPR 2, 150 ms RTT ve 1.6 Mbps; masaüstü 1440 ağ kısıtsız. Makine ölçüm boyunca başka işlerle %68-82 yükteydi; mutlak sayılar 23.23'tekinden yüksek, karşılaştırma aynı koşulda.
- **Sonuç (tur 5 → HEAD), telefon:** LCP metin (`hero-sub`) 1184-2620 → 1400-2336 ms (gürültü içinde). TBT 732-1102 → 420-1068 ms. CLS 0 → 0. Tezgâh seçimi INP 56-96 → 56-144 ms (tek 144 ilk koşuda, öbür koşular 56-112). Tema düğmesi INP ilk basış 488-496 → 368-392 ms, sonraki basışlar 208-288 → 216-256 ms. Tam sayfa tekerlek kaydırmada 50 ms üstü kare her geçişte 3 (56-92 ms) → 0-1 (52 ms).
- **Sonuç, masaüstü 1440 4x:** TBT 858-918 → 770-1099 ms; tema INP 696/408/320 → 384/264/256 ms; kaydırmada 50 ms üstü kare 6 (51-132 ms) → 2 (114 ve 52 ms, ikisinde de script ve engelleme yok).
- **Kalan 50 ms üstü görevler ve kaynakları:** (1) react-dom chunk'ının değerlendirilmesi ve kabuğun hydration'ı, 464-590 ms; (2) script ve stil payı olmayan 410-560 ms'lik bir kare (23.23'teki headless Chrome görevi); (3) ayrıştırma sonundaki ilk yerleşim; (4) imza sahnesinin boşta kurulan modu (`HomeMotion`, `requestIdleCallback`), 48-120 ms. Dördüncüsü ölçüldü: modun yazılması 4x'te 64-96 ms stil hesabı; animasyonlar kapatılınca 39-43 ms kalıyor, yani yaklaşık yarısı 39 animasyonun kurulması, yarısı sahne alt ağacının yeniden stillenmesi (inline-block, katman). Yerleşim payı 0-1 ms. (5) next/link'in görünen bağlantıları önceden getirmesi, 28-54 ms.
- **Yapılmayan, nedeni:** (4) iki işe bölünse her parça 50 ms altına iner, ama bunun için imza sahnesinin tek `data-mode` kapısı iki kapıya ayrılmalı ve sahne iki işin arasında yarı bekleme durumunda kalır. Bu sahne animasyon jürisinin en cilalı bulduğu yer; boşta çalışan ve kullanıcı girdisini beklemeyen tek bir görev için o riski almadık. Yalnız stil hesabını bir sonraki karenin çizimine itmek TBT'yi düşürür ama aynı uzun kareyi bırakır, sayıyı süslemek olurdu, yapılmadı. (1) ve (5) framework'ün kendisi; ana sayfa yalnız react-dom, Next router ve 42 KB ana sayfa kodu yükler, kesilecek fazla paket yok. Üst kısımdaki bağlantılarda önceden getirme bilinçli (hero ve bar "Hesap oluştur", "Giriş yap"); alt kısımdakiler zaten `prefetch={false}`. TBT 200 ms hedefinin altına inmedi.

### 23.27 Tur 7 tasarım sistemi: tek taş merdiveni, koyuda lacivert alan yok, krem yok, yazı swap (2026-11-05; 23.1, 23.11, 23.14, 23.19 ve 23.23'teki ilgili satırların üstündedir)

Koordinatör tur 6 planı (yazı, koyu palet, merdiven, palette-cream, kâğıt, uyarı şeridi, çerez notu, tema INP) ve jüri tur 6 tasarım sistemi bulguları. `taste-skill:design-taste-frontend` ve `web-design-guidelines` çağrıldı (güncel `command.md` çekildi; `font-display: swap` ve `env(safe-area-inset-*)` oradaki kurallar).

- **Yazı:** iki aile de `display: "swap"` (23.23'teki "optional" kararının üstündedir). "optional" soğuk ziyaretlerin çoğunu Arial'da bırakıyordu; premium ilk izlenim yazının kendisi. next/font Stack Sans için metrik bilmiyor, bu yüzden `adjustFontFallback` yerine globals.css'teki ölçülü yedekler (size-adjust 92/91, ascent/descent) kalır. Ölçüm (production, taze profil, 1440 ağ kısıtsız, 390 ve 320 150 ms RTT 1.6 Mbps, her biri iki kez): CLS altı koşunun hepsinde 0, h1 her koşuda iki satır, son karede her koşuda Stack Sans.
- **Açık tema nötrleri:** doygunluk %16'nın altına indi, sıcaklık R > G > B ile kalır. Zemin `#f3f2ef`, plaka `#ebe9e4`, sahne `#e7e5e0`, ayrık alan `#e2e0da`, yol `#ebe9e4 / #dddad3 / #cfcbc2`, CTA `#dcd9d2`, kâğıt `#fbfaf7`. inspect.mjs `palette-cream` uyarısı kalktı. Mürekkep, mavi ve vitrinin lacivert mürekkep alanı açıkta aynı.
- **Koyu tema, tek merdiven:** yaklaşık 25 yüzey tonu yedi basamağa indi; komşu basamak oranı en az 1,127, %15 açıklığın üstünde doygunluk en çok %6 (orta basamaklar artık haki okunmuyor). d0 `#100f0d` zemin; d1 `#1e1c19` yüzey ve telefon ekranı; d2 `#282623` bölüm alanları (sahne, giriş/kayıt yarısı, vitrin, CTA), raised, active; d3 `#312f2c` plaka, kenar, vizör, sekme tepsisi; d4 `#3a3835` pencere ve kart; d5 `#42403d` pencerenin üstündeki katman; d6 `#4a4845` onun kenarı. Her bölüm ve kart tokenı bu yedi değerden birini alır; birbirinin kopyası olan değerler birleşti, kullanılmayan tokenlar (`--field-*`, `--choice`, `--accent-field`, `--ink-on-deep`, `--muted-on-deep`, `--picture-opacity`) silindi.
- **Koyuda lacivert alan yok:** `--deep` ve `--deep-raised` koyuda d1 ve d3; vitrin, telefon ekranı ve vizör sıcak taş ailesinden. Vitrin "ters bölüm" etkisini zeminden bir parlaklık adımıyla (d2, zemine 1,27:1) alır. Mavi koyuda yalnız vurgu, Luca rakamları ve yoldaki tek Luca alanı (`--path-4`). Giriş/kayıt koyuda üç adım okunur: alan d2, plaka d3, kart d4.
- **Koyu mürekkep ve kâğıt:** mürekkep `#eeede9` (doygunluk %13, krem bandının dışında). Termal kâğıt koyuda `#d0cdc6` (açıklık %80), mürekkepten koyu; baskı `#3a3834` kâğıtta 7,4:1. Koyu mavi `#92b6f6`, en üst metin katmanı d5 üstünde 5,04:1. Muted `#b6b3ac` d5 üstünde 4,94:1. Canlı DOM denetimi (iki tema, 1440 ve 390, tam kaydırma): AA altında metin çifti yok.
- **Uyarı kutuları:** renkli sol şerit (inset 3px) kalktı; not, raised zemin ve tam 1px `--warn-edge` kenarıyla işaretlenir (`.alert-warn`, `.counter-warn`, `.ui-warn`). Kenar için dolgu 1px azaltıldı, kutu boyu aynı.
- **Çerez notu:** masaüstünde alt boşluk `max(16px, env(safe-area-inset-bottom))`. Telefonda ekranın altına yapışık ince bant (52 px artı ev göstergesi payı), üstünde boşluk yok, kenar yerine yüzen gölge (inspect.mjs bandın üst çizgisini hairline saydı). Gizlilik bağlantısının hedefi satırı değiştirmeden 26 px. Bağlantı `prefetch={false}`: önceden getirme /gizlilik'in CSS parçasını preload ediyor ve kullanılmadığı için her yüklemede konsol uyarısı veriyordu; production'da uyarı 0.
- **Hareket:** `fly-fade` artık yalnız opacity canlandırır (visibility yok); kopya zaten `pointer-events: none` ve aria-hidden.
- **Tema düğmesi INP, ölçüldü:** koyu tokenlar tek attribute'a (`data-look`) bağlandı (eskiden `data-theme` ve `data-look` iki seçici). 4x CPU'da HEAD ve bu tur dönüşümlü iki tur: masaüstü ilk basış 544-640 / 664-672 ms, sonrakiler 136-424 / 208-400 ms; telefon 520-544 / 512-560, 176-312 / 120-344 ms, yani fark gürültü içinde. İz: süre neredeyse tamamen tek bir tam ağaç stil hesabı (1031 öğe, 4x'te 248 ms); boya 28 ms, yerleşim 17 ms. Denendi, kazanç yok: `light-dark()` ile tek `color-scheme` değişimi (1x'te 19-27 ms ve 16-27 ms), animasyonsuz ve geçişsiz değişim. Tek bir değişkeni kökte değiştirmek bile 14-19 ms sürüyor; maliyet token sayısında değil, görünür ağacın büyüklüğünde. `light-dark()` bu yüzden alınmadı (Safari 17.5 öncesinde renksiz sayfa riski de var).
- **Yapılmayan, nedeni:** imza sahnesi, yol, rota ve malzeme bölümlerine `content-visibility: auto` stil hesabını yaklaşık %20 azaltıyor (1x 21-26 ms'den 17-19 ms'ye), ama bu dört bölüm boya sınırlamasıyla bozulur: rotaların yapışkan Excel kartının gölgesi, kâğıdın masanın üstüne taşan ucu ve yolun yapışkan sahnesi kesilir (23.15'teki not). Ana sayfa sahnelerinin alanı; tema düğmesi için bunu yapmadık.

### 23.28 Tur 7 ana sayfa, giriş ve kayıt: kırıklar kapandı, fiş ve tablo en çok üç kez, hero ilk boyamadan sonra kurulur ve bir kez senaryo oynar (2026-11-05; 23.2, 23.3, 23.9, 23.15, 23.20 ve 23.24'teki ilgili satırların üstündedir)

Koordinatör tur 6 planı (A-F) ve jüri tur 6 bulguları (animasyon 7.5, renk 7, görsel 6.5, premium 6.5, mobil 6.5, erişim-perf 6.5, işlev 8.5). `taste-skill:design-taste-frontend` ve `web-design-guidelines` çağrıldı (kontrol listesi bölüm 11'deki aktarım; güncel `command.md` bu tur yeniden çekilmedi). Kullanıcı kararı (tur 3, bağlayıcı) bu turda da geçerli: "çeşitlendirin, jüriler ne diyorsa yapılsın"; jürinin kritik, yüksek ve orta bulguları erteleme olmadan uygulanır, yalnız güvenlik ve veri gizliliğiyle çelişen atlanır. Kararlar:

- **Malzeme sahnesi:** 960 px altında masa yüksekliği içerikten gelir, şerit ve Luca kartı akışta üst üste durur, kart kâğıdın kesik ucuna 72 px biner (eski `top: 404/372px` telefonda kartı masanın dışına itiyordu). Masaüstünde şerit 460 px, 22 px baskı, -1,5° döner, masanın üst kenarından girer; kâğıdın lifi düşük opaklıkta bir SVG gren dokusu, kesik ucu düz ton adımlı bir kıvrım, altında tek yumuşak temas gölgesi. Sert kıvrım çizgisi (koyu temada pembe dikiş) kalktı. Kart masanın altına oturur, son basılı satırın hemen altında.
- **Tekrar kırıldı:** fiş ve Hesap/Borç/Alacak tablosu yan yana yalnız hero, malzeme ve imza sahnesinde. Yolun "okunur" durumu kâğıt göstermez, yalnız okunan alanları form satırları olarak büyük gösterir. Vitrin sekmeleri kendi kompozisyonunu alır: Luca dosyası iki büyük sayı ve kalın çubuk, dosya kutucuğu, yanında Luca adımları; Eklenti uyarısı Luca Fiş Detayı ızgarası (BT hücresi boş ve işaretli) ve üstünde yüzen eklenti penceresi. CTA'da tablo çipleri telefonun yanında kalır ama telefon 340 px ve bölümün altından kesilir (tek büyük cihaz); deklanşör düğme değil halka.
- **Vitrin:** pencere içerik kadar uzun (en az 400 px), 1181 px üstünde 9 sütun, cümlesi yanındaki 3 sütunda. Tam genişlik plaka bandı kalktı. Telefonda sekme şeridi sağ kenarda maskeyle solar, seçilen sekme şeridin ortasına kayar.
- **Hero:** seçiciler pencerenin dışında, üstünde iki segment izi. Plaka sağ yarıyı kaplamaz, pencere ve telefonun altında 40 px aşağıdan başlayan bir taban. Rayda Fişler, Kurallar ve Taslak listesi (seçili fiş seçiciyle değişir). Telefonda fişte kalem satırı yok (kalemler kartta satır olarak var), görünen toplam görünen kalemlerle çelişmez. 390 ve 320'de tablo `table-layout: fixed`, tutar sütunları 5,6 em, hesap adı sarılır; web yazısıyla taşma yok. Toplamlar mürekkepte (hero ve giriş kartı); mavi yalnız Luca'ya giden satır rakamı.
- **Hero hareketi:** dört parça (iki başlık satırı, pencere, telefon), 1,1 sn'de oturur; cümle ve düğme hareket etmez. Parçalar ilk karede okunur yerdedir (maske yok, 28 px aşağıda) ve `html.go` gelene kadar bekler: baş betiği ilk boyamadan iki kare sonra ve `document.fonts.ready` ile (en çok 700 ms) ekler. Ardından bir kez ve yaklaşık 2,3 sn'de senaryo: telefonda "Fiş çekildi" yerine "Okundu" yuvarlanır, okuma bloğu yükselir, satırlar 160 ms arayla gelir, toplamlar yükselir, Dengede çıkar, dosya şeridi gelir. İlk girdi (dokunma, tuş, tekerlek) `.counter[data-still]` koyar, senaryo sonuna atlar. JS yoksa ya da reduced motion'da hepsi son halinde. 23.20'deki tek seferlik spotlight kalktı.
- **Geçişler:** yol kartında yeni gövde eskisi 0'a inince başlar (120 ms gecikme), iki düzen üst üste basılmaz. Yol perdesinin tonları komşusundan en az 1,27 ayrı: açık `#ebe9e4 / #d3d0c8 / #bdb9b0`, koyu `#282623 / #3a3835 / #4a4845` (23.27 merdiveninde birer basamak atlanır); koyuda kartlar bir basamak aşağıda. Örnek değişiminde telefon kâğıdı opak kalır, yalnız baskısı 8 px yükselerek değişir. Uzunluğu değişen tutar kutusunun %30'undan ve 0,4 opaklıktan yükselir: boş hücre karesi yok.
- **İmza sahnesi:** ön durumda hesap kodu ve adları tam mürekkepte (çeyrek ton kalktı), yalnız tutar ve toplamlar tire. Yan yana düzende (kaydırma ve 641 px üstü zamanlı) çip kendi basılı satırından sağa, kâğıtla defter arasındaki boşluğa çıkar, boşlukta kendi satırının en yakın kenarına iner, iki satırın metni arasından ilerler, hücresine ancak rakamı belirirken (%94) girer (`--dxg`, `--dg`; satır dolgusu 20 px, çip 1,15 satır). Telefonda çip başlık satırının arkasından geçer (başlık opak ve üstte); uçuşlar arası 180 ms; dizi tablonun üç satırı ekrana girince başlar. Pencerede fiş dikeyde ortalanır. 1100 px altında not ve dengesiz kart 360,00'ın altında tam genişlikte (768'de kart kesilmiyordu artık); telefonda dengesiz kart gösterilmez.
- **Uçan çip indikten sonra** yalnız saydam değil `visibility: hidden` (fly-fade %100; 23.27 yalnız opacity bırakmıştı, durgun kopya rakamın üstünde katman sayılıyordu, inspect covered-text).
- **Resimlerdeki düğmeler:** `[data-ui]` içindeki `span.btn-primary` vurgu açık zemini ve vurgu mürekkebiyle çizilir, sayfanın birincil düğmesine benzemez.
- **Telefon uzunluğu:** 390'da 14.002 px'ten yaklaşık 10.700 px'e. Yolun dört alanı telefonda yatay kaydırılan tek sıra (sonraki alanın rengi 24 px görünür, metni ekran kenarına değmez), kurallar paneli telefonda yok (altı not kuralı taşır), rotalarda Fişler penceresi ve liste yok (başlık, Excel dosyası, ipucu), CTA telefonunda vizör daha kısa ve "Önceki fiş" satırı yok, çipler telefonun altında.
- **Kurallar paneli** düz bir plaka üstünde (bulanıksız yayılma). **Rotalar:** Fişler penceresi içerik kadar, Excel kartı son satırına biner, Excel sütun başlıkları arasında 8 px; liste adları bir adım büyük.
- **CTA:** dört çip `cover %38`'de yerinde (bölüm ekranın ortasındayken), hepsi telefonun üstünde aynı katmanda, vizör köşesinin solunda. Vizörün sert yatay ton sınırı kalktı (yoldaki kamera kartında da).
- **Giriş ve kayıt:** 1281 px üstünde parça yarının yaklaşık %80'i (şerit 320, kart 580, 16-17 px yazı).
- **Yapılmayan, nedeni:** çerez notunun masaüstü genişliği (`CookieNote`, site.css tasarım sistemi alanı, 23.27'de değişti). Mobilde hydration ertelemesi ve vitrin `is-near` ön yerleşimi ölçülmedi (4x CPU izi bu tur alınmadı). Giriş ekranında "Şifremi unuttum" DOM sırası (isteğe bağlı bulgu).

### 23.29 Tur 7 panel: telefonda okuma ekranı, fotoğraf kontrol ekranına taşınır, hesap adı sarılır, sekme filtresi sıralı hareket, hareketler yalnız transform (2026-11-05; 23.4, 23.10, 23.13, 23.16 ve 23.25'teki ilgili satırların üstündedir)

Koordinatör tur 6 panel planı (1-4) ve jüri tur 6 panel bulguları (animasyon, renk, mobil). `taste-skill:design-taste-frontend` (app-screens) ve `web-design-guidelines` çağrıldı (kontrol listesi bölüm 11'deki aktarım; güncel `command.md` bu tur çekilmedi).

- **Telefonda okuma ekranı (720 px ve altı):** fiş çekilince ya da galeriden seçilince ekranın tamamı okuma sahnesi olur (sabit, opak zemin, safe-area payları). Fotoğraf kenar boşlukları içinde kendi oranında büyük durur (çerçeve ve letterbox yok), okuma sürerken bir kez %3 yaklaşır (`scale` özelliği, 4 sn). Altında gerçek aşamalar liste olarak birikir: "Fotoğraf hazır", "Fiş okunuyor" (çoklu seçimde "(2/3)"), "Fiş okundu", "Satırlar hazır"; her aşama işin oraya vardığı anda 6 px yükselerek gelir, bitince yeşil işaret `clip-path` ile çizilir, etkin aşamada üç nokta. Satıcı, toplam ya da satır sayısı okuma sırasında gösterilmez, çünkü sunucu yanıtı gelmeden bilinmiyor; sahte ara değer yok (23.4.3). Ekran okuyucu eski tek satırlık rolling aşamayı duyar, liste `aria-hidden`. Masaüstü ve tablet okuma kartı değişmedi.
- **Tarama çizgisi yok:** koordinatör planı okuma fotoğrafının üstünde tarama çizgisi istedi; kullanıcı tarama çizgisini daha önce reddetti (21, 23.3.7) ve ana sayfadaki `home-scan` artık yok. Yerine yukarıdaki yaklaşma ve aşama listesi.
- **Fotoğraf kontrol ekranına taşınır:** "Satırlar hazır"dan sonra gezinme `fis-okundu` türüyle; okuma fotoğrafı ile kontrol ekranındaki küçük görüntü tek bir paylaşılan öğe (`fis-foto`, 320 ms), büyük fotoğraf küçülüp özet şeridinin başına iner.
- **Kontrol ekranında fotoğraf (1100 px altı):** özet şeridinin (Matrah, KDV, Toplam) başında 36x48 küçük görüntü düğmesi (`aria-expanded`); dokununca fotoğraf şeridin hemen altında, satırların üstünde açılır (en çok 62vh), tekrar dokununca kapanır. Sayfanın altındaki büyük fotoğraf bu genişlikte gösterilmez; "Fişten okunan" bloğu yerinde kalır ve `#fis-kaynak` artık hep o bloktur. Fotoğraflı fişte şeritteki "Fişi göster" bağlantısının yerini küçük görüntü alır; fotoğrafsızda "Tüm alanlar" kalır. 1100 px ve üstünde düzen aynı.
- **Hesap adı sarılır:** hesap adı alanı tek satırlık değer taşıyan bir `textarea` (`field-sizing: content`, Enter ve satır sonu boşluğa döner). 390'da "Yeme-İçme ve Ağırlama Giderleri" iki satır (67 px), kısa adlar 44 px; masaüstünde 40 px, öbür alanlarla aynı. `field-sizing` olmayan tarayıcıda telefonda iki satırlık yükseklik.
- **Sekme filtresi:** sekme bağlantıları `sekme` türünü taşır. Filtreden çıkan satırlar 120 ms'de `vt-out-up` ile gider, kalan satırlar 80 ms sonra 240 ms'de yerine kayar, filtreye giren satırlar aynı anda `vt-rise` ile yükselir; sayfanın geri kalanı (panelin yeni yüksekliği, alttaki kartlar) çıkan satırlar gittikten sonra çapraz geçer, böylece iki metin katmanı üst üste okunmaz. Alt çubuk/ray ayrı bir grup (`panel-rail`), geçişte solmaz.
- **Hareketler yalnız transform:** tarayıcının grup keyframe'leri genişlik ve yükseklik de canlandırır. `moveOnly` (src/lib/view-transition.ts) React `<ViewTransition>`'ın `onShare`/`onUpdate` geri çağrısında grup animasyonunu yeniden yazar: başlık uçuşu ve satır kaymasında boyut düşer (grup ilk karede yeni boyutunda), sekme çizgisi ve fotoğrafta boyut değişimi sol üst köşeden `scale` olur. Ölçüldü: sekme geçişinde grup animasyonları yalnız `transform`.
- **Giriş:** "Şifremi unuttum" şifre alanının altında, sağda çizilir; DOM, Tab ve görsel sıra aynı (e-posta, şifre, göster, Şifremi unuttum, Giriş yap).
- **Uyarı kutusu şeridi:** 23.27'de kalktı; panelde ayrıca iş yok.
- **Kırık fotoğraf notu (jüri):** headless akışta `DOM.setFileInputFiles`'a ters eğik çizgili yol kaçışı bozuk verildiğinde 0 baytlık dosya seçiliyor ve görüntü kırık çıkıyor; düz eğik çizgili yolla her koşuda 1200 px doğal genişlik. Ürün hatası değil, ölçüm betiği.

### 23.30 Tur 7 işlev, performans ve güvenlik: kimlik ayarı yokken panel 503 ve güvenlik başlıkları, fly-fade yalnız opacity, 4x telefon ölçümü (2026-11-05; 23.26 ve 23.28'deki ilgili satırların üstündedir)

Koordinatör tur 6 işlev planı (1-5) ve jüri tur 6 işlev bulgusu. Ölçüm betikleri `.taste-skill/perf30/` altında (`tbt.mjs`, `trace.mjs`, `loadtrace.mjs`, `shots.mjs`).

- **Kimlik ayarı yokken panel:** `proxy.ts` oturum denetimi hata atarsa (eksik `NEON_AUTH_*` ya da kimlik istemcisinin hatası) çıplak 500 yerine kendi yanıtını döner: 503, `Retry-After: 60`, `no-store`, düz metin "Hizmet geçici olarak kullanılamıyor.", istek başına nonce CSP. Next'in `headers()` başlıkları (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) bu yanıta da eklenir; atılan bir proxy hatasının 500'üne eklenmiyordu. Kapalı kalır: `next()` yok, hata metni ve yığın izi gövdeye girmez, yalnız sunucu günlüğüne. `/giris` ve `/api/*` 500'ünde başlıklar zaten vardı (hata sayfanın ya da route'un içinde). `proxy.test.ts` 503'ü, `csp.build.test.ts` production build'de env'siz `next start` ile 503'ü ve HSTS, X-Frame-Options, CSP başlıklarını doğrular; aynı dosya yer tutucu env ile `/panel/fis/abc` → `/giris?sonra=` yönlendirmesini zaten doğruluyordu.
- **`fly-fade` yalnız opacity (23.28'in yerine):** keyframe'in sonundaki ayrık `visibility: hidden` animasyonu compositor dışında tutuyordu. İnen rakamın (`.fly-val`) kendisi duran kopyanın üstüne dizilir (`position: relative; z-index: 3`); böylece kopya saydam kalsa da rakamın üstünde katman değildir (dört kombinasyonda `elementFromPoint` rakamın kendisi). Uçuş satır aralarından geçtiği için başka satırın rakamı kopyanın önüne düşmez. Kareler: `.taste-skill/perf30/shots/` (1440 kaydırma, 390 zaman dizisi, açık ve koyu).
- **Gizlilik CSS ön yüklemesi:** 23.27'deki `prefetch={false}` ile giderilmişti; bu build'de dört kombinasyonda konsol uyarısı ve hatası 0.
- **Mobil TBT (390 DPR 2, 4x CPU, önbellek kapalı):** önceki build 0-293 ms (3 koşu), bu build 109-466 ms (7 koşu); hedef 600 ms'nin altında. Jürinin 1400-2145 ms'si makine tam yükteyken alınmıştı; aynı ölçüm bu tur %23-28 yükte. İzde kalan uzun görevler: ayrıştırma sonundaki ilk yerleşim (Layout 133 ms), framework chunk'ının değerlendirilmesi ve hydration (177 ms) ve yaklaşık 1,1 sn'de web yazısının gelmesiyle tam sayfa yeniden yerleşim (stil 49, yerleşim 99 ms, script yok; `display: swap`'ın bedeli, 23.27). Hydration zaten bölümlere ayrık `<Suspense>` (23.24) ve `HomeMotion` kurulumu boşta (23.17, 23.24); bu tur ek bölme yapılmadı, çünkü kalan görevlerin hiçbiri sayfa kodunun kendisi değil.
- **Kaydırmada uzun kareler:** 390 4x tam sayfa tekerlek kaydırmada izde 24 ms üstü ana iş parçacığı görevi yok; LoAF'ta 50 ms üstü kare koşu başına 0-2 (51-165 ms), hepsinde engelleme süresi 0 ve script payı yok. Jürinin y≈855, 3900, 6457'deki 200-465 ms'lik kareleri bu build'de yeniden üretilemedi.
- **Not:** build `.next`'i yeniledi; 3300'deki `next start` eski build'i bellekte tutuyor (`/panel` orada hâlâ çıplak 500). Bir sonraki jüri 3300'ü yeniden başlatmalı.

### 23.31 Tur 8 tasarım sistemi: koyuda orta gri levha yok, derinlik açıklık, kenar ve gölgeyle; seçili sekme mavi; uyarı kenarı 3:1; çerez notu main'den sonra (2026-11-05; 23.27'deki koyu merdiven, uyarı kenarı ve çerez notu sırası satırlarının üstündedir)

Koordinatör tur 7 planı (koyu yüzeyler, küçük metin AA, kontrol dolguları, imza rengi, uyarı kenarı, çerez notu) ve jüri tur 7 tasarım sistemi bulguları. `taste-skill:design-taste-frontend` ve `web-design-guidelines` çağrıldı.

- **Koyu tema yüzeyleri:** 23.27'deki d4/d5/d6 (`#3a3835 / #42403d / #4a4845`) ürün penceresi basamakları kalktı; pencereler zemine 1,64:1 ile çamurlu taupe levha gibi okunuyordu. Yeni sıra: zemin `#100f0d`; bölüm alanları (sahne, giriş/kayıt yarısı, vitrin, CTA, yolun ilk alanı, plaka) `#181715`; ürün penceresi ve kart (`--ui-surface`, `--lift`, `--show-card`) `#1f1e1b`; başka katmanın üstüne kalkan pencere (`--ui-lift`) `#232220`; pencere içindeki yükseltilmiş şerit ve tepsi (`--ui-raised`, `--show-raised`, `--deep-raised`) `#2a2825`; pencere üstündeki kontrol (`--lift-control`) `#36342f`. Pencere ve kart kenarları mürekkebin %12-14'ü (rgba), böylece her alanda okunur; pencere alanından ayrımını kenar ve `--shadow-lift` taşır, ton değil. Telefon çerçevesi `#2a2825` ve 1px üst ışık. Panelin kendi yüzeyleri (`--surface #1e1c19`, `--raised #282623`, `--border #312f2c`) aynı kaldı, `--stage` koyuda `#181715`.
- **Yol sahnesi:** kart her zaman kendi alanının bir basamak üstünde: alanlar `#181715 / #1d1c19 / #23211e / #172f63`, kartlar `#211f1c / #262421 / #2c2a27 / #211f1c`, kabuk `#2c2a27`. Açık temada perde haki tonu nötr taşa çekildi: `--path-2 #d3d1cc`, `--path-3 #bcbab5` (adımlar 1,26 ve 1,27, 23.28'deki oran korunur).
- **Küçük metin:** koyuda tablo başlıkları ve "Taslak" artık `#2a2825` üstünde: muted 7,0:1, faint 6,1:1 (eskiden 4,3-4,4:1). Canlı DOM denetimi (production, 1440 ve 390, iki tema, tam kaydırma) ve inspect.mjs 1440/768/390: kontrast bulgusu yok. Açık 1440'ta Luca alanının perde geçişinde yakalanan 1,33:1 değerleri kartın saydam olduğu ara karenin ölçümü; ekran görüntüsünde metin okunur (23.27'deki not).
- **Kontrol dolguları:** hero "Satırları kopyala" koyuda pencereye 1,28-1,34:1. İkincil düğme koyuda `#312f2c`, yüzeye 1,27:1. Giriş/kayıtta bölünmüş alanın üstündeki çubuk kontrolleri (Hesap oluştur, Giriş yap, tema) yeni `--bar-control` ile dolar (açıkta beyaz, alana 1,32:1; koyuda `#34322e`, alana 1,40:1) ve `--lift-edge` kenarı alır; eskiden 1,03 ve 1,00:1 idi.
- **İmza rengi:** seçili sekme (`--chip-on`) iki temada defter mavisi dolgu: açıkta `#1f4d9e` üstünde beyaz 8,0:1, koyuda `#92b6f6` üstünde `#100f0d` 9,4:1. Vitrin sekmeleri hem kayan dolguda hem telefondaki sabit dolguda maviyi kullanır; tek büyük mavi alan kuralı (yolun Luca alanı) aynı.
- **Uyarı kutusu:** `--warn-edge` açıkta `#b08540` (`--raised` üstünde 3,17:1), koyuda `#8f7440` (`#282623` üstünde 3,41:1, pencere tepsisi üstünde 3,32:1). Dolgu nötr kalır; kenar notun tek işareti olduğu için 3:1 (WCAG 1.4.11).
- **Çerez notu:** ana sayfada da `<main>` ve alt bilginin ardından gelir (giriş ve kayıtta zaten öyleydi); ilk Tab durağı "İçeriğe atla", sayfanın ilk başlığı H1. Diyalog başlığı H2 değil `<p>` (aria-labelledby aynı). Yarım ekrandan sonra kenara çekilen not artık `visibility: hidden` almaz; odaklanabilir kalır ve `:focus-within` ile geri gelir, böylece sayfa sonundaki Tab onu görünür bulur. Ölçüldü: 1440'ta başlık sırası H1, H2, H2; ilk Tab skip link; kaydırılmış notta odakla opaklık 1.
- **Renk geri bildirimi istisnası:** kontrollerde 180 ms'ye kadar renk, zemin ve kenar geçişi (hover, odak) 23.5'teki "yalnız transform, opacity, clip-path" tavanının dışındadır; tavan yükleme ve kaydırma hareketi içindir. `transition: all` yasağı aynı.
- **Yapılmayan, nedeni:** tema düğmesi INP'si (4x CPU 384-600 ms) bu turda yeniden ölçülmedi ve değişmedi; 23.27'deki iz tam ağaç stil hesabını gösteriyor ve token sayısı azalmadı, ölçüm paralel jüri yükünde alındı. Kaydırmadaki uzun kareler ve imza sahnesindeki covered-text FAIL ana sayfa ve performans alanında, bu bölümün kapsamı dışında.

### 23.32 Tur 8 ana sayfa: imza sahnesinde durgun kopya yok, hero ilk karede tam ve yerinde, imza penceresi içerik genişliğinde, kâğıt dokusu raster, telefonda kompakt kurallar (2026-11-05; 23.2, 23.3, 23.24, 23.28 ve 23.30'daki ilgili satırların üstündedir)

Koordinatör tur 7 planı (A-F) ve jüri tur 7 ana sayfa bulguları. `taste-skill:design-taste-frontend` ve `web-design-guidelines` çağrıldı (kontrol listesi bölüm 11'deki aktarım; güncel `command.md` bu tur yeniden çekilmedi). Kararlar:

- **İmza sahnesi, kopya:** uçuşun saydamlığı (`fly-fade`) artık kopyanın kabında değil çipin kendisinde (`.fly-s`); çip durgun halde ve betik yokken `opacity: 0`. İnen rakamın kalıcı `--accent-soft` kutusu kalktı; eşleşme işareti kâğıt tarafında kalır. inspect.mjs 1440/768/390: 0 FAIL (covered-text yok). 23.30'daki "kopya kabında opacity" satırının yerine geçer.
- **İmza sahnesi, yol:** X ve Y bacakları biraz örtüşür ve her bacak kendi eğrisiyle yumuşar (anahtar kare `animation-timing-function`, kaydırmanın linear'ından önce gelir); dönüşler köşe değil yay. Kâğıtla defter arası 96 px, yani 1,15 kat büyümüş çipten geniş; çip hiçbir karede hesap adına ya da başlığa değmez (kare kare ölçüldü, 1440 kaydırma ve 768 zamanlı). Telefonda tablo üst kenarından kırpılır (`clip-path: inset(0 -100vw -100vw -100vw)`), çip kart dolgusunda yarım görünmez.
- **İmza sahnesi, ölçek:** 1281 px üstünde başlık üstte tam genişlik, cümle ve üç eşleşme solda 3 sütunda, pencere 9 sütunda (1440'ta 1013 px). Kâğıt 15 px ve satır aralığı 1,75, tutarlar 20 px, toplamlar 28 px. 1100 altında kâğıt kalem satırları olmadan 200 px. İzin yüksekliği (220vh) ve yapışkanlık ilk boyamadan CSS'te verilir (`.js .rule`), soğuk yüklemede sahne 1612'den 2760'a büyümez.
- **Hero, ilk kare:** başlık hiç hareket etmez (28 px'te bekleyen satırlar alt cümleye biniyordu). Hareket yalnız pencere (800 ms) ve telefonda (120 ms gecikme, 760 ms). Senaryo satırları, toplamları, Dengede'yi ve dosya şeridini gizlemez: `html.go`'dan önce hepsi tam mürekkepte; `go` ile %60'a iner ve 4 px yükselerek sırayla döner. Ölçüm (1x, headless): FCP 1348 ms, go 1419, sahne 2294'te bitti (FCP'den 946 ms sonra). Telefonda Fiş çekildi yerine Okundu yuvarlanması 420 ms'de.
- **Hero, kompozisyon:** pencerenin rayı ve plakası kalktı (ray telefonun altında yarım "Fişler" bırakıyordu, plaka iki ayrık gri köşe). Pencere en uzun örneğe göre 600 px ve sahne üstten hizalı: örnek değişince seçiciler, pencere üstü ve telefon kıpırdamaz (Lokanta, Market, Kırtasiye: 112/166/600/274, üçünde aynı). Telefonda kâğıt ödeme satırından sonra biter, okuma bloğu kesik kenarın hemen altında; ikisi ekranda dikeyde ortalanır. Hesap adı odometrede kaymaz, 120 ms çapraz geçer. Telefonda tutar sütunları 6 em, odometre hücreden taşmaz.
- **Hero, telefon:** seçiciler satır kartının altında; telefon ve kart ilk ekranda (375x667'de telefon ekranın yaklaşık %35'i). Tablette başlık üstte, cümle altında, düğme yanında (cümle başlığın üstünde başlamaz).
- **Kâğıt sahnesi:** gren dokusu `feTurbulence` ve `mix-blend-mode` değil, 128 px'lik tek raster karo (`public/kagit-lif.png`, 14 KB, kendi düşük alfa'sı). 4x CPU kaydırmada 390'da 0 uzun kare (eskiden 127-525 ms), 1440'ta en uzun 65-78 ms. Solan şerit `aria-hidden`; metni kart ve figcaption'da. 961-1180'de şerit 400 px, 960 altında `min(440px, 84%)`: 768'de kalem adı kesilmez.
- **Bir fişin yolu:** durum değişiminde pill gövdeyle aynı karede kayar (gecikme 0), yeni gövde eskisi 60 ms'deyken (yaklaşık %40) başlar. Telefonda kaydırıcı yalnız 640 altında `tabindex="0"` alır (bölüm zaten adlandırılmış bölge), her alan `role="group"` ve "Adım n / 4"; her alan kendi kartı kadar uzun.
- **Telefon:** vitrinin alt dolgusu 48 px; "Sizin hesap planınız" iki sütunlu kısa liste (14 px açıklama), yaklaşık bir ekran.
- **Küçük kırıklar:** rotalarda Excel kartı yalnız pencerenin alt dolgusuna ve kenarına biner, satır harfinden kesilmez. CTA telefonu deklanşörün altından kesilir.
- **Yapılmayan, nedeni:** bölüm başına farklı görsel olay (tablo tekrarı, premium yüksek) ve hero ölçeği/odak (premium orta) koordinatör planında yoktu, "yeni özellik ekleme" kuralı nedeniyle bu tur açılmadı. 4x telefonda hydration TBT'si ve ilk kaydırma tikindeki takılma (erişim-perf orta) ölçülüp değiştirilmedi. inspect'in 40/73 kenar WARN'ı ve 390'daki iki yatay sıra WARN'ı (yol kaydırıcısı ve vitrin sekmeleri, ikisi de klavyeyle ulaşılır) kaldı. Giriş/kayıt görsel bulguları (düşük) bu turda değişmedi. inspect.mjs yalnız varsayılan (açık) temada koştu; koyu tema ekran görüntüleriyle denetlendi.

### 23.33 Tur 8 panel: telefonda ve tablette rakamlar sağa hizalı, liste satırı bağlantısı 44 px, kırıntı 48x44 (2026-11-05; 23.29'daki ilgili satırların ve panel.css'teki "meta satırı sola yaslı" kararının üstündedir)

Koordinatör tur 7 panel planı (1-3) ve jüri tur 7 panel bulguları (premium numeric-align, mobil kırıntı, erişim-perf satır bağlantısı). `taste-skill:design-taste-frontend` (app-screens) ve `web-design-guidelines` çağrıldı (kontrol listesi bölüm 11'deki aktarım; güncel `command.md` bu tur çekilmedi).

- **Telefon ve tablette (900 px ve altı) fiş satırı:** ikinci satır sabit sütunlarda: evrak no (en çok 3rem, satıcı adının sol kenarında başlar, uzun no üç noktayla kesilir), tarih (4.5rem) ve gider hesabı (en az 4rem, uzun kodda büyür) sağa hizalı ve tabular rakam; böylece tarih ve kod satırdan satıra aynı sağ kenarda. Ardından boşluk sütunu ve en sağda durum (toplam üst satırda aynı sütunda, sağa hizalı, satır kırılmaz). Sütun aralığı 8 px. 360 px ve altında (320) üç sabit sütun ve durum sığmadığı için sütunlar içeriğe göre daralır, aralık 6 px; yatay taşma yok. inspect `--app` 1440/768/390 açık ve koyu: 0 FAIL, 0 WARN (numeric-align kalktı).
- **Liste satırı bağlantısı:** satırın tamamı zaten bağlantının `::after` katmanıyla tıklanır. Bağlantının kendi kutusu da 44 px: 13 px dikey dolgu, aynı kadar negatif kenar boşluğu (yerleşim değişmez); iki satır sınırındaki satıcı adı `overflow: clip` ve `overflow-clip-margin: content-box` ile içerik kutusunda kesilir, üçüncü satır dolguda görünmez. Masaüstünde durum hücresi artık konumlandırılmış değil (ok işareti satıra göre konumlanır, `pointer-events: none`), böylece durum sütunu ve ok da aynı bağlantı; ölçüldü: 1440 ve 390'da satır yüzeyinin her noktası o satırın bağlantısına düşüyor. Tek bağlantı, tek Tab durağı.
- **Kırıntı:** kontrol ekranındaki "Fişler" bağlantısı iki yanda 8 px dolgu ve negatif kenar boşluğuyla 48x44; metnin yeri değişmedi.
- **Koyu tema:** panel kendi tonunu tanımlamıyor; yüzeyler 23.31'deki ortak koyu merdivenden geliyor (zemin #100f0d, panel #1e1c19). Bu turda panelde renk değişikliği yok.
