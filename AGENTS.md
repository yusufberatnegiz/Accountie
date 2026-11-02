# AGENTS.md: Accountie

## Proje

- **Ne:** Yazar kasa fişinin fotoğrafından Luca için yevmiye kaydı hazırlayan, kullanıcı onayından sonra Luca Excel veri aktarımı dosyası üreten Next.js PWA.
- **Kimin için:** Luca web sürümünü kullanan muhasebeciler.
- **Dil:** Arayüz metinleri, dokümanlar ve raporlar Türkçe. Kod tanımlayıcıları İngilizce.

## Önce oku (gerekiyorsa)

- Kurallar ve yasaklar: `INSTRUCTIONS.md` (skill kullanımı, tasarım, güvenlik). Her işte geçerli.
- Kapsam ve kabul kriterleri: `docs/PRD.md`.
- Mimari, veri modeli, API: `docs/TECH_DESIGN.md`.
- Gerekçeler ve kaynaklar: `docs/research/*.md` (platform, Luca aktarımı, model, hesap kuralları).
- Kısa özetler: `agent_docs/` (project_brief, product_requirements, tech_stack, code_patterns, testing).
- İş bitirme kontrolü: `docs/REVIEW-CHECKLIST.md`.

## Komutlar

- `npm test`: vitest. Veritabanı, oturum ve Anthropic her zaman mock.
- `npm run typecheck`, `npm run lint`, `npm run build`: build env olmadan da geçer (auth ve DB istemcisi tembel oluşturulur).
- `npm run db:generate`: sadece `drizzle/` altına migration dosyası üretir, veritabanına bağlanmaz. `drizzle-kit push` ve `migrate` canlı veritabanına dokunur, onaysız çalıştırma.

## Dikkat (gotcha)

- **Para her yerde tam sayı kuruş.** `number` kayan nokta toplamı yok. TL'ye çevirme yalnızca ekranda ve Excel hücresine yazarken.
- **Model tutarı metin olarak döndürür** (`"8.725,00"`); kuruşa çeviren `parseTrAmount`. Nokta binlik, virgül ondalık. Modelden sayı isteme.
- **Matrah = brüt - fişteki KDV.** KDV'yi yeniden hesaplama; sadece fişte okunamadıysa yarım yukarı formül.
- **Model hesap kodu üretmez**, kategori döner. Hesap kodu kullanıcının `account_rules` tablosundan gelir.
- **Türkçe küçük harf:** `toLocaleLowerCase('tr-TR')`. Düz `toLowerCase` "ÇİFTLİĞİ"yi bozar.
- **Evrak No metindir** (`0047`). Sayıya çevirme; Excel'de metin hücresi.
- **Luca kolon adları kesin değil.** Hepsi `src/lib/luca/` içindeki tek sabitte; başka yerde kolon adı yazma.
- **Haiku 5.5'e `temperature`, `top_p`, prefill gönderme** (400 döner).
- **Eski veritabanında başka tablolar var** (favorites, notes, items vb.). Silme, değiştirme, yeniden adlandırma yok. Migration yalnızca `CREATE`.
- **iOS PWA'da `getUserMedia` kullanma.** Kamera `input capture="environment"` ile açılır.
- **Fiş fotoğrafı kart bilgisi içerebilir.** Sunucuda kalıcı saklama, loglama, service worker önbelleği yok. Örnek fiş görselleri repoya kopyalanmaz.
- **`CLAUDE.md` ve `INSTRUCTIONS.md`'yi değiştirme veya silme.**

## Korunan alanlar

- Sırlar (`.env*`, API anahtarları, Neon bağlantı dizesi) commit edilmez, yazdırılmaz. `.env.example` yalnızca yer tutucu.
- Canlı veritabanına migration uygulama, Vercel'e deploy, `git push`, uzak serviste hesap açma veya giriş: kullanıcının açık onayı olmadan yapılmaz.
- Luca'ya erişim yok. Chrome eklentisi (`extension/`) yalnızca açık Fiş Detayı ekranına satır yazar, Kaydet'e basmaz; Luca seçicileri yalnızca `extension/selectors.js` içinde.
- Testler gerçek veritabanına ve gerçek Anthropic API'sine bağlanmaz.

## Yapay zeka

- **Model görür:** sadece küçültülmüş, EXIF'i silinmiş fiş görüntüsü ve sabit talimat.
- **Asla gönderme:** kullanıcı kimliği, e-posta, diğer fişler, env değerleri.
- **Model yapar:** sadece okuma ve şemaya uygun çıktı. Yazma, hesap kodu seçimi, onay yok.
- **Onay gerektirir:** fişin onaylanması ve Luca'ya aktarım her zaman kullanıcıda.
- **Doğrulama:** `src/lib/extract` mock testleri; gerçek doğruluk için anahtar varsa elle çalıştırılan değerlendirme betiği.
- **Hata durumu:** "Fiş okunamadı" mesajı, alanlar boş, kullanıcı elle doldurur.

## Bitti demek

İstenen davranış tamam, ilgili testler önce yazılmış ve geçiyor, typecheck ve build temiz, UI değişikliği telefonda ve masaüstünde denenmiş, `docs/REVIEW-CHECKLIST.md` geçmiş. Sonuç Türkçe raporlanır: değişen dosyalar, çalışan komutlar, kontrol edilmeyenler.
