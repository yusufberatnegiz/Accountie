// Luca'dan firma listesi, firma kimliği ve hesap planı OKUR; Luca'ya kayıt yazmaz, hiçbir düğmeye basmaz.
// Adresler 2026-11-10'da gerçek Luca'da salt okunur bakılarak çıkarıldı; firma seçici çerçevesinde (TopFrameAction.do) çalışır.
// Firma değiştirme Luca'nın kendi seçicisinin gittiği adrestir: yalnız oturumdaki açık firmayı değiştirir.
// Saf kısımları src/lib/luca/extension-import.test.ts içinde sınanır.
(function (root) {
  const CODE = /^\d{3}(\.[\p{L}\d]{1,12})*$/u; // src/lib/default-rules.ts ACCOUNT_CODE_PATTERN ile aynı
  const IDENTITY = /Şu an (.+?) (\d\d\/\d\d\/\d{4}) ?- ?(\d\d\/\d\d\/\d{4}) döneminde/;

  // sirketDonem satırı: [0] firma no, [1] kısa ad, 5'ten sonra dörtlüler: dönem no, başlangıç, bitiş, bayrak.
  function periods(row) {
    const out = [];
    for (let i = 5; i + 2 < row.length; i += 4) out.push({ lucaId: String(row[0]), shortName: String(row[1]), donemId: String(row[i]), start: String(row[i + 1]), end: String(row[i + 2]) });
    return out;
  }

  /** Başlangıcı `year` yılında olan dönemi bulunan firmalar; firma başına o dönem. */
  function firmsOfYear(sirketDonem, year) {
    return sirketDonem.flatMap((row) => periods(row).filter((p) => p.start.endsWith(`/${year}`)).slice(-1));
  }

  /** Luca'da şu an seçili firma ve dönem; bulunamazsa null (o zaman hiçbir şeye başlanmaz). */
  function selected(sirketDonem, sirketId, donemId) {
    return sirketDonem.flatMap(periods).find((p) => p.lucaId === String(sirketId) && p.donemId === String(donemId)) ?? null;
  }

  const switchUrl = (f) => encodeURI(`TopFrameAction.do?SIRKET_ID=${f.lucaId}&DONEM_ID=${f.donemId}&DONEM_TXT=${f.start} - ${f.end}&time=${Date.now()}`);

  /** "Şu an <TAM UNVAN> gg/aa/yyyy-gg/aa/yyyy döneminde çalışıyorsunuz! Vergi No: ..." cümlesi. */
  function parseIdentity(text) {
    const flat = text.replace(/\s+/g, " ");
    const m = IDENTITY.exec(flat);
    if (!m) return null;
    return { name: m[1].trim(), start: m[2], end: m[3], taxNumber: /Vergi No ?: ?(\d{10,11})(?!\d)/.exec(flat)?.[1] ?? null };
  }

  /** Hesap planı tablosu: ilk hücre kod, ikinci hücre ad. */
  function parsePlan(doc) {
    const seen = new Set();
    const accounts = [];
    for (const tr of doc.querySelectorAll("tr")) {
      const [code, name] = [...tr.children].map((td) => td.textContent.trim());
      if (name === undefined || !CODE.test(code) || seen.has(code)) continue;
      seen.add(code);
      accounts.push({ code, name });
    }
    return accounts;
  }

  async function page(path) {
    const res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) throw new Error(`Luca yanıt vermedi (${res.status}).`);
    const bytes = await res.arrayBuffer();
    // Luca sayfaları çoğunlukla windows-1254; başlık ya da meta ne diyorsa o.
    const named = /charset=["']?([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1] ?? /charset=["']?([\w-]+)/i.exec(new TextDecoder("latin1").decode(bytes.slice(0, 2048)))?.[1];
    let text;
    try { text = new TextDecoder(named ?? "windows-1254").decode(bytes); } catch { text = new TextDecoder("windows-1254").decode(bytes); }
    return new DOMParser().parseFromString(text, "text/html");
  }

  /** Oturumu firmaya çevirir, kimliğini ve hesap planını okur. Dönem tutmazsa durur: yanlış firmanın planı alınmaz. */
  async function readFirm(f) {
    await page(switchUrl(f));
    const identity = parseIdentity((await page(`musteriBilgileri.do?time=${Date.now()}`)).body?.textContent ?? "");
    if (!identity) throw new Error("Firma bilgisi okunamadı.");
    if (identity.start !== f.start || identity.end !== f.end) throw new Error("Luca bu firmaya geçmedi.");
    const accounts = parsePlan(await page(`listAltHesapTempAction.do?time=${Date.now()}`));
    if (accounts.length === 0) throw new Error("Hesap planı okunamadı.");
    return { lucaId: f.lucaId, name: identity.name, taxNumber: identity.taxNumber, accounts };
  }

  root.AccountieLuca = { firmsOfYear, selected, switchUrl, parseIdentity, parsePlan, readFirm };
})(globalThis);
