# Fiş okuma modeli seçimi

Tarih: 2026-11-03
Durum: Karar verildi (MVP için)

## Karar

**Ana model: Claude Haiku 5.5 (`claude-haiku-5-5`)**, resmi TypeScript SDK `@anthropic-ai/sdk` ile, structured outputs (`client.messages.parse` + `zodOutputFormat`) kullanılarak. Anahtar yalnızca Vercel sunucu env'inde: `ANTHROPIC_API_KEY`.

**Tahmini maliyet: fiş başına yaklaşık 0,0005 USD (1000 fiş için yaklaşık 0,50 USD).**

**Yükseltme modeli (yedek): Claude Sonnet 5.5 (`claude-sonnet-5-5`)**, aynı SDK ve aynı kodla. Sadece Haiku'nun sonucu sunucudaki aritmetik kontrolden geçmezse (aşağıda) o fiş için bir kez çağrılır. Fiş başına yaklaşık 0,01 USD, ama fişlerin küçük bir kısmına uygulanır.

**Sağlayıcı kesintisi için alternatif (şimdilik kodlanmayacak):** Google Gemini 3.1 Flash-Lite (`@google/genai`, `GEMINI_API_KEY`), fiş başına yaklaşık 0,001 USD. Anthropic tarafında uzun süreli kesinti yaşanırsa eklenir.

## Neden Claude Haiku 5.5

1. **En ucuz güncel nesil model.** 0,10 USD / 0,50 USD (1M giriş / çıkış token, 100K altı istem). Aynı fiş Gemini 3.1 Flash-Lite'ta yaklaşık 2 kat, OpenAI gpt-5.4-nano'da yaklaşık 2,5 kat, OCR servislerinde (Document AI, Azure) yaklaşık 20 kat pahalı.
2. **Yüksek çözünürlük katmanı.** Claude 4.7 ve sonrası modeller görüntüyü uzun kenarda 2.576 px'e kadar küçültmeden işler (eski modellerde sınır 1.568 px ve 1.568 token). Buruşuk termal fişteki küçük punto (VKN, KDV satırı, Z/EKÜ no) için önemli.
3. **Şemaya garantili çıktı.** Structured outputs (`output_config.format`) yanıtı JSON şemaya kısıtlar; `messages.parse` Zod şemasıyla doğrular. Ayrıştırma hatası ve eksik alan riski ortadan kalkar.
4. **Tek sağlayıcı, tek SDK, kolay yükseltme.** Sonuç şüpheliyse aynı istek sadece `model` değiştirilerek Sonnet 5.5'e gönderilir. İkinci sağlayıcı entegrasyonu, ikinci anahtar, ikinci veri işleme sözleşmesi gerekmez.
5. **Tutarlılık mimariden gelir, modelden değil.** Haiku 5.5'te `temperature` gönderilemez (400 döner). Tutarlılığı şunlar sağlar: sabit şema, kısa ve net talimat, modelin sadece fişte yazanı çıkarması, tüm hesaplamanın (matrah, borç/alacak) sunucuda kuruş cinsinden kodla yapılması ve aritmetik kontrol.

## Token ve maliyet hesabı

### Varsayımlar

- Görüntü: telefon fotoğrafı istemcide uzun kenar 1.600 px'e küçültülmüş, dikey fiş, **1200 x 1600 px**. (Karşılaştırma için 1000 x 1500 px de verildi.)
- İstem (sistem talimatı + şema): yaklaşık **700 token**.
- Çıktı: JSON, yaklaşık **350 token** (satıcı, VKN, tarih, saat, fiş no, 1 ila 3 KDV oranı satırı, toplam, ödeme şekli, Z/EKÜ no).
- Düşünme (thinking) kapalı veya düşük. Haiku 5.5'te `thinking: {type: "disabled"}` effort `high` ve altında kabul edilir. Açık bırakılırsa çıktıya birkaç yüz token eklenir (tabloda ayrıca gösterildi).
- Fiyatlar 2026-11-03 tarihli resmi sayfalardan; USD.

