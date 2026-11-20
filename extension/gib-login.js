// e-Tebligat taraması (tebligat.js) için: Luca'nın GİB Şirket ekranındaki giriş bilgilerini okur, Dijital Vergi Dairesi giriş
// formuna kullanıcı kodu ve şifreyi yazar. Doğrulama kodunu (captcha) hiçbir zaman okumaz, yazmaz, çözmez ve Giriş Yap'a basmaz:
// kutuya imleci koyar, kodu kullanıcı yazar. Girişler firma çekilirken Luca'dan bir kez okunup Accountie'de şifreli saklanır
// (import.js); taramada firma firma, yalnız kullanıcının onayıyla açılır. Eklentide hiçbir yere kaydedilmez.
// src/lib/luca/extension-gib-login.test.ts sınar.
(function (root) {
  const LUCA_PAGE = "/Luca/editGibSirketGirisAction.do";
  const GIB_ORIGIN = "https://dijital.gib.gov.tr";
  // A filled form left behind (the scan page closed, the computer left) is emptied after this; longer than a firm's wait.
  const CLEAR_AFTER_MS = 6 * 60_000;
  const LOGIN_PATH = "/portal/login";
  const SKIP_KEY = "accountie-skip";
  const STOP_KEY = "accountie-stop";
  const ID = /^\d{10,11}$/;

  /**
   * Luca'nın GİB Şirket ekranındaki satırlar (Ser.Mes.Defteri → Beyannameler → Toplu Beyanname → GİB Şirket): her satırda
   * KULLANICI_ADI_<firma no>, SIFRE_<firma no>. Sayfa dünyasında çalışır; yalnız bu ekranda bir şey döner.
   */
  function lucaRows(doc = root.document, path = root.location?.pathname) {
    if (!path?.startsWith(LUCA_PAGE)) return null;
    return Array.from(doc.querySelectorAll("input[id^='SIFRE_']"), (pass) => {
      const lucaId = pass.id.slice("SIFRE_".length);
      const tr = pass.closest("tr");
      return { lucaId, name: (tr?.cells?.[1]?.textContent ?? "").trim(), user: doc.getElementById(`KULLANICI_ADI_${lucaId}`)?.value ?? "", pass: pass.value ?? "" };
    });
  }

  /**
   * Firma çekme sırasında (import.js): GİB Şirket ekranını açmadan, Luca oturumundan sayfasını okur. Luca sayfaları çoğunlukla
   * windows-1254. Satırlar yalnız Accountie'ye, şifrelenip saklanmak üzere gider; eklentide saklanmaz.
   */
  async function fetchLucaRows(fetcher = root.fetch) {
    const res = await fetcher(LUCA_PAGE, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const named = /charset=["']?([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1];
    let text;
    try { text = new TextDecoder(named ?? "windows-1254").decode(bytes); } catch { text = new TextDecoder("windows-1254").decode(bytes); }
    return lucaRows(new root.DOMParser().parseFromString(text, "text/html"), LUCA_PAGE);
  }

  /**
   * Taranacak firmalar: Luca'da kullanıcı kodu ve şifresi dolu, Accountie'de VKN'si bilinen. Bugün taranmışlar ve bugün girişi
   * olmamışlar atlanır (yarıda kalan tarama baştan başlamaz; eski bir şifre aynı gün yeniden yazılıp hesabı kilitlemez). Aynı
   * firma ya da aynı VKN iki kez sorulmaz. Şifresi eksik ya da Accountie'de olmayanlar adlarıyla sayılır.
   */
  function plan(rows, firms, doneToday = [], failedToday = []) {
    const tax = new Map(firms.filter((f) => ID.test(String(f.taxNumber))).map((f) => [String(f.lucaId), String(f.taxNumber)]));
    const out = { todo: [], noCredentials: [], notInAccountie: [], sameTax: [], done: 0, failed: 0 };
    const seen = new Set(), seenTax = new Set();
    for (const r of rows) {
      if (!/^\d{1,12}$/.test(r.lucaId) || seen.has(r.lucaId)) continue;
      seen.add(r.lucaId);
      if (!tax.has(r.lucaId)) { out.notInAccountie.push(r.name || r.lucaId); continue; }
      const taxNumber = tax.get(r.lucaId);
      // One login per VKN: Accountie keeps one firm per number, a second login would only read the same list again.
      if (seenTax.has(taxNumber)) { out.sameTax.push(r.name || r.lucaId); continue; }
      seenTax.add(taxNumber);
      if (!r.stored && (!r.user.trim() || !r.pass)) { out.noCredentials.push(r.name || r.lucaId); continue; }
      if (doneToday.includes(r.lucaId)) { out.done++; continue; }
      if (failedToday.includes(r.lucaId)) { out.failed++; continue; }
      // A stored login (sealed in Accountie) is asked for just before its form; a row read from Luca carries its own.
      out.todo.push(r.stored ? { lucaId: r.lucaId, name: r.name || r.lucaId, stored: true, taxNumber } : { lucaId: r.lucaId, name: r.name || r.lucaId, user: r.user.trim(), pass: r.pass, taxNumber });
    }
    return out;
  }

  /**
   * GİB sekmesinde: önceki firmanın oturum anahtarını siler ve giriş sayfasını baştan yükler. Tam yükleme yolda kalan eski bir
   * girişi de, formda kalan şifreyi ve notu da siler.
   */
  function goToLogin(storage = root.sessionStorage, loc = root.location) {
    // A stop pressed on the note while the list was being read is passed on, not wiped with the old page.
    const stop = !!storage.getItem(STOP_KEY);
    for (const k of ["token", SKIP_KEY, STOP_KEY]) storage.removeItem(k);
    // Marks this page as the old one: until the new one loads, loginReady must not take it for the fresh form.
    root.accountieLeaving = true;
    loc.replace(LOGIN_PATH);
    return { stop };
  }

  /** Giriş formu açık ve oturum boş mu (goToLogin'den sonra yeni sayfa geldi mi). */
  function loginReady(doc = root.document, storage = root.sessionStorage, loc = root.location) {
    return !root.accountieLeaving && loc.pathname === LOGIN_PATH && !storage.getItem("token") && !!doc.getElementById("userid") && !!doc.getElementById("sifre") && !!doc.getElementById("dk");
  }

  /** Sayfanın altındaki Accountie notu: tarama sırası, firma, ne yapılacağı; atla ve durdur düğmeleri. */
  function showNote(text, doc = root.document, storage = root.sessionStorage) {
    let note = doc.getElementById("accountie-note");
    if (!note) {
      note = doc.createElement("div");
      note.id = "accountie-note";
      note.setAttribute("role", "region");
      note.setAttribute("aria-label", "Accountie e-Tebligat taraması");
      note.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:2147483647;padding:10px 14px;background:#27374D;color:#fff;font:15px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:center";
      const msg = doc.createElement("span");
      msg.id = "accountie-note-text";
      msg.setAttribute("role", "status");
      const button = (label, key, said) => {
        const b = doc.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.style.cssText = "font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #fff;background:transparent;color:#fff;cursor:pointer;outline-offset:2px";
        b.addEventListener("click", () => { storage.setItem(key, "1"); msg.textContent = said; });
        return b;
      };
      note.append(msg, button("Bu firmayı atla", SKIP_KEY, "Accountie: atlanıyor."), button("Taramayı durdur", STOP_KEY, "Accountie: tarama durduruluyor."));
      doc.body.append(note);
      // The note sits over the page's foot: room is kept so it never covers the form's Giriş Yap.
      if (doc.body.style) doc.body.style.paddingBottom = `${(note.offsetHeight || 72) + 16}px`;
    }
    // Set a frame later: a live region announces a change, not the text it was created with.
    const msg = doc.getElementById("accountie-note-text");
    (root.requestAnimationFrame ?? ((f) => f()))(() => { msg.textContent = text; });
    return true;
  }

  /**
   * GİB giriş formuna kullanıcı kodu ve şifreyi yazar (React'in duyacağı biçimde), doğrulama kodu kutusuna imleci koyar ve notu
   * gösterir. Doğrulama koduna ve Giriş Yap'a dokunmaz. false: form yok.
   */
  function fillLogin(user, pass, text, doc = root.document, storage = root.sessionStorage, loc = root.location) {
    // Only ever into Dijital Vergi Dairesi's own login page: a tab that went elsewhere meanwhile gets nothing.
    if (loc.origin !== GIB_ORIGIN || loc.pathname !== LOGIN_PATH) return false;
    const userBox = doc.getElementById("userid"), passBox = doc.getElementById("sifre"), code = doc.getElementById("dk");
    if (!userBox || !passBox || !code) return false;
    const set = (box, value) => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), "value")?.set;
      if (setter) setter.call(box, value); else box.value = value;
      box.dispatchEvent(new root.Event("input", { bubbles: true }));
      box.dispatchEvent(new root.Event("change", { bubbles: true }));
    };
    set(userBox, user);
    set(passBox, pass);
    showNote(text, doc, storage);
    code.focus();
    // Runs in this page even if the scan page is gone: no login stays in a form nobody is using.
    root.clearTimeout(root.accountieClear);
    root.accountieClear = root.setTimeout(() => { if (!storage.getItem("token")) { set(passBox, ""); set(userBox, ""); doc.getElementById("accountie-note")?.remove(); } }, CLEAR_AFTER_MS);
    return true;
  }

  /**
   * GİB sekmesinin durumu: durdur ya da atla dendi, giriş yapıldı (oturum anahtarı var), form yeniden doldurulmalı (GİB hatalı
   * kodda formu ya da sayfayı yeniledi: şifre ya da not gitti) ya da hâlâ bekleniyor.
   */
  function loginState(doc = root.document, storage = root.sessionStorage, loc = root.location) {
    if (loc.origin && loc.origin !== GIB_ORIGIN) return "elsewhere";
    if (storage.getItem(STOP_KEY)) return "stop";
    if (storage.getItem(SKIP_KEY)) return "skip";
    if (storage.getItem("token")) return "in";
    if (loc.pathname !== LOGIN_PATH) return "elsewhere";
    const pass = doc.getElementById("sifre");
    return pass && (!pass.value || !doc.getElementById("accountie-note")) ? "refill" : "waiting";
  }

  /** Açılan oturum o firmanın mı: user-info'nun VKN/TCKN'si Luca'daki firmanın Accountie'deki numarasıyla aynı olmalı. */
  const sameFirm = (idNumbers, taxNumber) => Array.isArray(idNumbers) && idNumbers.includes(String(taxNumber));

  root.AccountieGibLogin = { LUCA_PAGE, LOGIN_PATH, lucaRows, fetchLucaRows, plan, goToLogin, loginReady, showNote, fillLogin, loginState, sameFirm };
})(globalThis);
