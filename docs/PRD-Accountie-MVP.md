# Product Requirements Document: Accountie MVP

## 1. Genel Bakış

**Ürün adı:** Accountie  
**Ürün tipi:** Muhasebe ofisi için iç kullanım web uygulaması  
**Tek cümlelik tanım:** Accountie, resmî kaynaklardaki beyan/ödeme tarihlerini ve muhasebeyle ilgili duyuruları otomatik toplayıp ofis çalışanlarına sade bir takip ekranında sunar.  
**MVP hedefi:** Ofisin günlük yükümlülük ve mevzuat takibini tek ekrandan, kaynağı doğrulanabilir şekilde yapabilmesini sağlamak.  
**Hedef yayın tarihi:** Başlangıçtan itibaren 3 gün  
**Kullanıcı seviyesi:** Orta teknik seviye  

## 2. Ürün Kararları

- Accountie, Luca'nın yerine geçmez ve muhasebe kaydı tutmaz.
- MVP yalnızca tek muhasebe ofisi tarafından kullanılır; çok kiracılı SaaS değildir.
- Evrak, fatura, banka, bordro, cari hesap ve defter işlemleri kapsam dışıdır.
- Yapay zekâya soru sorma özelliği MVP sonrası değerlendirilir.
- Veriler resmî kaynaklardan otomatik toplanır.
- Otomatik toplanan kritik tarih değişiklikleri yönetici onayı olmadan yayımlanmaz.
- Her yayımlanmış içerikte resmî kaynak bağlantısı ve son kontrol zamanı bulunur.

## 3. Problem Tanımı

Muhasebe ofisi çalışanları vergi ve SGK sürelerini, süre uzatmalarını, Resmî Gazete içeriklerini ve kurum duyurularını farklı sitelerden takip etmek zorundadır. Bu da şu riskleri doğurur:

- Yaklaşan veya değişen bir son tarihin gözden kaçması
- Aynı bilginin ekip içinde tekrar tekrar kontrol edilmesi
- Bir bilginin hangi resmî kaynağa dayandığının bulunamaması
- Günlük mevzuat akışında muhasebeyi ilgilendiren içeriklerin kaybolması
- Kişisel not ve hatırlatmaların farklı araçlara dağılması

Accountie bu bilgileri tek bir ofis ekranında toplar; kaynağı görünür tutar ve yaklaşan tarihleri önem seviyesine göre sıralar.

## 4. Hedef Kullanıcılar

### Birincil kullanıcı

**Rol:** Muhasebe ofisi çalışanı / mali müşavir yardımcısı  
**Teknik seviye:** Orta  
**Mevcut araçlar:** Luca, GİB, SGK, Resmî Gazete, tarayıcı yer imleri ve kişisel notlar  
**Hedefleri:** Günün kritik işlemlerini hızlı görmek, mevzuat değişikliklerinden haberdar olmak ve kaynağa tek tıkla ulaşmak  
**Sorunları:** Dağınık kaynaklar, yoğun tablolar, değişen tarihler ve tekrar eden manuel kontrol

### İkincil kullanıcı

**Rol:** Ofis yöneticisi / mali müşavir  
**Hedefleri:** Kaynak taramalarının çalıştığını, kritik tarihlerin doğrulandığını ve ekibin güncel bilgiye baktığını görmek

## 5. Ana Kullanıcı Hikâyeleri

1. Bir ofis çalışanı olarak bugün ve önümüzdeki yedi gün içinde sona erecek yükümlülükleri görmek istiyorum; böylece kritik tarihleri kaçırmayayım.
2. Bir ofis çalışanı olarak bir takvim kaydının resmî kaynağına gitmek istiyorum; böylece bilginin doğruluğunu kendim kontrol edebileyim.
3. Bir ofis çalışanı olarak GİB, SGK ve Resmî Gazete içeriklerini tek akışta görmek istiyorum; böylece farklı siteleri sürekli kontrol etmeyeyim.
4. Bir ofis çalışanı olarak içerikleri filtrelemek, favorilemek ve not eklemek istiyorum; böylece yalnızca benim için önemli bilgilere dönebileyim.
5. Bir yönetici olarak otomatik taramada bulunan yeni veya değişmiş kayıtları onaylamak istiyorum; böylece hatalı bir tarih ekibe doğrudan gösterilmesin.
6. Bir yönetici olarak kaynakların son başarılı tarama zamanını ve hatalarını görmek istiyorum; böylece sistemin güncelliğine güvenebileyim.

