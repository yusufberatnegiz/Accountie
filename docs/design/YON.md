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
2. **Tema düğmesi:** çubukta tek düğme (`ThemeCycle`), her genişlikte, 40px, `aria-label` ile "Tema: Koyu. Değiştir" biçiminde. Nirene'den daha iyisi: döngü Sistem → Açık → Koyu, ikon seçili durumu gösterir, tooltip yerine görünür etiket gerekmez çünkü `aria-label` ve `title` var. Üç seçenekli `ThemeSwitch` Hesap ve Kurallar > Görünüm'de kalır.
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
- **Çerez bildirimi:** `components/site/CookieNote.tsx`. Kaydırma ilk ekranın yarısını geçince kenara çekilir, en üste dönünce yine görünür; yalnız "Tamam" ya da tercihler penceresinde "Kaydet ve kapat" onu kalıcı kapatır. Böylece hiçbir başlığın üstünde durmaz (inspect.mjs covered-text). Panelde yok.
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
