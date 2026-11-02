# Ürün gereksinimleri (kısa)

Tam metin ve kabul kriterleri: `docs/PRD.md`.

## Kullanıcı

- Birincil kullanıcı: Luca kullanan muhasebeci.
- Ana sorun: Fişleri Luca'ya satır satır elle girmek yavaş ve hataya açık.

## Olmazsa olmaz

- Fiş çekme: telefonda tek dokunuş, 10 MB ve tür sınırı, art arda çekimler ayrı kayıt.
- Okuma: unvan, VKN, tarih, fiş no, oran bazlı KDV, toplam, ödeme şekli, kategori; okunamayan alan boş ve işaretli.
- Yevmiye: örnek fiş 770.08 B 7.931,82 / 191.03.10 B 793,18 / 331.01 A 8.725,00 üretir; dengesiz fiş onaylanamaz.
- Kontrol ekranı: fotoğraf ve satırlar birlikte, her alan düzenlenebilir, alacak hesabı tek seçimle değişir, toplamlar görünür.
- Luca aktarımı: onaylı fişlerden `.xlsx`, 50 fiş / 400 satırda bölme, Evrak No metin, tek fiş için panoya kopyalama.
- Kurallar: kategori, KDV oranı, ödeme şekli ve BT için düzenlenebilir hesap tablosu.

## İyi olur (MVP sonrası)

- Satıcı (VKN) bazlı öğrenen kategori kuralı.
- Kart son 4 hanesine göre alacak hesabı.
- Chrome eklentisiyle Luca Fiş Detayı ekranını doldurma (Kaydet'e kullanıcı basar).
- Gemini yedek sağlayıcısı.

## Kapsam dışı

- Luca API'si, mobil mağaza uygulaması, fatura, çok firma, döviz, çevrimdışı kuyruk, fotoğraf saklama.

## Başarı ölçütleri

- 20 gerçek fişte toplam ve KDV doğruluğu en az yüzde 95.
- Satır değiştirmeden onay oranı yüzde 80 üstü.
- İlk Excel dosyası Luca'ya hatasız yüklenir.
- Ortalama yapay zeka maliyeti fiş başına 0,002 USD altı.
