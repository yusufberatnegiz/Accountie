// Fişler yazılmadan önce Luca'da açık firmanın fişlerin firması olduğunu denetler. Saf; src/lib/luca/extension-firm-check.test.ts sınar.
// Luca kaydı oturumdaki firmaya yazar: ekrandaki firma seçici de, oturum da (musteriBilgileri.do) fişin firması olmalı.
(function (root) {
  /**
   * `list`: yazılacak fişler ({ firm, firmLucaId, firmTaxNumber }). `screen`: ekrandaki seçicinin firma numarası (SIRKET_ID) ya da null.
   * `session`: oturumun firma numarası ve VKN'si ({ sirket, taxNumber }) ya da okunamadıysa null. Sorun yoksa null, varsa Türkçe neden.
   */
  function firmProblem(list, screen, session) {
    const unlinked = list.find((r) => !r.firmLucaId);
    if (unlinked) return `${unlinked.firm || "Bu"} firması Luca'dan çekilmemiş. Luca'da firmayı açıp eklentide “Luca'dan firmaları çek” ile “Yeni firmaları çek”e basın.`;
    if (!screen) return "Luca'da açık firma okunamadı. Luca'nın ana ekranını yenileyip eklentiyi yeniden açın.";
    const other = list.find((r) => r.firmLucaId !== screen);
    if (other) return `Luca'da açık firma bu fişlerin firması değil. Luca'da ${other.firm} firmasını seçin, eklentiyi yeniden açıp yazın.`;
    if (!session) return "Luca oturumundaki firma okunamadı. Luca sayfasını yenileyip yeniden deneyin.";
    // Luca's session number when its page gives it; otherwise the VKN Luca shows for the session's firm.
    if (session.sirket) return session.sirket === screen ? null : "Luca'da ekrandaki firma ile oturumdaki firma farklı (başka bir sekmede firma değişmiş olabilir). Luca sayfasını yenileyip yeniden deneyin.";
    const vkn = session.taxNumber;
    if (vkn && list.every((r) => r.firmTaxNumber === vkn)) return null;
    return "Luca oturumundaki firma doğrulanamadı (firma numarası okunamadı, vergi numarası tutmuyor ya da yok). Luca sayfasını yenileyip yeniden deneyin.";
  }

  root.AccountieFirmCheck = { firmProblem };
})(globalThis);
