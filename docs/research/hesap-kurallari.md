# Fişten yevmiye kaydı üretme kuralları

Tarih: 03.11.2026. Kapsam: Ödeme kaydedici cihaz (ÖKC, yazar kasa) fişlerinden Luca "Fiş Detayı" ekranına girilecek yevmiye satırlarının üretilmesi. Kaynak örnek: Örnek Balık Lokantası fişi (0412, 08.09.2026) ve kullanıcının Luca'da elle girdiği kayıt.

Önemli: Tek Düzen Hesap Planı (TDHP) yalnızca ana hesapları (100, 191, 770 vb.) ve bazı grupları sabitler. `770.08`, `191.03.10`, `331.01` gibi **alt hesaplar her firmanın kendi Luca hesap planında tanımlıdır**. Bu dokümandaki alt hesap kodları makul varsayılanlardır; uygulama bunları kullanıcının düzenleyebileceği bir tablo olarak tutmalı, ilk kurulumda kullanıcıdan kendi planıyla eşleştirmesini istemelidir. Luca'da tanımlı olmayan bir alt hesapla kayıt atılamaz (Excel içe aktarma da hata verir).

## 1. Örnek kaydın çözümlemesi

| Hesap Kodu | Hesap Adı | Evrak No | Evrak Tarihi | BT | Açıklama | Borç | Alacak |
|---|---|---|---|---|---|---|---|
| 770.08 | Yeme-İçme Ve Ağırlama Giderleri | 0412 | 08/09/2026 | ÖK | örnek balık lokantası | 5.890,91 | |
| 191.03.10 | % 10 Lı İndirilecek Kdv | 0412 | 08/09/2026 | ÖK | örnek balık lokantası | 589,09 | |
| 331.01 | Ortaklara Borçlar | 0412 | 08/09/2026 | ÖK | örnek balık lokantası | | 6.480,00 |

- Gider satırı = KDV hariç tutar (matrah) = 6.480,00 - 589,09 = 5.890,91.
- KDV satırı = fişte yazan KDV tutarı, KDV oranına göre 191 alt hesabı.
- Alacak satırı = fiş toplamı (KDV dahil), ödeme şekline göre hesap.
- Borç toplamı 6.480,00 = Alacak toplamı 6.480,00. Luca alt bilgide "191 Toplam: 589,09" de gösteriyor; uygulama da aynı kontrol toplamını göstermeli.
- Miktar 0, BaBs işaretsiz.

## 2. Fiş türü -> gider hesabı önerileri

Ana hesap seçimi: Fişler genelde yönetim harcamasıdır, varsayılan **770 Genel Yönetim Giderleri**. Satış ve dağıtımla doğrudan ilgili harcamalar (müşteriye kargo, satış ekibinin yol masrafı) **760 Pazarlama Satış ve Dağıtım Giderleri**'ne gider. Üretim yapan firmalarda üretimle ilgili olanlar 730'a gidebilir; bu ayrım fişten anlaşılamaz, kullanıcı fiş bazında değiştirir.

Alt hesap numaraları Luca'da firmaya göre değişir. Örnekte yemek `770.08` olduğundan, aşağıdaki tablo bu numarayı sabit tutarak sıra uydurur. Tamamı düzenlenebilir.

