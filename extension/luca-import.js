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

  const dayOf = (ddmmyyyy) => ddmmyyyy.split("/").reverse().join("");

  /**
   * Her firma, firma başına bir dönemle: başlangıcı `year` yılında olan dönem, yoksa en son dönemi. Hesap planı firmanındır;
   * bu yılın dönemi henüz açılmamış firma da böylece atlanmaz. Son dönemi geçen yıldan önce bitmiş (kapanmış) firma alınmaz.
   */
  function firmsToImport(sirketDonem, year) {
    return sirketDonem.flatMap((row) => {
      const all = periods(row);
      const thisYear = all.filter((p) => p.start.endsWith(`/${year}`)).slice(-1);
      if (thisYear.length) return thisYear;
      const latest = all.reduce((best, p) => (!best || dayOf(p.end) > dayOf(best.end) ? p : best), null);
      // A firm whose last period ended before last year is closed: not brought in.
      return latest && dayOf(latest.end) >= `${Number(year) - 1}0101` ? [latest] : [];
    });
  }

  /** Bu yıl aktif firmalar: başlangıcı `year` yılında olan bir dönemi olanlar (e-Tebligat taraması yalnız bunları tarar). */
  function activeIds(sirketDonem, year) {
    return new Set(sirketDonem.flatMap(periods).filter((p) => p.start.endsWith(`/${year}`)).map((p) => p.lucaId));
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
    const res = await fetch(path, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(30_000) }).catch((e) => {
      throw new Error(e?.name === "TimeoutError" ? "Luca yanıt vermedi (30 sn zaman aşımı)." : "Luca yanıt vermedi (bağlantı).");
    });
    if (!res.ok) throw new Error(`Luca yanıt vermedi (${res.status}).`);
    const bytes = await res.arrayBuffer();
    // Luca sayfaları çoğunlukla windows-1254; başlık ya da meta ne diyorsa o.
    const named = /charset=["']?([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1] ?? /charset=["']?([\w-]+)/i.exec(new TextDecoder("latin1").decode(bytes.slice(0, 2048)))?.[1];
    let text;
    try { text = new TextDecoder(named ?? "windows-1254").decode(bytes); } catch { text = new TextDecoder("windows-1254").decode(bytes); }
    return new DOMParser().parseFromString(text, "text/html");
  }

  /** Luca sayfalarındaki __SESSION nesnesinin firma ve dönem numarası; bulunamazsa null (o zaman yalnız dönem tarihine bakılır). */
  function sessionIds(html) {
    // Yalnız __SESSION nesnesinin başladığı yerden sonrası: sayfadaki başka bir SIRKET_ID (bir form alanı) yanlış alarm vermesin.
    const at = html.search(/__SESSION\s*=\s*\{/);
    if (at < 0) return { sirket: null, donem: null };
    const block = html.slice(at, at + 3000);
    // Tam anahtar: "ANA_SIRKET_ID" ya da "ONCEKI_DONEM_ID" sayılmaz.
    const key = (name) => new RegExp(`(?:^|[^A-Za-z_])["']?${name}["']?\\s*:\\s*["']?(\\d+)`).exec(block)?.[1] ?? null;
    return { sirket: key("SIRKET_ID"), donem: key("DONEM_ID") };
  }

  /** Geçiş yapmadan şu an açık firmanın kimliği ve oturum numaraları: numara kontrolüne güvenilip güvenilemeyeceğini sınamak için. */
  async function probe() {
    const info = await page(`musteriBilgileri.do?time=${Date.now()}`);
    return { identity: parseIdentity(info.body?.textContent ?? ""), ids: sessionIds(info.documentElement?.innerHTML ?? "") };
  }

  /**
   * Oturumu firmaya çevirir ve gerçekten o firmaya ve döneme geçtiğini doğrular. Luca geçişi bazen geç yansıtır: bir kez daha dener.
   * `verifyIds`: Luca'nın oturum numaraları firma listesindekilerle aynı (ön sınamada görüldü); öyleyse onlar da tutmalı.
   */
  async function switchTo(f, verifyIds = false, avoid = "") {
    let identity = null, ids = null, reply = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500));
      const sw = await page(switchUrl(f));
      // Luca'nın geçiş yanıtındaki uyarı ya da hata metni: geçmezse nedeni budur.
      reply = sw.getElementById("SirketCombo") ? ""
        : /alert\(["']([^"']{1,150})/.exec(sw.documentElement?.innerHTML ?? "")?.[1] || (sw.body?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 150);
      const info = await page(`musteriBilgileri.do?time=${Date.now()}`);
      identity = parseIdentity(info.body?.textContent ?? "");
      ids = sessionIds(info.documentElement?.innerHTML ?? "");
      // Aynı dönem tarihli başka bir firmada kalınmışsa yalnız tarih tutar; Luca firma numarasını veriyorsa o da tutmalı.
      const sameFirm = !verifyIds || ((!ids.sirket || ids.sirket === String(f.lucaId)) && (!ids.donem || ids.donem === String(f.donemId)));
      // `avoid`: the firm read just before. Same dates and still that firm means Luca has not shown the switch yet: tried again.
      const stale = !!avoid && !!identity && `${identity.taxNumber}|${identity.name}` === avoid;
      // Luca's "Şu an ... döneminde" line may start the period on another day of the same year than the firm list does (seen:
      // list 06/01/2026, line 01/01/2026, same firm). Then the session's own firm and period numbers prove the switch.
      const sameDates = !!identity && identity.start === f.start && identity.end === f.end;
      const proven = verifyIds && !!identity && ids.sirket === String(f.lucaId) && (!ids.donem || ids.donem === String(f.donemId))
        && identity.end === f.end && identity.start.slice(-4) === f.start.slice(-4);
      if ((sameDates || proven) && sameFirm && !stale) return { ok: true, identity, verified: verifyIds && !!ids.sirket };
    }
    return { ok: false, identity, ids, reply };
  }

  /**
   * Oturumu firmaya çevirir, kimliğini ve hesap planını okur. Geçiş doğrulanmazsa durur, yanlış firmanın planı alınmaz.
   */
  async function readFirm(f, verifyIds = false, avoid = "") {
    const sw = await switchTo(f, verifyIds, avoid);
    const identity = sw.identity;
    if (!identity) throw new Error("Luca firma bilgisini vermedi; Luca oturumu kapanmış olabilir. İki kez denendi.");
    // Both sides in the message: whether Luca stayed on another firm or opened this firm with other dates tells the cause.
    if (!sw.ok) throw new Error(`Luca bu firmaya geçmedi. İstenen: ${f.shortName} (no ${f.lucaId}) ${f.start} - ${f.end}. Luca'nın açık gösterdiği: ${identity.name}${sw.ids?.sirket ? ` (no ${sw.ids.sirket})` : ""} ${identity.start} - ${identity.end}.${sw.reply ? ` Luca'nın yanıtı: ${sw.reply}` : ""}`);
    // From here Luca is on this firm: an error says so (identity), so the next firm is compared with this one, not the one before.
    const onFirm = (e) => Object.assign(e, { identity: { taxNumber: identity.taxNumber, name: identity.name } });
    const accounts = parsePlan(await page(`listAltHesapTempAction.do?time=${Date.now()}`).catch((e) => { throw onFirm(e); }));
    if (accounts.length === 0) throw onFirm(new Error("Luca'da bu firmanın hesap planı boş. Luca'da plan tanımlanınca yeniden çekin."));
    return { lucaId: f.lucaId, name: identity.name, taxNumber: identity.taxNumber, accounts, verified: sw.verified };
  }

  /** İlk firmaya döner, doğrular ve firma seçici çerçevesini o firmayla yeniler. Dönüş doğrulanamazsa false. */
  /** `home`: the first firm's VKN and title as read before the run; the way back must show them, not only its period dates. */
  async function switchBack(o, verifyIds = false, home = null) {
    const sw = await switchTo(o, verifyIds).catch(() => ({ ok: false }));
    location.href = switchUrl(o);
    const same = !home || (sw.identity?.taxNumber === home.taxNumber && sw.identity?.name === home.name);
    return !!sw.ok && same;
  }

  root.AccountieLuca = { firmsToImport, activeIds, selected, switchUrl, parseIdentity, parsePlan, sessionIds, probe, readFirm, switchBack };
})(globalThis);
