// Luca "Fiş Detayı" seçicileri. Eklentide Luca DOM'una dokunan TEK yer burası.
// DOĞRULANMADI: Luca'ya erişim olmadan yazıldı. Gerçek ekranda DevTools ile bakıp güncelleyin
// (README, "Chrome eklentisi" bölümü). Bir seçici tutmazsa eklenti "Alan bulunamadı" der, hiçbir şeyi tahmin etmez.
globalThis.AccountieSelectors = {
  // Fiş Detayı tablosundaki düzenlenebilir veri satırları, yukarıdan aşağı.
  row: "table.fisDetay tbody tr",
  // Yeni boş satır açan düğme. Yoksa null. Metninde "Kaydet" geçen bir düğmeye eklenti asla basmaz.
  addRow: null,
  // Otomatik kayıt için üçü de gerekir; biri null ise eklenti otomatik kaydetmez, yalnız doldurur.
  // DOĞRULANMADI: Luca'nın gerçek Fiş Detayı ekranında bakılıp yazılacak. Tahminle doldurmayın:
  // yanlış düğmeye basan bir seçici yasal deftere kontrolsüz kayıt demektir.
  save: null, // Fişi kaydeden düğme
  saved: null, // Kayıt başarılı olunca beliren öğe (ör. "Fiş kaydedildi" bildirimi)
  newEntry: null, // Boş yeni fiş açan düğme
  // Satırın içindeki hücre girişleri (satır öğesine göre).
  cells: {
    accountCode: "input[name*='hesapKodu' i]",
    documentNo: "input[name*='evrakNo' i]",
    documentDate: "input[name*='evrakTarih' i]",
    documentType: "input[name*='belgeTur' i], select[name*='belgeTur' i]",
    description: "input[name*='aciklama' i]",
    debit: "input[name*='borc' i]",
    credit: "input[name*='alacak' i]",
  },
};