| Kategori anahtarı | Etiket | Varsayılan hesap | Hesap adı | Tipik KDV | Fiş üzerinde ipucu |
|---|---|---|---|---|---|
| `fuel` | Akaryakıt | 770.01 | Akaryakıt Giderleri | %20 | MOTORİN, BENZİN, LPG, POMPA, LT |
| `stationery` | Kırtasiye | 770.02 | Kırtasiye Giderleri | %20 (kitap/gazete %1-%10) | KIRTASİYE, KAĞIT, TONER |
| `cargo` | Kargo/Posta | 770.03 | Kargo ve Posta Giderleri | %20 | KARGO, PTT, GÖNDERİ |
| `parking` | Otopark/Köprü/Otoyol | 770.04 | Otopark ve Yol Giderleri | %20 | OTOPARK, HGS, OGS |
| `transport` | Ulaşım (taksi, otobüs, uçak) | 770.05 | Seyahat ve Ulaşım Giderleri | %20 (yurt içi yolcu taşıma %10 olabilir) | TAKSİ, BİLET, SEFER |
| `cleaning` | Temizlik malzemesi | 770.06 | Temizlik Giderleri | %20 | DETERJAN, TEMİZLİK |
| `maintenance` | Bakım-onarım | 770.07 | Bakım ve Onarım Giderleri | %20 | SERVİS, TAMİR, YEDEK PARÇA |
| `meal` | Yemek/İkram/Ağırlama | **770.08** | Yeme-İçme Ve Ağırlama Giderleri | %10 (lokanta), %1-%10 (gıda), %20 (alkol) | YEMEK, RESTORAN, LOKANTA, CAFE |
| `telecom` | Telefon/İnternet | 770.09 | Haberleşme Giderleri | %20 | GSM, İNTERNET, FATURA TAHSİLAT |
| `lodging` | Konaklama | 770.10 | Konaklama Giderleri | %10 (konaklama vergisi ayrı satır olabilir) | OTEL, KONAKLAMA |
| `office_supplies` | Büro malzemesi/küçük demirbaş | 770.11 | Büro Malzemesi Giderleri | %20 | |
| `food_grocery` | Mutfak/market (çay, şeker vb.) | 770.12 | Mutfak Giderleri | %1 / %10 / %20 karışık | MARKET |
| `other` | Diğer | 770.99 | Diğer Genel Yönetim Giderleri | fişten | (eşleşme yoksa) |

Kurallar:
- Model fişi bir kategoriye sınıflar; uygulama kategori -> hesap eşlemesini **kullanıcının tablosundan** okur. Model hesap kodu üretmez (tutarlılık ve düzenlenebilirlik için).
- Kullanıcı aynı satıcı (VKN) için hesabı değiştirirse, bu satıcıya özel kural önerilebilir (VKN -> kategori). İlk sürüm için isteğe bağlı.
- Konaklama fişlerinde "Konaklama Vergisi" KDV değildir; KDV matrahına dahil değil, ayrı gider satırı olarak 770.10'a (veya ayrı bir vergi gideri hesabına) yazılır. Uygulama bunu "KDV dışı vergi/harç" satırı olarak ayırmalı.

## 3. KDV oranları ve 191 alt hesapları

### Güncel oranlar
7456 sayılı Kanun sonrası (Temmuz 2023) oranlar **%1, %10, %20**. Eski %8 -> %10, %18 -> %20 oldu. 2026 itibarıyla oran değişikliği yok (aşağıdaki kaynaklarda doğrulandı; kesin işlem bazlı oran için GİB mevzuatı esas). Lokanta yemek hizmeti %10 (örnekte de %10). Alkollü içecek %20. %0 (istisna) satır olabilir: 191 satırı üretilmez.

Eski tarihli (Temmuz 2023 öncesi) fişlerde %8 ve %18 görülebilir; uygulama bunları reddetmemeli, uyarı vermeli ve kullanıcı 191 hesabını seçmeli.

### Hesap eşlemesi (varsayılan, düzenlenebilir)

| Oran | Hesap | Hesap adı |
|---|---|---|
| %1 | 191.03.01 | % 1 Li İndirilecek Kdv |
| %10 | **191.03.10** | % 10 Lı İndirilecek Kdv |
| %20 | 191.03.20 | % 20 Li İndirilecek Kdv |
| %0 | (satır yok) | |

Not: Luca ekranının sağındaki "KDV İşlemleri" kutusu genel `191.01` / `391.01` hesaplarını öneriyor. Örnek firma ise oran bazlı `191.03.xx` kullanıyor. Oran bazlı alt hesap KDV beyannamesi kontrolünü kolaylaştırır; ama hangisinin kullanılacağı firmanın planına bağlı. Tek bir `191.01` kullanan firma için tablodaki üç oran aynı koda eşlenebilir.

### Çok oranlı fişler
ÖKC fişleri KDV'yi oran bazında yazar (ör. "TOPKDV" altında %1: x, %10: y, %20: z). Kural:
1. Her oran için `brüt_oran` (o orandaki KDV dahil satış toplamı) ve `kdv_oran` (fişte yazan) okunur.
2. Her oran için: `matrah_oran = brüt_oran - kdv_oran`.
3. Satırlar: her (gider hesabı, oran) çifti için bir gider satırı + her oran için bir 191 satırı + tek alacak satırı. Aynı gider hesabındaki matrahlar Luca'da tek satırda toplanabilir, ama oran bazında ayrı tutmak kontrolü kolaylaştırır. Varsayılan: oran bazında ayrı gider satırı.
4. Farklı oranlar farklı kategoriye ait olabilir (market fişinde gıda %1, deterjan %20). Model kalem bazında kategori dönerse gider satırları (hesap, oran) bazında gruplanır; dönmezse tüm fiş tek kategori.

