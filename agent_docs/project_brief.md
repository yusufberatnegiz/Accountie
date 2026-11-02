# Proje özeti

## Ürün

- Tek cümle: Telefonla çekilen yazar kasa fişini okuyup Luca için dengeli yevmiye kaydı hazırlar, onaydan sonra Luca'nın Excel aktarım dosyasını üretir.
- Hedef kullanıcı: Luca web sürümünü kullanan muhasebeci.
- Ana sonuç: Fiş başına iş, bir kontrol ve bir onaya iner.

## Kapsam

- MVP'de var:
  - Telefonda fiş çekme (PWA, `input capture`).
  - Vision LLM ile okuma (Claude Haiku 5.5, gerekirse Sonnet 5.5).
  - Kural tablosuyla yevmiye satırları (gider, 191 KDV, alacak).
  - Tek ekranda kontrol, düzeltme, onay.
  - Luca Excel veri aktarımı `.xlsx` ve panoya kopyalama.
  - Düzenlenebilir hesap kuralları.
- MVP'de yok:
  - Luca'ya doğrudan yazma (API yok, eklenti sonra).
  - Mobil mağaza uygulaması.
  - Fatura ve diğer belge türleri, çok firma, döviz.
  - Fotoğrafın sunucuda saklanması.

## İlkeler

- Muhasebe doğruluğu her şeyden önce: kuruş tam sayı, borç = alacak, fişteki KDV esas.
- Belirsiz olan uydurulmaz: okunamayan alan boş ve işaretli kalır.
- Muhasebecinin dili ve Luca'nın terimleri kullanılır (Hesap Kodu, Evrak No, BT, Borç, Alacak).
- Sıkıcı ve bakımı kolay seçimler; mevcut Vercel + Neon altyapısı.

## Yapay zekanın yeri

- Kullanılır: fiş görüntüsünden alan çıkarma ve kategori önerisi.
- Kullanılmaz: hesap kodu seçimi, tutar hesabı, vergi kararı, onay.
- İnsan onayı gerekir: her fişin onaylanması ve Luca'ya yükleme.
