# Build-Facing Product Requirements

## P0

- Admin-created ofis kullanıcıları ve admin/staff rolleri
- Dashboard: bugün, 7 gün, vergi, SGK kartları ve acil uyarı
- Takvim: tablo, arama, tarih/kurum/tür/durum filtreleri, resmî link
- GİB, SGK, Resmî Gazete günlük otomatik taraması
- Admin manuel tarama, source health, pending diff, onay/ret
- Güncel duyuru ve Resmî Gazete akışı
- Kişisel not, hatırlatma, favori ve okundu durumu
- Audit log ve eski yayımlanmış veriyi koruma

## P1

- Uygulama içi bildirim merkezi
- Görsel takvim görünümü
- CSV dışa aktarma
- Kaydedilmiş filtreler
- E-posta özeti

## Yapılmayacaklar

- Luca entegrasyonu
- Muhasebe, fatura, evrak, banka, bordro ve cari hesap
- Beyanname gönderme ve ödeme
- Ürün içi AI
- Çoklu ofis/SaaS
- Mobil uygulama, SMS ve WhatsApp
- Resmî Gazete PDF/OCR ve otomatik hukuki özet

## Kabul sinyalleri

- Yayımlanmış her kayıtta resmî URL ve kontrol zamanı
- Sync tekrarında kopya yok
- Kritik değişiklik admin onayında
- Kaynak hatası görünür; eski veri korunur
- P0 akışları üretimde üç gün içinde çalışır

Tam kabul kriterleri için `docs/PRD-Accountie-MVP.md` dosyasını oku.