### Kuruş ve yuvarlama kuralı
- Tüm tutarlar **integer kuruş** (`8725,00 TL = 648000`). Kayan nokta yok. Fişten okunan "6.480,00" metni doğrudan kuruşa çevrilir (nokta binlik, virgül ondalık).
- KDV fişte yazıyorsa **fişteki değer esastır**, yeniden hesaplanmaz. Matrah çıkarma ile bulunur, böylece borç toplamı her zaman brüte eşit olur.
- KDV fişte okunamadıysa: `kdv = yuvarla(brüt * oran / (100 + oran))`, kuruşta **yarım yukarı** (0,5 kuruş ve üstü yukarı). Integer hesap: `kdv = floor((brüt * oran * 2 + (100 + oran)) / (2 * (100 + oran)))`. Örnek: 648000 * 10 / 110 = 58909,18 -> 58909 (589,09, fişle aynı).
- Doğrulama: `Σ brüt_oran == fiş TOPLAM`. Eşit değilse (indirim, iskonto, okuma hatası) kayıt **otomatik dengelenmez**, kullanıcıya fark gösterilir. Tek istisna: fark oran başına en fazla 1 kuruşsa en büyük matrah satırına eklenir ve not düşülür.
- Model ayrıca `kdv_oran` ile `brüt_oran * oran / (100+oran)` arasında 1 kuruştan büyük fark görürse uyarı (yanlış oran ya da yanlış okuma).
- Son kontrol: `Σ borç == Σ alacak` değilse kayıt onaylanamaz.

## 4. Ödeme şekli -> alacak hesabı

| Ödeme şekli (fişte) | Kimin parası | Varsayılan alacak hesabı | Açıklama |
|---|---|---|---|
| NAKİT | Şirket kasası | 100.01 Kasa | Luca ekranında "Kasa: 100.01" varsayılanı görünüyor |
| BANKA KARTI / KREDİ KARTI | Ortağın kişisel kartı | **331.01 Ortaklara Borçlar** | Örnek kayıt bu |
| KREDİ KARTI | Şirket kredi kartı | 309.01 Diğer Mali Borçlar (Şirket Kredi Kartı) | Bazı firmalar 300 Banka Kredileri altında izler |
| BANKA KARTI | Şirket banka hesabı | 102.01 Bankalar | Hesap ekstreden düşer |
| (herhangi) | Çalışan kendi cebinden | 335.01 Personele Borçlar | Masraf iadesi yapılacak |
| (herhangi) | Ortak nakit ödedi | 331.01 Ortaklara Borçlar | |

**Örnekte kartla ödenen fişin 331.01'e yazılma nedeni:** Fişte sadece "BANKA/KREDİ KARTI" yazar; kartın kime ait olduğu fişte yoktur (maskeli kart numarası olabilir). Harcama ortağın kişisel kartıyla yapıldığı için şirketin kasası ya da bankası azalmamıştır; şirket bu tutarı ortağa borçlanmıştır. Bu yüzden alacak tarafı 331 Ortaklara Borçlar olur. Ortak daha sonra parayı şirketten alırsa `331.01 Borç / 100 veya 102 Alacak` ile kapanır.

Sonuç: "Kart" bilgisi tek başına doğru hesabı belirlemez. Uygulama:
- Ödeme şekli (nakit / kart) fişten okunur.
- Kart için varsayılan hesap **kullanıcı ayarıdır** (bu kullanıcı için 331.01). İleride maskeli kartın son 4 hanesi -> hesap eşlemesi eklenebilir (ör. `**** 1234 -> 331.01`, `**** 5678 -> 309.01`). Kart numarasının sadece son 4 hanesi saklanmalı.
- Her fişte alacak hesabı tek tıkla değiştirilebilir olmalı.

## 5. Açıklama, Evrak No, Evrak Tarihi, BT, BaBs