## 6. MVP Kapsamı

### P0 — Yayın için zorunlu

#### 6.1 Ofis içi kullanıcı girişi

**Açıklama:** Yalnızca yönetici tarafından açılmış ofis hesapları sisteme erişebilir.

**Kabul kriterleri:**

- Herkese açık kayıt ekranı bulunmaz.
- Kullanıcı e-posta ve parola ile giriş/çıkış yapabilir.
- `admin` ve `staff` rolleri vardır.
- Yönetim ve kaynak onay ekranları yalnızca `admin` rolüne açıktır.
- Başarısız giriş veya yetkisiz erişim güvenli bir hata üretir.

#### 6.2 Beyan ve ödeme takvimi

**Açıklama:** GİB ve uygun SGK kaynaklarından gelen yükümlülükler tarih ve önem durumuyla listelenir.

**Gösterilecek alanlar:**

- Kalan gün / durum
- Son gün
- Kaynak kurum
- Vergi veya yükümlülük türü
- İşlem türü
- İlgili dönem
- Açıklama
- Resmî kaynak bağlantısı
- Son kontrol zamanı

**Kabul kriterleri:**

- Kullanıcı günlük ve aylık tarih aralığı seçebilir.
- Kurum, işlem türü, vergi türü ve önem durumuna göre filtreleme yapılabilir.
- Metin araması başlık, açıklama ve dönem alanlarında çalışır.
- Durumlar İstanbul tarihine göre hesaplanır: `Son gün`, `1–3 gün acil`, `4–7 gün yaklaşıyor`, `8+ gün zaman var`, `geçti`.
- Dashboard kartlarındaki sayılar aktif filtrelerle tutarlıdır.
- Her kayıt tek tıkla resmî kaynağa açılır.

#### 6.3 Otomatik resmî kaynak taraması

**Açıklama:** Sistem GİB Vergi Takvimi, SGK duyuruları ve Resmî Gazete günlük içeriklerini zamanlanmış görevle toplar.

**Kabul kriterleri:**

- Tarama günde en az bir kez otomatik çalışır.
- Admin, `Şimdi tara` düğmesiyle manuel tarama başlatabilir.
- Aynı içerik tekrar tarandığında kopya kayıt oluşmaz.
- Yeni, değişmiş ve kaldırılmış olabilecek içerikler ayrı işaretlenir.
- Kaynaktan gelen ham başlık, tarih, URL ve içerik özeti/snapshot hash'i saklanır.
- Yeni takvim kaydı veya tarih değişikliği önce `İnceleme bekliyor` durumuna alınır.
- Admin onayından sonra yayımlanır; reddedilen kayıt kullanıcı ekranına çıkmaz.
- Başarısız tarama eski yayımlanmış verileri silmez.
- Kaynak ekranı son başarı, son hata ve bulunan değişiklik sayısını gösterir.

#### 6.4 Günlük mevzuat ve Resmî Gazete akışı

**Açıklama:** Resmî Gazete, GİB ve SGK içerikleri kronolojik bir akışta sunulur.

**Kabul kriterleri:**

- İçerikler kurum ve içerik türüne göre filtrelenebilir.
- Kartta başlık, yayın tarihi, kurum ve resmî bağlantı gösterilir.
- Resmî Gazete için günlük sayı/ilan bağlantısı gösterilir; MVP'de tam metin sınıflandırması yapılmaz.
- Kullanıcı bir kaydı okundu veya favori olarak işaretleyebilir.
- Otomatik özet üretilmez; kaynakta bulunan açıklama kullanılır veya admin kısa not ekler.

#### 6.5 Ana sayfa

**Açıklama:** Görseldeki sisteme benzer biçimde kritik bilgilerin özetlendiği başlangıç ekranıdır.

**Kabul kriterleri:**

- `Bugün son gün`, `7 gün içinde`, `Yaklaşan vergi` ve `Yaklaşan SGK` kartları bulunur.
- Bugün son günü olan kayıt varsa görünür acil uyarısı çıkar.
- Son takvim kayıtları önem rengine göre listelenir.
- Son mevzuat duyuruları ayrı bir bölümde gösterilir.
- Kaynakların güncel olup olmadığı üst alanda görünür.

#### 6.6 Notlar, hatırlatmalar ve favoriler

**Açıklama:** Kullanıcı, sistem kayıtlarına bağlı veya bağımsız kişisel not oluşturabilir.

**Kabul kriterleri:**