### Görüntü token'ı

| Sağlayıcı | Kural | 1200 x 1600 | 1000 x 1500 |
|---|---|---|---|
| Claude 4.7+ (Haiku 5.5, Sonnet 5.5) | `ceil(w/28) x ceil(h/28)`, en fazla 4.784 | 43 x 58 = **2.494** | 36 x 54 = **1.944** |
| Claude Haiku 4.5 (standart katman) | aynı kural, en fazla 1.568 (küçültülür) | **1.568** | **1.568** |
| Gemini 3.x | `media_resolution` sabit: low 280, medium 560, high 1.120 (varsayılan) | **1.120** | **1.120** |
| Gemini 2.5 Flash-Lite | 768 px karo başına 258 | yaklaşık **1.550** (tahmin) | yaklaşık **1.550** (tahmin) |
| OpenAI gpt-5 mini/nano | 32 px yama, en fazla 1.536 yama, model çarpanı (mini 1,62, nano 2,46) | mini yaklaşık **2.500**, nano yaklaşık **3.800** (tahmin) | benzer |

OpenAI ve Gemini 2.5 satırları dokümandaki genel kurala göre tahmindir; gerçek değer `usage` alanından ölçülmelidir.

### Fiş başına ve 1000 fiş başına maliyet (1200 x 1600 görüntü)

