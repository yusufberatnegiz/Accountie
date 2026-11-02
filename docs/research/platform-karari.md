# Platform kararı: PWA mı, mobil uygulama mı?

Tarih: 2026-11-03
Durum: Karar verildi (MVP için bağlayıcı)

## Karar

**MVP, mevcut Vercel projesinde (accountie.vercel.app) çalışan, telefona ana ekrana eklenebilen bir Next.js web uygulaması (PWA) olarak yapılacak.** Ayrı bir Expo/React Native uygulaması ve mağaza dağıtımı MVP kapsamında yok.

Fotoğraf çekimi `getUserMedia` ile canlı kamera görüntüsü üzerinden değil, `<input type="file" accept="image/*" capture="environment">` ile telefonun kendi kamera uygulaması açılarak yapılacak.

## Neden

1. **Luca masaüstünde çalışıyor.** Kaydın son adımı (Excel indirip Luca'nın içe aktarma ekranına yüklemek, ileride bir tarayıcı eklentisiyle Fiş Detayı ekranını doldurmak) zaten masaüstü tarayıcıda olur. Mobil uygulama bu adımda hiçbir şey kazandırmaz; yine de bir web arayüzü gerekir. PWA ile telefon (çekim) ve masaüstü (kontrol, onay, aktarım) tek kod tabanı, tek giriş, tek veritabanıdır.
2. **Mevcut altyapı olduğu gibi kullanılır.** Next.js + Vercel + Neon Postgres + Drizzle + Neon Auth (çerez tabanlı oturum) doğrudan çalışır. Mobil uygulamada Neon Auth çerez akışı yerine token tabanlı ayrı bir oturum akışı, ayrı API sözleşmesi ve sürüm uyumluluğu yönetimi gerekirdi.
3. **Kamera kalitesi yeterli.** `capture` ile açılan, iOS ve Android'in kendi kamera uygulamasıdır; çözünürlük, otomatik odak ve pozlama native ile aynıdır. Fiş okumayı bir vision LLM yaptığı için kenar algılama ve perspektif düzeltme şart değil: model hafif eğik ve kırpılmamış fotoğrafı okuyabilir. İstemcide sadece yeniden boyutlandırma (uzun kenar yaklaşık 1600 px, JPEG) yapılır; bu hem yüklemeyi hızlandırır hem LLM maliyetini düşürür.
4. **iOS PWA'nın bilinen kamera sorunlarından kaçınılır.** Ana ekrandan açılan (standalone) iOS PWA'larda `getUserMedia` canlı kamera akışı yıllardır cihaza ve iOS sürümüne göre tutarsız çalıştı (WebKit hata kayıtları 185448, 273938). Dosya girişi (`input capture`) bu sorundan etkilenmez. Bilinen tek kısıt: iOS'ta aynı input ile çekilen her fotoğraf öncekinin yerine geçer; çok sayfalı fiş veya art arda çekim için her çekimi hemen kendi listemize almamız yeterli.
5. **Dağıtım maliyeti ve süresi sıfır.** Mobil uygulama için Apple Developer Program yıllık 99 USD ve her sürümde inceleme (genelde 24 ila 72 saat), Google Play 25 USD tek seferlik kayıt; 2023 sonrası açılan kişisel Play hesaplarında üretime çıkmadan önce 12 test kullanıcısıyla 14 günlük kapalı test zorunluluğu var. PWA'da her düzeltme `git push` ile dakikalar içinde herkese gider.
6. **Geliştirme ve bakım yükü yarı yarıya.** Tek kod tabanı, tek test takımı, tek dağıtım. Mobil uygulamada iki platformun derleme zinciri (EAS/Xcode/Gradle), mağaza politikası güncellemeleri ve eski sürümde kalan kullanıcılar için geriye uyumlu API tutmak gerekir.
7. **Güvenlik modeli daha basit.** API anahtarları (vision LLM dahil) yalnızca Vercel sunucu env'inde kalır, oturum HttpOnly/Secure/SameSite çerezle yönetilir. Mobil uygulamada token'ın cihazda güvenli saklanması (Keychain/Keystore), uygulama paketine sızabilecek yapılandırma ve sertifika yönetimi ek risk alanıdır. Fiş fotoğrafları kart bilgisi içerebildiği için cihazda kalıcı önbelleğe almamak da web'de daha kolay kontrol edilir.

## Karşılaştırma özeti

| Ölçüt | PWA (Next.js) | Mobil uygulama (Expo/React Native) |
|---|---|---|
| Fotoğraf kalitesi | Native kamera uygulaması (`input capture`), aynı kalite | Native kamera |
| Otomatik kenar algılama | Yok (gerekirse OpenCV.js/jscanify, yaklaşık 0,5 sn/görüntü) | ML Kit Document Scanner (Android), VisionKit (iOS), Expo Go'da değil, dev build ile |
| Çekim hızı | Bir dokunuş, kamera açılır, onay, yükleme | Benzer; canlı tarama biraz daha akıcı |
| iOS kısıtları | Standalone'da `getUserMedia` güvenilmez (kullanmıyoruz); kurulum elle "Ana Ekrana Ekle" | Yok |
| Luca'ya aktarım (masaüstü) | Aynı uygulama masaüstünde açılır, Excel indirme ve ileride tarayıcı eklentisi doğal uyumlu | Masaüstü için yine ayrı web arayüzü gerekir |
| Mevcut Vercel/Neon altyapısı | Doğrudan | Sunucu aynı kalır ama ayrı token tabanlı auth ve API katmanı gerekir |
| Dağıtım | Anında, ücretsiz | Apple 99 USD/yıl + inceleme; Play 25 USD + kapalı test şartı |
| Geliştirme/bakım | Tek kod tabanı | İki kod tabanı (mobil + web) |
| Telefon ve masaüstü birlikte | Evet, tek ürün | Hayır, iki ürün |

## Ne zaman diğerine geçilir

Aşağıdakilerden biri gerçekleşirse platform yeniden değerlendirilir:

- Saha kullanımında fişlerin kayda değer bir kısmı (örneğin yüzde 10'dan fazlası) perspektif, parlama veya arka plan yüzünden LLM tarafından yanlış okunuyor ve istemcide basit kırpma/yönlendirme rehberi bunu düzeltmiyorsa.
- Muhasebeciler gün içinde onlarca fişi art arda, çevrimdışı tarayıp sonra toplu göndermek istiyorsa (native doküman tarayıcının çok sayfa ve çevrimdışı kuyruk avantajı belirleyici olur).
- Müşteriler mağazadan kurulum, push bildirim güvenilirliği veya MDM ile dağıtım istiyorsa.

Geçiş yolu önce **Capacitor ile mevcut web uygulamasını sarmak** olmalı: aynı Next.js arayüzü kalır, sadece çekim ekranına ML Kit / VisionKit doküman tarayıcı eklentisi bağlanır. Expo/React Native ile sıfırdan yeniden yazım ancak Capacitor bu ihtiyaçları karşılamazsa düşünülür. Sunucu tarafı (Next.js API, Neon, Drizzle) her durumda değişmez.

## MVP için uygulama notları

- Manifest `display: standalone`; kamera `getUserMedia` ile değil `input capture` ile açılır.
- Yüklemeden önce istemcide canvas ile yeniden boyutlandırma ve EXIF yönü düzeltme; EXIF konum verisi atılır.
- Yükleme uç noktası: oturum sunucuda doğrulanır, MIME ve boyut sınırı (örneğin 10 MB), rastgele dosya adı, herkese açık olmayan depolama.
- Service worker fiş görüntülerini ve API yanıtlarını önbelleğe almaz (kart bilgisi içerebilir).
- Masaüstü ekranı: kontrol, düzeltme, onay ve Luca için Excel indirme.

## Kaynaklar

- WebKit hata kaydı 185448 (standalone iOS'ta getUserMedia): https://bugs.webkit.org/show_bug.cgi?id=185448
- WebKit hata kaydı 273938 (iOS 17.4.1 PWA'da kamera akışı): https://bugs.webkit.org/show_bug.cgi?id=273938
- iOS PWA uyumluluk notları: https://firt.dev/notes/pwa-ios/
- iOS Safari'de art arda çekimin önceki fotoğrafın yerine geçmesi: https://developer.apple.com/forums/thread/826732
- jscanify (OpenCV.js tabanlı tarayıcı doküman tarayıcı): https://dynamsoft.com/codepool/web-document-scanner-with-opencvjs.html
- Apple Developer Program ücreti ve inceleme süresi (ikincil kaynak): https://studio.adalo.com/blog/apple-developer-program-guide
- Google Play 12 test kullanıcısı / 14 gün kuralı (ikincil kaynak): https://www.testerscommunity.com/google-play-closed-testing

Not: Ücret ve inceleme süreleri resmi Apple/Google sayfalarından değil ikincil kaynaklardan alındı; karar bu rakamlara duyarlı değildir.