- Kullanıcı not ekleyebilir, düzenleyebilir ve silebilir.
- Not isteğe bağlı olarak bir takvim/mevzuat kaydına bağlanabilir.
- Hatırlatma tarihi seçilebilir ve yaklaşan notlar ana sayfada gösterilir.
- Kullanıcı takvim ve mevzuat kayıtlarını favorileyebilir.
- Notlar yalnızca notu oluşturan kullanıcıya görünür.

#### 6.7 Yönetim paneli

**Açıklama:** Admin, otomatik bulunan değişiklikleri ve kaynak sağlığını yönetir.

**Kabul kriterleri:**

- İnceleme bekleyen kayıtlar eski/yeni değerleriyle gösterilir.
- Admin kaydı onaylayabilir, reddedebilir veya düzenleyip yayımlayabilir.
- Manuel takvim veya mevzuat kaydı eklenebilir.
- Yayımlanmış kayıttaki değişiklikler işlem geçmişine yazılır.
- Kaynak etkinleştirilebilir/devre dışı bırakılabilir.
- Her yönetim işlemi kullanıcı ve zaman bilgisiyle kaydedilir.

### P1 — Üç gün içinde zaman kalırsa

- Uygulama içi okunmamış bildirim merkezi
- Takvim görünümü; P0 tablo görünümüdür
- CSV dışa aktarma
- Kullanıcıya özel varsayılan filtrelerin kaydedilmesi
- Basit e-posta özeti

### P2 — MVP sonrası

- Kaynak gösteren yapay zekâ soru-cevap özelliği
- Mevzuat metinlerini otomatik sınıflandırma ve özetleme
- Firma/mükellef profiline göre kişiselleştirilmiş yükümlülükler
- Çoklu muhasebe ofisi ve SaaS abonelik yapısı
- Mobil uygulama
- WhatsApp/SMS bildirimleri
- Teşvik uygunluk hesaplama motoru
- Gelişmiş mevzuat sürüm karşılaştırması

## 7. Kapsam Dışı

| Özellik | Gerekçe |
|---|---|
| Luca entegrasyonu | Luca mevcut muhasebe sistemidir; MVP'nin amacı bilgi takibidir. |
| Evrak/fatura işleme ve OCR | Ürün problemiyle ilgili değildir ve üç günlük hedefi riske atar. |
| Banka, cari, stok, bordro ve defter kayıtları | Tam muhasebe ürünü kapsamına girer. |
| Beyanname gönderme veya ödeme yapma | Yüksek riskli ve yetki gerektiren dış işlemlerdir. |
| Yapay zekâ | Kullanıcı kararıyla MVP sonrasına bırakılmıştır. |
| Çoklu tenant/SaaS | İlk sürüm tek ofis içindir. |
| Tam Resmî Gazete PDF metin çıkarımı | Üç günlük MVP için gereksiz ve kırılgandır; bağlantı ve metadata yeterlidir. |

## 8. Bilgi Mimarisi ve Ekranlar

### Sol menü

1. Ana Sayfa
2. Beyan & Ödeme Takvimi
3. Güncel Akış
4. Notlar & Hatırlatmalar
5. Favoriler
6. Kaynaklar
7. Yönetim
8. Ayarlar

`Kaynaklar` ve `Yönetim` yalnızca admin rolünde görünür.

### Temel akışlar

**Günlük takip:** Giriş → Ana sayfa → Acil kayıtları incele → Filtreli takvime geç → Resmî kaynağı aç.  
**Kaynak kontrolü:** Yönetim → Kaynak durumu → Şimdi tara → Bulunan değişiklikler → Onayla/reddet.  
**Kişisel takip:** Takvim veya güncel akış → Favorile / not ekle → Hatırlatma belirle → Ana sayfadan tekrar aç.

## 9. UI/UX Yönü

**Tasarım hissi:** Kurumsal, sade, hızlı, bilgi yoğun fakat okunabilir  
**Referans:** Kullanıcının paylaştığı koyu mavi sol menülü, kart ve tablo tabanlı muhasebe takip ekranı

### Tasarım ilkeleri

- Acil durum rengi yalnızca gerçekten acil kayıtlarda kullanılır.
- Renk tek başına anlam taşımaz; her renkle birlikte metin/ikon bulunur.
- Tablo başlığı sabit, satırlar taranabilir ve mobilde yatay taşma kontrollüdür.
- En önemli eylemler: `Kaynağa git`, `Favorile`, `Not ekle`, admin için `Onayla`.
- Masaüstü önceliklidir; tablet kullanılabilir olmalıdır. Telefon görünümü temel işlevleri korur.