| Model | Giriş / çıkış USD/1M | Giriş token | Çıkış token | Fiş başına USD | 1000 fiş USD | Not |
|---|---|---|---|---|---|---|
| **Claude Haiku 5.5** | 0,10 / 0,50 | 3.200 | 350 | **0,0005** | **0,50** | Seçilen. Thinking low açıkken yaklaşık 0,0008 |
| Claude Haiku 4.5 | 1,00 / 5,00 | 2.300 | 350 | 0,0041 | 4,05 | Eski nesil, 8 kat pahalı, düşük çözünürlük |
| Claude Sonnet 5.5 | 2,00 / 10,00 | 3.200 | 350 | 0,0099 | 9,90 | Sadece yükseltme için |
| Gemini 3.1 Flash-Lite | 0,25 / 1,50 | 1.820 | 350 | 0,0010 | 0,98 | Yedek aday |
| Gemini 3.5 Flash-Lite | 0,30 / 2,50 | 1.820 | 350 | 0,0014 | 1,42 | |
| Gemini 2.5 Flash-Lite | 0,10 / 0,40 | 2.250 | 350 | 0,0004 | 0,37 | En ucuz ama eski nesil; 2.5 Flash kullanımdan kaldırıldı, Lite'ın da kaldırılma riski var |
| Gemini 3.8 Flash | 0,75 / 3,75 (1 Ocak 2027'den itibaren 1,50 / 7,50) | 1.820 | 350 | 0,0027 (sonra 0,0054) | 2,68 (sonra 5,36) | |
| OpenAI gpt-5-nano | 0,05 / 0,40 | yaklaşık 4.500 | 350+ akıl yürütme | yaklaşık 0,0004 | yaklaşık 0,40 | Eski nesil; küçük puntoda zayıf, akıl yürütme token'ı değişken |
| OpenAI gpt-5.4-nano | 0,20 / 1,25 | yaklaşık 4.500 | 350+ | yaklaşık 0,0013 | yaklaşık 1,34 | |
| OpenAI gpt-5-mini | 0,25 / 2,00 | yaklaşık 3.200 | 350+ | yaklaşık 0,0015 | yaklaşık 1,50 | |
| OpenAI gpt-5.4-mini | 0,75 / 4,50 | yaklaşık 3.200 | 350+ | yaklaşık 0,0040 | yaklaşık 4,00 | |
| Google Document AI Expense parser | 10 USD / 1000 sayfa | | | 0,0100 | 10,00 | Ayrıca GCP hesabı; Türk fişine özel alan yok |
| Azure Document Intelligence (prebuilt receipt) | yaklaşık 10 USD / 1000 sayfa | | | yaklaşık 0,0100 | yaklaşık 10,00 | Ayrıca Azure hesabı; fiyat ikincil kaynaktan |

Hesap örneği (Haiku 5.5): 3.200 x 0,10 / 1.000.000 = 0,00032 USD giriş; 350 x 0,50 / 1.000.000 = 0,000175 USD çıkış; toplam yaklaşık 0,0005 USD. Yükseltme oranı yüzde 5 olursa ortalama fiş maliyeti yaklaşık 0,0005 + 0,05 x 0,0099 = **0,001 USD** olur.

### OCR servisleri neden seçilmedi

Document AI ve Azure receipt modelleri yaklaşık 20 kat pahalı, ek bulut hesabı ve ayrı kimlik bilgisi ister. Genel "receipt" alanları (satıcı, toplam, tarih) döner; VKN, vergi dairesi, oran bazında KDV kırılımı, Z No, EKÜ No gibi Türk ÖKC fişi alanları için yine LLM ile ikinci bir adım gerekir. Maliyet de iş de ikiye katlanır.

## Uygulama notları (bir sonraki adım için)

- **Çağrı:** `client.messages.parse({ model: "claude-haiku-5-5", max_tokens: 2048, thinking: { type: "disabled" }, output_config: { effort: "low", format: zodOutputFormat(ReceiptSchema) }, system, messages: [{ role: "user", content: [image (base64 JPEG), text] }] })`. `temperature`, `top_p`, prefill göndermeyin (400 döner).
- **Thinking ayarı ölçülerek seçilsin:** 10 ila 20 gerçek fişlik küçük bir set üzerinde `disabled` ile `adaptive` + `effort: "low"` karşılaştırılsın; doğruluk aynıysa `disabled` kalsın.
- **Şema tutarlar için metin değil tamsayı kuruş istemesin;** model fişte yazanı ("8.725,00") string olarak döndürsün, sunucu Türkçe sayı biçimini kuruşa (`872500`) kendisi çevirsin. Böylece ondalık/binlik ayırıcı karışıklığı kodda, test edilebilir yerde çözülür. Alanlar: `vendorName`, `taxOffice`, `taxNumber` (VKN 10 hane / TCKN 11 hane), `date`, `time`, `receiptNo`, `zNo`, `ekuNo`, `vatLines[] { rate, base?, vat }`, `total`, `paymentMethod` (enum: `nakit`, `kredi_karti`, `diger`), `category` (enum: yemek, akaryakıt, kırtasiye vb.), `unreadableFields[]`.
- **Aritmetik kontrol (sunucu, kuruş ile):** KDV satırları toplamı ile `total` tutarlı mı; her oran için `vat` yaklaşık `total_oran x rate / (100 + rate)` (1 kuruş tolerans); VKN 10 haneli ve kontrol hanesi geçerli mi; tarih geçerli mi. Kontrol geçmezse aynı istek bir kez `claude-sonnet-5-5` ile tekrarlanır; o da geçmezse kullanıcı ekranında ilgili alan işaretlenir. Matrah ve yevmiye satırları her zaman kodla hesaplanır, modelden alınmaz.
- **Ret durumu:** Haiku 5.5'in güvenlik sınıflandırıcıları için sunucu taraflı `fallbacks` desteği yok. `stop_reason === "refusal"` kontrol edilip Sonnet 5.5 ile yeniden denenir. Fiş okumada beklenmez ama kod yolu olmalı.
- **Hata yönetimi:** SDK'nın tipli hataları (`Anthropic.RateLimitError`, `Anthropic.APIError` vb.) yakalanır; 429/5xx için SDK zaten 2 kez yeniden dener. Kullanıcıya iç hata metni gösterilmez.
- **Gizlilik:** Fiş fotoğrafında kartın son haneleri olabilir. Görüntü sunucuda işlendikten sonra kalıcı saklanacaksa özel (public olmayan) depoda tutulmalı. Anthropic API verisi varsayılan olarak model eğitiminde kullanılmaz; yine de KVKK aydınlatma metninde yurt dışı hizmet sağlayıcı belirtilmeli.

## Maliyeti düşürme önerileri

1. **İstemcide küçült (zaten platform kararında var):** uzun kenar 1.600 px, JPEG kalite 0,8. Yükleme 3 ila 5 MB yerine 200 ila 400 KB olur.
2. **Sunucuda `sharp` ile normalize et:** `sharp(buf).rotate().resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()`. `rotate()` EXIF yönünü uygular, çıktı varsayılan olarak EXIF/GPS meta verisini atar (gizlilik). İstemciye güvenmeden boyut sınırı burada kesinleşir. 1.568 px uzun kenar ile 1200 x 1600 fiş yaklaşık 1176 x 1568 olur: 42 x 56 = 2.352 token.
3. **Gerekirse daha da küçült:** uzun kenar 1.200 px ile (900 x 1200) 33 x 43 = 1.419 token, fiş başına yaklaşık 0,0003 USD. Ancak küçük puntoda okuma kalitesi düşebilir; önce küçük fiş setiyle denenmeli. Varsayılan 1.568 px kalsın.
4. **Gri tonlama token'ı azaltmaz** (Claude yama sayısıyla ücretlendirir), sadece dosya boyutunu azaltır. Kenar kırpma (fiş dışındaki masa/arka plan) token'ı orantılı azaltır; MVP'de gerek yok.
5. **Tek görüntü, tek istek.** Aynı fiş için tekrar deneme yalnızca kontrol başarısız olunca ve tek sefer.
6. **İstemi kısa tut.** Şema açıklamaları kısa olsun; uzun örnek fişler eklemeyin. Prompt caching bu boyutta (yaklaşık 700 token) minimum önbellek eşiğinin altında kalabilir; önemli kazanç beklenmez.
7. **Batch API (yüzde 50 indirim) kullanılmaz:** kullanıcı sonucu çekimden hemen sonra görmek istiyor; batch yanıtı dakikalar/saatler sürebilir.
8. **Maliyeti ölç:** her çağrının `usage.input_tokens` / `usage.output_tokens` değerini `receipts` kaydına yazmak, tahminin gerçekle karşılaştırılmasını sağlar.

## Riskler ve doğrulanmamış noktalar

- Türkçe termal fiş doğruluğu bu çalışmada gerçek API çağrısıyla **ölçülmedi** (anahtar yok). Seçim fiyat, çözünürlük katmanı ve structured outputs desteğine dayanıyor. İlk anahtar geldiğinde 10 ila 20 fişlik bir setle Haiku 5.5, Sonnet 5.5 ve Gemini 3.1 Flash-Lite karşılaştırılmalı; Haiku tutarsızsa ana model Gemini 3.1 Flash-Lite'a veya her fiş için Sonnet 5.5'e geçilir (maliyet yine fiş başına 0,01 USD altında).
- OpenAI ve Gemini 2.5 görüntü token sayıları tahmindir.
- Azure fiyatı resmi sayfadan okunamadı, ikincil kaynaktan alındı.
- Gemini 3.x Flash fiyatları 1 Ocak 2027'de iki katına çıkıyor; tablo bugünkü fiyatı gösterir.

## Kaynaklar

- Claude fiyatları: https://claude.com/pricing
- Claude vision, görüntü token hesabı ve çözünürlük katmanları: https://platform.claude.com/docs/en/build-with-claude/vision
- Gemini API fiyatları: https://aistudio.google.com/docs/pricing
- Gemini görüntü çözünürlüğü (media_resolution): https://aistudio.google.com/docs/media-resolution
- OpenAI API fiyatları: https://developers.openai.com/api/docs/pricing
- Google Document AI fiyatları: https://cloud.google.com/document-ai/pricing
- Azure Document Intelligence fiyatları: https://azure.microsoft.com/tr-tr/pricing/details/document-intelligence/ ve https://learn.microsoft.com/en-in/answers/questions/5927427/azure-document-intelligence-pricing
