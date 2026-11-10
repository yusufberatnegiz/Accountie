// Luca "Fiş Detayı" seçicileri. Eklentide Luca DOM'una dokunan TEK yer burası.
// 2026-11-10'da gerçek Fiş Detayı ekranından salt okunur bakılarak yazıldı (auygs.luca.com.tr, addFisAction.do; ekran frm3
// çerçevesinde, eklenti allFrames ile girer). Satırlar #TBL içinde tr0, tr1... ; her satırın girişleri name ile ayrılır.
// Bir seçici tutmazsa eklenti "Alan bulunamadı" der, hiçbir şeyi tahmin etmez.
globalThis.AccountieSelectors = {
  // Fiş Detayı tablosundaki satırlar, yukarıdan aşağı.
  row: "#TBL tr[id^='tr']",
  // Son satırın "+" düğmesi: yeni boş satırı sona ekler. DOĞRULANMADI: tıklanıp denenmedi (salt okunur bakıldı);
  // Luca satırı başka yere eklerse eklentinin karşılaştırması farkı bulur ve durur.
  addRow: "#TBL tr[id^='tr']:last-of-type td.add_delete input[value='+']",
  // Otomatik kayıt için üçü de gerekir; biri null ise eklenti otomatik kaydetmez, yalnız doldurur.
  save: "#kaydetHref", // Fişi kaydeden düğme (Alt+K)
  // DOĞRULANMADI: kayıttan sonra ne göründüğü gerçek bir kayıtla görülmeden yazılmaz. Tahminle doldurmayın:
  // yanlış bir işaret, kaydı başarılı sanıp sonraki fişe geçmek demektir.
  saved: null,
  newEntry: "#yeniHref", // Boş yeni fiş açan düğme (Alt+Y)
  // Satırın içindeki hücre girişleri (satır öğesine göre).
  cells: {
    accountCode: "input[name='HESAP_KODU']",
    documentNo: "input[name='EVRAK_NO']",
    documentDate: "input[name='EVRAK_TARIHI']",
    documentType: "input[name='BELGE_TUR_KOD']",
    // Satıcının VKN'si, yalnız gider satırında. BA_BS kutusuna dokunulmaz (müşavirin isteği: BaBs işaretlenmez).
    taxNumber: "input[name='VERGI_NO']",
    description: "input[name='ACIKLAMA']",
    debit: "input[name='BORC']",
    credit: "input[name='ALACAK']",
  },
};