## 10. Otomasyon ve Kaynak Politikası

- MVP'de ürün içi yapay zekâ yoktur.
- Otomasyon yalnızca resmî kaynaklardan veri toplar, normalize eder ve değişiklik önerisi üretir.
- Kullanıcıya gösterilen tüm takvim ve Resmî Gazete kayıtları canlı resmî kaynaktan gelmelidir; demo, seed veya üçüncü taraf kopya gösterilmez.
- Canlı kaynak erişilemezse kayıt uydurulmaz ve cache yeni veri gibi sunulmaz; kaynak hatası açıkça gösterilir.
- Dış sayfalardaki metin veri olarak ele alınır; uygulama talimatı olarak çalıştırılmaz.
- Kritik tarih ve açıklama değişiklikleri insan onayından geçer.
- Her kaynak için ayrık toplayıcı bulunur; bir kaynağın bozulması diğerlerini durdurmaz.
- Kaynağın kullanım koşulları veya teknik erişim şekli değişirse ilgili toplayıcı kapatılabilir.

## 11. Başarı Ölçütleri

### Lansman ölçütleri

- P0 kullanıcı akışlarının tamamı üretimde çalışır.
- Yayımlanmış takvim kayıtlarının %100'ünde resmî kaynak URL'si vardır.
- Zamanlanmış ve manuel taramaların sonucu `sync_runs` kaydına yazılır.
- Aynı kaynak iki kez tarandığında mükerrer içerik oluşmaz.
- Kaynak hatası kullanıcıya eski veriyi yeniymiş gibi göstermeden görünür olur.
- Ofis çalışanı bugünkü kritik kayıtlara ana sayfadan en fazla iki tıklamayla ulaşır.

### İlk 30 gün izlenecek sinyaller

- Günlük aktif ofis kullanıcısı sayısı
- Takvim ve güncel akış açılma sayısı
- Favori ve not kullanım sayısı
- Kaynak başına başarılı/başarısız tarama oranı
- Tespit edilen ve onaylanan değişiklik sayısı
- Yanlış veya eksik içerik için açılan iç geri bildirim sayısı

## 12. Fonksiyonel Olmayan Gereksinimler

### Performans

- Normal ofis bağlantısında ana sayfanın temel içeriği 3 saniye içinde kullanılabilir olmalıdır.
- Takvim listesi 1.000 kayıt seviyesinde sayfalama veya sunucu tarafı filtreleme kullanmalıdır.
- Kaynak taraması kullanıcı isteğini uzun süre bloke etmemeli; çalışıyor durumu gösterilmelidir.

### Güvenlik ve gizlilik

- Kayıt ekranı yoktur; kullanıcılar admin tarafından oluşturulur.
- Oturum ve yetkilendirme sunucu tarafında doğrulanır.
- Admin servis anahtarı istemci koduna gönderilmez.
- Kaynak tarama uç noktası gizli anahtar ile korunur.
- Notlar kullanıcı bazında erişim politikasına tabidir.
- Şifreler uygulama veritabanında düz metin tutulmaz; kimlik sağlayıcı yönetir.

### Erişilebilirlik

- Klavye ile temel gezinme mümkündür.
- Form alanları etiketlidir.
- Metin ve arka plan kontrastı WCAG AA hedefini karşılar.
- Durumlar yalnızca renkle anlatılmaz.

### Güvenilirlik

- Tarama tekrar çalıştırılabilir ve idempotent olmalıdır.
- Başarısız tarama yayımlanmış kayıtları silmez.
- Tarih değişiklikleri sürüm/audit kaydı bırakır.
- Sistem saat hesaplarında `Europe/Istanbul` zaman dilimini esas alır.

## 13. Riskler ve Önlemler

| Risk | Etki | Önlem |
|---|---|---|
| Resmî sayfanın HTML yapısı değişir | Yüksek | Kaynak bazlı parser testi, hata görünürlüğü, eski veriyi koruma ve manuel kayıt seçeneği |
| Yanlış tarih otomatik yayımlanır | Yüksek | Kritik değişiklikleri taslakta tutma ve admin onayı |
| Üç günlük süre aşılır | Yüksek | P0 tablo görünümü; e-posta, takvim UI ve gelişmiş sınıflandırmayı P1'e bırakma |
| Cron görevi çalışmaz veya tekrar çalışır | Orta | Gizli anahtar, idempotent upsert, çalışma kaydı ve `Şimdi tara` alternatifi |
| Resmî kaynak geçici olarak kapalıdır | Orta | Son başarılı tarama zamanı, hata durumu ve mevcut veriyi koruma |
| Resmî Gazete içerik hacmi yüksektir | Orta | MVP'de yalnızca günlük sayı, başlık ve resmî bağlantı toplama |