### Açıklama
Örnek: `ÖRNEK BALIK LOKANTASI` -> `örnek balık lokantası`.
Kural (varsayılan):
1. Unvandaki şirket türü ve faaliyet eklerinden itibaren kesilir: ilk ` VE ` bağlacı veya `LTD`, `ŞTİ`, `A.Ş.`, `AŞ`, `TİC.`, `SAN.`, `İŞL.`, `RES.`, `KOLL.`, `ŞUBESİ` gibi eklerden biri.
2. Kalan kısım **Türkçe kurallarla** küçük harfe çevrilir (`toLocaleLowerCase('tr-TR')`: `I -> ı`, `İ -> i`). Standart `toLowerCase` "ÇİFTLİĞİ"yi bozar.
3. Fazla boşluklar temizlenir; varsayılan en fazla 60 karakter (Luca alan sınırı doğrulanmadı, ayarlanabilir).
4. Sonuç boşsa ilk 4 kelime kullanılır. Kullanıcı açıklamayı her zaman düzenleyebilir.

### Evrak No
Fişteki "FİŞ NO" değeri, **baştaki sıfırlar korunarak metin** olarak (`0412`). Sayıya çevrilmez. Fiş No okunamazsa Z No + Fiş No birleşimi önerilir, kullanıcı onaylar.

### Evrak Tarihi
Fiş tarihi, Luca formatında `GG/AA/YYYY` (`08/09/2026`). Saat kullanılmaz. Fiş tarihi açık muhasebe döneminin dışındaysa (Luca üst sağda dönem 01/01/2026-31/12/2026) uyarı.

### BT (Belge Türü) = "ÖK"
BT, Luca fiş satırındaki **Belge Türü** kolonudur (ekranda kırmızı başlık, yani zorunlu). e-Defter'de her yevmiye satırı için belge tipi istenir. "ÖK" büyük olasılıkla **Ödeme Kaydedici (cihaz) fişi**, yani yazar kasa/ÖKC fişi kısaltmasıdır. Bu, Luca dokümantasyonunda doğrulanamadı; kullanıcı örneğinde ÖKC fişi için ÖK seçilmiş olması tahmini destekliyor. Uygulama:
- ÖKC fişleri için varsayılan BT = `ÖK`.
- Fatura gibi diğer belge türleri bu sürümün kapsamında değil; BT alanı ayardan değiştirilebilir tutulur.
- Luca'ya sorulacak / kullanıcıya doğrulatılacak: BT kod listesi ve Excel içe aktarmada beklenen değer (kod mu, metin mi).

### BaBs
Ba-Bs formları fatura bazlı bildirimlerdir; ÖKC fişleri bu bildirimlere dahil edilmez. Varsayılan: işaretsiz (örnekle aynı). Kullanıcı değiştirebilir.

### Miktar
Varsayılan 0.

## 6. KDV indirimi kısıtları (sadece uyarı)

Uygulama vergi kararı vermez; aşağıdaki durumlarda satırın yanında **bilgi notu** gösterir, kaydı engellemez:
- **Binek otomobil:** Faaliyeti binek oto kiralama/işletmesi olmayan firmalarda binek otomobil alımının KDV'si indirilemez (KDVK 30/b). Binek otomobil giderlerinin (akaryakıt, bakım, otopark) %30'u kanunen kabul edilmeyen gider (GVK 40/5, KVK 11/1-ı); bu kısma isabet eden KDV'nin indirimi uygulamada tartışmalıdır. Kategori `fuel`, `maintenance`, `parking` ise "Binek araç için mi? KKEG ve KDV indirimi kontrol edin" notu.
- **Yemek/ağırlama:** İşle ilgili (müşteri ağırlama, iş yemeği) ise gider ve KDV indirimi kabul edilir. Ortağın/ailenin kişisel harcamasıysa işletmeyle ilgisizdir (KDVK 30/d), KDV indirilemez ve gider KKEG olur. Kategori `meal` ve alacak hesabı 331 ise not: "İşle ilgili olduğunu belgeleyin."
- **Hediye, bağış, kişisel harcamalar:** KDVK 30/d kapsamında indirim yok uyarısı (`other` kategoride kullanıcı işaretlerse).
- **Konaklama vergisi:** KDV değildir, 191'e yazılmaz.
- **Tutar sınırı:** Fatura düzenleme sınırını aşan harcamalarda ÖKC fişi yerine fatura alınması gerekebilir (VUK 232, sınır her yıl yeniden değerleme ile güncellenir). Sınır değeri ayardan girilir; aşılırsa uyarı.

