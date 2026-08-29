# Accountie MVP — Ürün Gereksinimleri

## 1. Ürün tanımı

Accountie, tek bir muhasebe ofisinin GİB ve SGK süreleri ile SGK duyuruları ve Resmî Gazete gelişmelerini tek ekranda takip etmesini sağlayan kapalı web uygulamasıdır. Luca muhasebe işlemleri için kullanılmaya devam eder; Accountie evrak veya muhasebe kaydı işlemez.

Hedef: üç gün içinde ofis kullanımına açılabilen, resmî kaynağa dayalı ve sade bir takip MVP'si.

## 2. Kullanıcı ve yetki

- Yalnızca ofis çalışanları giriş yapar.
- Giriş ekranında e-posta/parola ile hesap oluşturma bulunur; kullanıcılar Neon Auth üzerinde açılır.
- Tüm oturum açmış kullanıcılar aynı ürün yetkisine sahiptir.
- Ayrı admin paneli, admin/staff ayrımı ve içerik onay kuyruğu yoktur.
- Not, favori ve okundu bilgisi kullanıcıya özeldir.

## 3. Temel ilkeler

- Takvim ve güncel akış verileri yalnızca GİB, SGK ve Resmî Gazete'nin resmî HTTPS yüzeylerinden gelir.
- Demo, seed, elle yazılmış veya üçüncü taraf takvim/mevzuat kaydı kullanıcıya gösterilmez.
- Yeni ve değişmiş geçerli kayıtlar otomatik yayımlanır.
- Her kayıtta resmî kaynağa giden bağlantı bulunur.
- Bir kaynak hata verirse diğerleri çalışmaya devam eder ve eski kayıtlar silinmez.
- Kaynak güncelliği kullanıcıya görünürdür; herkes manuel tarama başlatabilir.

## 4. MVP özellikleri

### 4.1 Giriş

- E-posta/parola ile giriş ve çıkış.
- Korunan sayfalar oturumsuz kullanıcıyı girişe yönlendirir.
- Hatalı giriş anlaşılır Türkçe hata gösterir.

### 4.2 Dashboard

- `Bugün son gün`, `7 gün içinde`, `Yaklaşan GİB`, `Yaklaşan SGK` kartları.
- Son güne göre sıralı öncelikli yükümlülük tablosu.
- Yaklaşan kişisel not hatırlatmaları.
- Üst barda kaynak sağlığı ve `Şimdi tara`.

### 4.3 Beyan ve ödeme takvimi

- GİB resmî Vergi Takvimi kayıtları kullanılır.
- GİB kaydındaki SGK/sigorta türleri SGK olarak sınıflandırılır.
- Sütunlar: favori, kalan süre, son gün, kaynak, vergi/tür, işlem, dönem, açıklama, son kontrol.
- Arama; kaynak, işlem, vergi türü, aciliyet, başlangıç/bitiş tarihi ve geçmiş kayıt filtreleri.
- Aciliyet İstanbul tarihine göre son gün, 1–3, 4–7, 8+ ve geçmiş olarak hesaplanır.

### 4.4 Güncel akış

- GİB takvim değişiklikleri, SGK duyuruları ve günlük Resmî Gazete fihristi tek kronolojik akışta gösterilir.
- Başlık/içerik araması, kaynak ve yalnızca okunmamış filtresi bulunur.
- Kayıt favorilenebilir ve okundu/okunmadı yapılabilir.
- Otomatik hukuki veya AI özeti üretilmez; kaynaktaki açıklama kullanılır.

### 4.5 Notlar

- Kişisel not oluşturma, düzenleme, tamamlama/geri açma ve silme.
- Başlık, gövde, not tarihi ve isteğe bağlı hatırlatma zamanı.
- İsteğe bağlı takvim veya güncel akış kaydı bağlantısı.
- Yaklaşan tamamlanmamış hatırlatmalar dashboard'da görünür.

### 4.6 Favoriler

- Takvim ve güncel akış kayıtları yıldızlanabilir.
- Favoriler tek sayfada resmî bağlantılarıyla listelenir.
- Favori durumu kullanıcıya özeldir.

### 4.7 Kaynak toplama ve sağlık

- GİB Vergi Takvimi JSON servisi, SGK resmî Duyuru sayfası ve Resmî Gazete günlük sayfası taranır.
- Vercel Cron günde bir kez 05:00 UTC/08:00 İstanbul saatinde çalışır.
- `Şimdi tara` aynı akışı manuel tetikler.
- Her kaynak bağımsız çalışır; bulunan/değişen adet ve hata kaydedilir.
- Aynı kayıt tekrar tarandığında kopya oluşmaz.
- Son başarılı ve son hatalı tarama kaynak sağlığına yansır.

## 5. Kapsam dışı

- Luca entegrasyonu veya Luca'nın yerine geçme
- Evrak, fatura, banka hareketi, cari, bordro, defter
- Beyanname gönderme veya vergi/prim ödeme
- Çoklu ofis, müşteri portalı, abonelik/faturalandırma
- SMS/WhatsApp, mobil uygulama, e-posta bildirimi
- Ürün içi AI, PDF/OCR, otomatik hukuki yorum/özet
- Kaynak editörü, manuel mevzuat/takvim girişi ve admin onay paneli

## 6. Başarı ve kabul kriterleri

- Üç resmî kaynak için en az bir canlı tarama başarıyla tamamlanır.
- Takvimde GİB ve SGK sınıfları gerçek kayıtlarla görünür.
- Aynı taramanın ikinci çalışması kopya üretmez.
- Kaynak hatası eski kayıtları silmez ve üst barda görünür olur.
- Favori, okundu ve not sahipliği iki farklı kullanıcı arasında ayrılır.
- Cron yanlış/eksik secret ile 401 döndürür.
- Login hata yönlendirmesi Türkçe karakterlerde sunucu hatası üretmez.
- Lint, TypeScript, unit/fixture testleri ve production build geçer.
- Dashboard, takvim, akış, favoriler ve notlar masaüstü/mobil smoke testini geçer.

## 7. MVP sonrası

E-posta/takvim bildirimi, CSV dışa aktarma, gelişmiş SGK süre kaynağı, müşteri bazlı not/etiket ve kaynak değişiklik geçmişi kullanım ihtiyacı doğrulandıktan sonra değerlendirilir.