## 14. Üç Günlük Teslim Planı

### Gün 1 — Temel

- Next.js, Supabase ve Vercel kurulumu
- Kullanıcı girişi ve roller
- Veritabanı şeması ve örnek veri
- GİB takvim toplayıcısı
- Takvim listeleme ve filtreleme

### Gün 2 — Kaynaklar ve kullanım

- SGK ve Resmî Gazete toplayıcıları
- Güncel akış
- Ana sayfa kartları
- Admin inceleme/onay ekranı
- Notlar ve favoriler

### Gün 3 — Sağlamlaştırma ve yayın

- Parser, durum hesabı ve yetki testleri
- Manuel `Şimdi tara` ve kaynak sağlık ekranı
- Mobil/tablet kontrolü
- Hata durumları, yükleniyor/boş ekranlar
- Üretim veritabanı, gizli değişkenler ve dağıtım
- Son kaynak doğrulaması ve canlı smoke test

## 15. Açık Noktalar ve Varsayımlar

- Aylık altyapı bütçesi belirtilmedi. MVP, yönetilen servislerin düşük kullanım katmanlarına uygun tasarlanacaktır; üretim öncesinde güncel fiyatlar kontrol edilmelidir.
- İlk kullanıcı sayısının küçük bir ofis ekibi olduğu varsayılmıştır.
- E-posta özeti P1'dir; MVP'nin zorunlu bildirimi ana sayfa ve uygulama içi görünürlüktür.
- Kaynakların herkese açık resmî sayfaları kullanılacaktır; özel oturum, CAPTCHA veya kimlik bilgisi aşılmayacaktır.
- Resmî sayfalarda kararlı bir API tespit edilirse HTML ayrıştırma yerine API tercih edilir.

## 16. MVP Tamamlanma Tanımı

- [ ] P0 kabul kriterleri karşılandı.
- [ ] Admin ve staff yetkileri test edildi.
- [ ] GİB, SGK ve Resmî Gazete için en az bir canlı tarama başarılı oldu.
- [ ] Parser fixture testleri ve iş kuralı testleri geçti.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` ve `npm run build` başarılı.
- [ ] Dashboard, takvim, güncel akış, notlar ve admin inceleme akışı üretimde kontrol edildi.
- [ ] Her yayımlanan içerikte resmî URL ve kontrol zamanı bulunuyor.
- [ ] Kaynak hatası ve boş durum ekranları çalışıyor.
- [ ] Proje kurulum ve işletim adımları README'de yer alıyor.

---

*Oluşturulma tarihi: 28 Ağustos 2026*  
*Durum: Teknik tasarıma hazır*  

## Handoff Context

- Stage: prd
- App name: Accountie
- User level: C
- Target platform: Web
- Budget: TBD; düşük kullanım odaklı
- Timeline: 3 gün
- Source files: PRD-Accountie-MVP.md

```json
{
  "appName": "Accountie",
  "oneLiner": "Muhasebe ofisi için resmî kaynaklı beyan, ödeme ve mevzuat takip ekranı.",
  "targetUsers": "Tek bir muhasebe ofisinin çalışanları ve yöneticisi",
  "phase": "MVP",
  "mustHave": [
    "ofis içi kullanıcı girişi",
    "beyan ve ödeme takvimi",
    "otomatik resmî kaynak taraması",
    "güncel mevzuat ve Resmî Gazete akışı",
    "ana sayfa",
    "notlar ve favoriler",
    "admin inceleme paneli"
  ],
  "niceToHave": [
    "uygulama içi bildirim merkezi",
    "takvim görünümü",
    "CSV dışa aktarma",
    "e-posta özeti"
  ],
  "notInMvp": [
    "Luca entegrasyonu",
    "muhasebe ve evrak işleme",
    "yapay zekâ",
    "çoklu ofis SaaS",
    "beyanname gönderme veya ödeme"
  ],
  "successMetrics": [
    "tüm yayımlanmış kayıtlarda resmî kaynak URL'si",
    "mükerrer üretmeyen kaynak taraması",
    "P0 akışlarının üç gün içinde üretime alınması"
  ]
}
```