## 7. Uygulama akışı özeti
1. Model fişten yapılandırılmış veri döner: satıcı unvanı, VKN, tarih, fiş no, Z no, kalemler (ad, oran, brüt), oran bazlı KDV, toplam, ödeme şekli, kategori önerisi.
2. Sunucu kuruşa çevirir, kural tablosuyla satırları üretir, kontrolleri çalıştırır (Σ brüt = toplam, KDV tutarlılığı, borç = alacak).
3. Kullanıcı tek ekranda hesapları, açıklamayı ve tutarları düzenler, onaylar.
4. Satırlar Luca kolon düzeninde (Hesap Kodu, Hesap Adı, Evrak No, Evrak Tarihi, BT, Açıklama, Borç, Alacak, Miktar, BaBs) dışa aktarılır.

## 8. Varsayılan kural tablosu (JSON)

Tutarlar yok; sadece eşlemeler. Uygulama bunu ilk kurulumda kullanıcının `account_rules` kayıtlarına kopyalar, sonra kullanıcı düzenler.

```json
{
  "version": 1,
  "expenseCategories": [
    { "key": "fuel",            "label": "Akaryakıt",                 "accountCode": "770.01", "accountName": "Akaryakıt Giderleri",                "keywords": ["MOTORİN", "BENZİN", "LPG", "AKARYAKIT", "POMPA"], "warning": "vehicle" },
    { "key": "stationery",      "label": "Kırtasiye",                 "accountCode": "770.02", "accountName": "Kırtasiye Giderleri",                "keywords": ["KIRTASİYE", "KAĞIT", "TONER", "KALEM"] },
    { "key": "cargo",           "label": "Kargo ve posta",            "accountCode": "770.03", "accountName": "Kargo ve Posta Giderleri",           "keywords": ["KARGO", "PTT", "GÖNDERİ", "KURYE"] },
    { "key": "parking",         "label": "Otopark ve yol",            "accountCode": "770.04", "accountName": "Otopark ve Yol Giderleri",           "keywords": ["OTOPARK", "HGS", "OGS", "OTOYOL", "KÖPRÜ"], "warning": "vehicle" },
    { "key": "transport",       "label": "Ulaşım",                    "accountCode": "770.05", "accountName": "Seyahat ve Ulaşım Giderleri",        "keywords": ["TAKSİ", "BİLET", "SEFER", "OTOBÜS", "HAVAYOLU"] },
    { "key": "cleaning",        "label": "Temizlik",                  "accountCode": "770.06", "accountName": "Temizlik Giderleri",                 "keywords": ["TEMİZLİK", "DETERJAN", "ÇAMAŞIR SUYU"] },
    { "key": "maintenance",     "label": "Bakım ve onarım",           "accountCode": "770.07", "accountName": "Bakım ve Onarım Giderleri",          "keywords": ["SERVİS", "TAMİR", "BAKIM", "YEDEK PARÇA", "LASTİK"], "warning": "vehicle" },
    { "key": "meal",            "label": "Yemek ve ağırlama",         "accountCode": "770.08", "accountName": "Yeme-İçme Ve Ağırlama Giderleri",    "keywords": ["YEMEK", "RESTORAN", "LOKANTA", "CAFE", "KAFE", "RES.İŞL"], "warning": "meal" },
    { "key": "telecom",         "label": "Telefon ve internet",       "accountCode": "770.09", "accountName": "Haberleşme Giderleri",               "keywords": ["GSM", "İNTERNET", "TELEKOM", "HAT"] },
    { "key": "lodging",         "label": "Konaklama",                 "accountCode": "770.10", "accountName": "Konaklama Giderleri",                "keywords": ["OTEL", "KONAKLAMA", "PANSİYON"], "warning": "lodging_tax" },
    { "key": "office_supplies", "label": "Büro malzemesi",            "accountCode": "770.11", "accountName": "Büro Malzemesi Giderleri",           "keywords": ["BÜRO", "OFİS"] },
    { "key": "food_grocery",    "label": "Mutfak ve market",          "accountCode": "770.12", "accountName": "Mutfak Giderleri",                   "keywords": ["MARKET", "ÇAY", "ŞEKER", "SU"] },
    { "key": "other",           "label": "Diğer",                     "accountCode": "770.99", "accountName": "Diğer Genel Yönetim Giderleri",      "keywords": [] }
  ],
  "vatAccounts": [
    { "rate": 1,  "accountCode": "191.03.01", "accountName": "% 1 Li İndirilecek Kdv" },
    { "rate": 10, "accountCode": "191.03.10", "accountName": "% 10 Lı İndirilecek Kdv" },
    { "rate": 20, "accountCode": "191.03.20", "accountName": "% 20 Li İndirilecek Kdv" }
  ],
  "legacyVatRates": [8, 18],
  "paymentRules": [
    { "method": "cash", "label": "Nakit",                 "accountCode": "100.01", "accountName": "Kasa" },
    { "method": "card", "label": "Kart (ortağın kartı)",  "accountCode": "331.01", "accountName": "Ortaklara Borçlar" }
  ],
  "paymentAlternatives": [
    { "label": "Şirket kredi kartı",       "accountCode": "309.01", "accountName": "Diğer Mali Borçlar" },
    { "label": "Şirket banka hesabı",      "accountCode": "102.01", "accountName": "Bankalar" },
    { "label": "Çalışan kendi parasıyla",  "accountCode": "335.01", "accountName": "Personele Borçlar" },
    { "label": "Ortak kendi parasıyla",    "accountCode": "331.01", "accountName": "Ortaklara Borçlar" }
  ],
  "lineDefaults": {
    "documentType": "ÖK",
    "babs": false,
    "quantity": 0,
    "dateFormat": "DD/MM/YYYY",
    "descriptionMaxLength": 60,
    "descriptionCutTokens": [" VE ", "LTD", "ŞTİ", "A.Ş.", " AŞ", "TİC.", "SAN.", "İŞL.", "RES.", "KOLL.", "ŞUBESİ"],
    "descriptionLocale": "tr-TR"
  },
  "rounding": {
    "unit": "kurus",
    "vatFromReceipt": true,
    "vatFallback": "half_up",
    "autoBalanceMaxDiffKurusPerRate": 1
  },
  "warnings": {
    "vehicle": "Binek araç gideri ise %30 KKEG ve KDV indirimi kısıtlarını kontrol edin.",
    "meal": "Ağırlama işle ilgili değilse KDV indirilemez (KDVK 30/d). İşle ilgisini belgeleyin.",
    "lodging_tax": "Konaklama vergisi KDV değildir, 191 hesabına yazılmaz.",
    "legacy_rate": "Fişte güncel olmayan KDV oranı var (%8 veya %18). 191 hesabını kontrol edin.",
    "total_mismatch": "Oran bazlı toplamlar fiş toplamıyla tutmuyor. Tutarları kontrol edin."
  }
}
```

