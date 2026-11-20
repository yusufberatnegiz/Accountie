// e-Tebligat taraması (tebligat.js) için: Luca'nın GİB Şirket ekranındaki giriş bilgilerini okur, Dijital Vergi Dairesi giriş
// formuna kullanıcı kodu ve şifreyi yazar. Doğrulama kodunu (captcha) hiçbir zaman okumaz, yazmaz, çözmez: kutuya imleci koyar, kodu
// kullanıcı yazar ve Giriş Yap'a kendisi basar. Şifreler yalnız tarama sayfasının belleğinde durur; hiçbir yere kaydedilmez ve
// Accountie'ye gönderilmez. src/lib/luca/extension-gib-login.test.ts sınar.
(function (root) {
  const LUCA_PAGE = "/Luca/editGibSirketGirisAction.do";
  const LOGIN_PATH = "/portal/login";
  const SKIP_KEY = "accountie-skip";
  const ID = /^\d{10,11}$/;

  /**
   * Luca'nın GİB Şirket ekranındaki satırlar (Ser.Mes.Defteri → Beyannameler → Toplu Beyanname → GİB Şirket): her satırda
   * KULLANICI_ADI_<firma no>, SIFRE_<firma no>. Sayfa dünyasında çalışır; yalnız bu ekranda bir şey döner.
   */
  function lucaRows(doc = root.document, path = root.location?.pathname) {
    if (path !== LUCA_PAGE) return null;
    return Array.from(doc.querySelectorAll("input[id^='SIFRE_']"), (pass) => {
      const lucaId = pass.id.slice("SIFRE_".length);
      const tr = pass.closest("tr");
      return { lucaId, name: (tr?.cells?.[1]?.textContent ?? "").trim(), user: doc.getElementById(`KULLANICI_ADI_${lucaId}`)?.value ?? "", pass: pass.value ?? "" };
    });
  }

  /**
   * Taranacak firmalar: Luca'da kullanıcı kodu ve şifresi dolu, Accountie'de VKN'si bilinen; bugün taranmışlar atlanır (yarıda kalan
   * tarama baştan başlamaz). Şifresi eksik ya da Accountie'de olmayanlar sayılır, adlarıyla söylenir.
   */
  function plan(rows, firms, doneToday = []) {
    const tax = new Map(firms.filter((f) => ID.test(String(f.taxNumber))).map((f) => [String(f.lucaId), String(f.taxNumber)]));
    const out = { todo: [], noCredentials: [], notInAccountie: [], done: 0 };
    for (const r of rows) {
      if (!/^\d{1,12}$/.test(r.lucaId)) continue;
      if (!tax.has(r.lucaId)) { out.notInAccountie.push(r.name || r.lucaId); continue; }
      if (!r.user.trim() || !r.pass) { out.noCredentials.push(r.name || r.lucaId); continue; }
      if (doneToday.includes(r.lucaId)) { out.done++; continue; }
      out.todo.push({ lucaId: r.lucaId, name: r.name || r.lucaId, user: r.user.trim(), pass: r.pass, taxNumber: tax.get(r.lucaId) });
    }
    return out;
  }

  /**
   * GİB sayfasında: önceki firmanın oturum anahtarını siler (yeni giriş onunla karışmasın), giriş sayfasında değilse oraya gider.
   * true: giriş formu açık ve boş oturumla hazır.
   */
  function resetSession(doc = root.document, storage = root.sessionStorage, loc = root.location) {
    storage.removeItem("token");
    storage.removeItem(SKIP_KEY);
    if (loc.pathname !== LOGIN_PATH) { loc.assign(LOGIN_PATH); return false; }
    return !!doc.getElementById("userid") && !!doc.getElementById("sifre");
  }

  /**
   * GİB giriş formuna kullanıcı kodu ve şifreyi yazar (React'in duyacağı biçimde), doğrulama kodu kutusuna imleci koyar ve sayfanın
   * üstünde kısa bir not gösterir. Doğrulama koduna ve Giriş Yap'a dokunmaz. false: form yok.
   */
  function fillLogin(user, pass, firmName, doc = root.document, storage = root.sessionStorage) {
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
    doc.getElementById("accountie-note")?.remove();
    const note = doc.createElement("div");
    note.id = "accountie-note";
    note.setAttribute("role", "status");
    note.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:10px 14px;background:#27374D;color:#fff;font:15px/1.4 system-ui,sans-serif;display:flex;gap:12px;align-items:center;justify-content:center";
    const text = doc.createElement("span");
    text.textContent = `Accountie: ${firmName}. Doğrulama kodunu yazıp Giriş Yap'a basın.`;
    const skip = doc.createElement("button");
    skip.type = "button";
    skip.textContent = "Bu firmayı atla";
    skip.style.cssText = "font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #fff;background:transparent;color:#fff;cursor:pointer";
    skip.addEventListener("click", () => { storage.setItem(SKIP_KEY, "1"); text.textContent = "Accountie: atlanıyor."; });
    note.append(text, skip);
    doc.body.append(note);
    code.focus();
    return true;
  }

  /** GİB sekmesinin durumu: giriş yapıldı (oturum anahtarı var), kullanıcı atla dedi ya da hâlâ bekleniyor. */
  function loginState(storage = root.sessionStorage, loc = root.location) {
    if (storage.getItem(SKIP_KEY)) return "skip";
    if (storage.getItem("token")) return "in";
    return loc.pathname === LOGIN_PATH ? "waiting" : "elsewhere";
  }

  /** Açılan oturum o firmanın mı: user-info'nun VKN/TCKN'si Luca'daki firmanın Accountie'deki numarasıyla aynı olmalı. */
  const sameFirm = (idNumbers, taxNumber) => Array.isArray(idNumbers) && idNumbers.includes(String(taxNumber));

  root.AccountieGibLogin = { LUCA_PAGE, LOGIN_PATH, lucaRows, plan, resetSession, fillLogin, loginState, sameFirm };
})(globalThis);