## Kaynaklar ve doğrulanamayanlar
- KDV oranları %1/%10/%20 (2026'da değişiklik yok): [tahanci.av.tr KDV 2026](https://www.tahanci.av.tr/kdv-hesaplama/), [ideasoft güncel KDV oranları](https://www.ideasoft.com.tr/eticaret-kdv-oranlari/), [harbiyehukuk 2026 KDV](https://www.harbiyehukuk.com/?p=1006244). Resmi doğrulama için GİB mevzuatı.
- e-Defter belge tipi alanı: [TÜRMOB e-Defter](https://www.turmob.org.tr/e-donusum/edefter/nedir), [alomaliye e-Defter kayıt şekli](https://www.alomaliye.com/2015/04/06/e-defter-kayit-sekli/), [Luca belge türü notu (muhasebenews)](https://www.muhasebenews.com/?p=120097).
- ÖKC fiş formatı: [GİB YN ÖKC fiş ve e-belge formatları kılavuzu (taslak)](https://ynokc.gib.gov.tr/UploadedFiles/Files/yn-okc-fis-ve-e-belge-formatlari-kilavuz_taslak_16122025.pdf).
- Doğrulanamadı: "ÖK" kısaltmasının Luca'daki resmi anlamı, Luca açıklama alanı karakter sınırı, Luca Excel içe aktarmada BT alanının beklenen değeri, 770 alt hesap numaraları (firmaya özel; sadece 770.08 örnekten kesin).
