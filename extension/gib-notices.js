// Dijital Vergi Dairesi e-Tebligat listesini, kullanıcının kendi açtığı oturumdan okur (docs/e-tebligat-arastirma-plan.md).
// readNotices yalnız okur: oturumdaki kişi (user-info) ve tebligat listesi; liste eksiksiz değilse (GİB'in toplamı tutmaz, okurken
// değişir, kimliksiz satır gelir) hiçbir şey dönmez. downloadNotice zarfı açar ve belgeyi indirir, portalın kendi yaptığı gibi
// (zarf-detay-sorgula, belge-ek-listele, belge-getir): GİB'de "Mükellef Okuma Tarihi" yazar, tebliğ tarihi değişmez (VUK 107/A,
// gönderimi izleyen 5. gün). Arşivleme hiç yapılmaz. GİB'in oturum anahtarı bu sekmeden çıkmaz.
// src/lib/luca/extension-gib.test.ts sınar.
(function (root) {
  const GIB_HOST = "dijital.gib.gov.tr";
  const API = "https://dijital.gib.gov.tr/apigateway";
  const PAGE_SIZE = 100;
  const MAX = 2000;
  const ID = /^\d{10,11}$/;

  const text = (v) => (v === null || v === undefined ? null : String(v).trim().slice(0, 400) || null);

  /** The session's own numbers, VKN first; after "Geçiş Yap" only the firm's VKN (the TCKN may be the müşavir's). */
  function idNumbers(user) {
    const vkn = text(user?.vkn);
    const tckn = text(user?.tckn);
    // After a switch only the firm's VKN: the TCKN there may be the müşavir's own, and a wrong firm is worse than a clear error.
    const ids = user?.gecisYapildiMi === true ? [vkn] : [vkn, tckn];
    return [...new Set(ids.filter((v) => v && ID.test(v)))];
  }

  /** One row of GİB's list as Accountie keeps it, or null when it has no id. */
  function toNotice(row) {
    const gibId = text(row?.tarafId ?? row?.id);
    if (!gibId || !/^[A-Za-z0-9_-]{1,64}$/.test(gibId)) return null;
    return {
      gibId,
      institution: text(row.kurumAciklama) || "Kurum belirtilmemiş",
      subUnit: text(row.altKurum),
      docType: text(row.belgeTuruAciklama),
      docNo: text(row.belgeNo),
      sentAt: text(row.gonderimZamani),
      servedAt: text(row.tebligZamani),
      readOnGib: Boolean(row.mukellefOkumaZamani),
    };
  }

  const keys = (o) => (o && typeof o === "object" ? Object.keys(o).slice(0, 12) : []);

  /** GİB's own call: JSON in, `{ json }` or `{ error, step, status }` out (never the answer's content in an error). */
  function caller(token, fetcher) {
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" };
    return async (step, url, body) => {
      const res = await fetcher(url, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
      if (!res) return { error: "network", step };
      if (!res.ok) return { error: "http", step, status: res.status };
      const json = await res.json().catch(() => null);
      return json && typeof json === "object" ? { json } : { error: "shape", step, status: res.status };
    };
  }

  /**
   * One archive tab's whole list, or an error. Complete or nothing: GİB's total must stay the same on every page and be reached
   * exactly, each row must have an id, and no id may come twice (a list that moved while it was read).
   */
  async function readTab(call, archived) {
    const rows = [], seen = new Set();
    let total = null;
    // Pages from 1, as the portal's own list asks (pageNo: pageIndex + 1).
    for (let page = 1; page <= MAX; page++) {
      const body = { meta: { pagination: { pageNo: page, pageSize: PAGE_SIZE }, filters: [{ fieldName: "arsivDurum", values: [archived] }] } };
      const list = await call("tebligat-listele", `${API}/etebligat/etebligat/tebligat-listele`, body);
      if (list.error) return list;
      const got = list.json.data?.tebligatDtoList;
      const said = Number(list.json.pageDetail?.total ?? list.json.data?.count);
      const shape = () => ({ error: "shape", step: "tebligat-listele", keys: [...keys(list.json), ...keys(list.json.data).map((k) => `data.${k}`)] });
      // "No notices" only on an explicit zero: an error GİB sends with HTTP 200 (data null, messages) must never pass for an empty list.
      if (!Array.isArray(got)) {
        if (said === 0 && !rows.length) break;
        if (rows.length && total !== null && rows.length === total) break;
        return shape();
      }
      if (Number.isSafeInteger(said) && said >= 0) {
        if (total === null) total = said;
        else if (said !== total) return { error: "changed" };
      }
      if (!got.length) break;
      for (const row of got) {
        const id = text(row?.tarafId ?? row?.id);
        if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { error: "shape", step: "kimliksiz-satir" };
        if (seen.has(id)) return { error: "changed" };
        seen.add(id);
        rows.push(row);
      }
      if (rows.length > MAX) return { error: "too-many" };
      // By GİB's total when it gives one: GİB may send pages smaller than asked.
      if (total !== null ? rows.length >= total : got.length < PAGE_SIZE) break;
    }
    // A list that stops short of (or runs past) GİB's own total is a partial read, never saved as the whole list.
    if (total !== null && rows.length !== total) return { error: "shape", step: "tebligat-listele", keys: [`toplam ${total}`, `okunan ${rows.length}`] };
    return { rows };
  }

  /** What downloadNotice needs to open one envelope; kept in the extension for this firm only, never sent to Accountie. */
  const toEnvelope = (row) => ({
    gibId: text(row.tarafId ?? row.id), docNo: text(row.belgeNo),
    tarafId: row.tarafId, tarafSecureId: row.tarafSecureId, tebligId: row.tebligId, tebligSecureId: row.tebligSecureId,
  });

  /**
   * Reads the open session's notices (not archived, then archived). `{ idNumbers, name, notices, envelopes }`, or `{ error, step,
   * status, keys }` with only the HTTP status and the answer's field names, never its content, so a GİB change can be diagnosed
   * from one report. A list that changed while it was read is read once more from the start; twice, it is an error.
   */
  async function readNotices(storage = root.sessionStorage, fetcher = root.fetch) {
    const token = storage?.getItem("token");
    if (!token) return { error: "login" };
    const call = caller(token, fetcher);
    const user = await call("user-info", `${API}/auth/tdvd/user-info`);
    if (user.error) return user;
    const ids = idNumbers(user.json);
    if (!ids.length) return user.json.gecisYapildiMi === true ? { error: "switch-no-vkn" } : { error: "shape", step: "user-info", keys: keys(user.json) };
    let rows;
    for (let attempt = 0; attempt < 2; attempt++) {
      rows = [];
      let failed = null;
      for (const archived of ["0", "1"]) {
        const tab = await readTab(call, archived);
        if (tab.error) { failed = tab; break; }
        rows.push(...tab.rows);
      }
      if (!failed) break;
      if (failed.error !== "changed" || attempt) return failed;
    }
    if (rows.length > MAX) return { error: "too-many" };
    // The same notice in both tabs (moved to the archive mid-read) is one notice.
    const unique = [...new Map(rows.map((r) => [text(r.tarafId ?? r.id), r])).values()];
    return {
      idNumbers: ids,
      name: text(user.json.unvan) || [text(user.json.name), text(user.json.surname)].filter(Boolean).join(" ") || null,
      notices: unique.map(toNotice).filter(Boolean),
      envelopes: unique.map(toEnvelope),
    };
  }

  /** A DER element at `at`: its tag and where its content starts and ends; null when it does not fit. */
  function der(b, at, end) {
    if (at + 2 > end) return null;
    const tag = b[at];
    let len = b[at + 1], p = at + 2;
    if (len & 0x80) {
      const n = len & 0x7f;
      if (!n || n > 4 || p + n > end) return null;
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + b[p++];
    }
    return p + len > end ? null : { tag, start: p, end: p + len };
  }
  const kids = (b, node) => {
    if (!node) return null;
    const out = [];
    for (let p = node.start; p < node.end;) { const k = der(b, p, node.end); if (!k || out.length > 64) return null; out.push(k); p = k.end; }
    return out;
  };
  const oidIs = (b, node, hex) => node?.tag === 0x06 && Array.from(b.subarray(node.start, node.end), (x) => x.toString(16).padStart(2, "0")).join("") === hex;

  /**
   * GİB may send a document as a signed package (CMS SignedData, e.g. .imz): the document inside it, or null. The signature is
   * not checked here; GİB keeps the signed original.
   */
  function unwrapSigned(b) {
    const top = der(b, 0, b.length);
    if (!top || top.tag !== 0x30) return null;
    const info = kids(b, top);
    if (info?.length !== 2 || !oidIs(b, info[0], "2a864886f70d010702") || info[1].tag !== 0xa0) return null;
    const signed = kids(b, kids(b, info[1])?.[0]);
    const content = signed?.[2]?.tag === 0x30 ? kids(b, signed[2]) : null;
    if (content?.length !== 2 || !oidIs(b, content[0], "2a864886f70d010701") || content[1].tag !== 0xa0) return null;
    const payload = kids(b, content[1])?.[0];
    if (!payload) return null;
    // Octets, plain or in pieces (constructed OCTET STRING).
    const parts = payload.tag === 0x04 ? [payload] : payload.tag === 0x24 ? kids(b, payload) : null;
    if (!parts || parts.some((x) => x.tag !== 0x04)) return null;
    const out = new Uint8Array(parts.reduce((n, x) => n + x.end - x.start, 0));
    let o = 0;
    for (const x of parts) { out.set(b.subarray(x.start, x.end), o); o += x.end - x.start; }
    return out;
  }

  const isPdf = (b) => !!b && b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  const base64 = (b) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return root.btoa(s); };
  // A file name from GİB's, safe on every disk: no path, no reserved characters, short.
  const fileName = (v, ext) => `${(text(v) ?? "").replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim().slice(0, 80) || "belge"}.${ext}`;

  /**
   * Opens one envelope and fetches its document and attachments, as the portal's own "Zarf Aç" does; GİB writes the read date.
   * `{ files: [{ name, base64 }] }` (a signed package unwrapped to its PDF), or `{ error, step, status }`.
   */
  async function downloadNotice(env, storage = root.sessionStorage, fetcher = root.fetch) {
    const token = storage?.getItem("token");
    if (!token) return { error: "login" };
    if (!env?.tarafId || !env.tarafSecureId || !env.tebligId || !env.tebligSecureId) return { error: "shape", step: "zarf-kimlik" };
    const call = caller(token, fetcher);
    const envelope = await call("zarf-detay-sorgula", `${API}/etebligat/etebligat/zarf-detay-sorgula`, { tarafId: env.tarafId, tarafSecureId: env.tarafSecureId });
    if (envelope.error) return envelope;
    if (!envelope.json.data) return { error: "shape", step: "zarf-detay-sorgula", keys: keys(envelope.json) };
    const list = await call("belge-ek-listele", `${API}/etebligat/etebligat/belge-ek-listele`, { tebligId: env.tebligId, tebligSecureId: env.tebligSecureId });
    if (list.error) return list;
    const main = list.json.tebligBelge ?? list.json.data?.tebligBelge;
    const extras = list.json.ekler ?? list.json.data?.ekler ?? [];
    if (!main?.id || !Array.isArray(extras)) return { error: "shape", step: "belge-ek-listele", keys: [...keys(list.json), ...keys(list.json.data).map((k) => `data.${k}`)] };
    const files = [];
    for (const d of [main, ...extras].slice(0, 20)) {
      const got = await call("belge-getir", `${API}/etebligat/etebligat/belge-getir`, { data: { id: d.id, secureId: d.secureId, belgeTip: d.belgeTip, tarafId: env.tarafId, tarafSecureId: env.tarafSecureId, uzanti: d.uzanti, belgeAdi: d.adi } });
      if (got.error) return got;
      const link = got.json.reportLink ?? got.json.data?.reportLink;
      let url;
      try { url = new URL(String(link ?? ""), `https://${GIB_HOST}`); } catch { url = null; }
      if (!link || !url) return { error: "shape", step: "belge-getir", keys: keys(got.json) };
      // Only ever from GİB itself: a link elsewhere would carry this session's key out.
      if (url.origin !== `https://${GIB_HOST}`) return { error: "shape", step: "belge-adresi" };
      const res = await fetcher(url.href, { credentials: "include", headers: { authorization: `Bearer ${token}` } }).catch(() => null);
      if (!res) return { error: "network", step: "belge-indir" };
      if (!res.ok) return { error: "http", step: "belge-indir", status: res.status };
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (!bytes.length) return { error: "shape", step: "belge-indir" };
      const pdf = isPdf(bytes) ? bytes : unwrapSigned(bytes);
      const ok = isPdf(pdf);
      const ext = ok ? "pdf" : String(d.uzanti ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 5) || "bin";
      files.push({ name: fileName(d.adi ?? env.docNo, ext), base64: base64(ok ? pdf : bytes) });
    }
    return { files };
  }

  /** The popup's sentence for a failed read. */
  function problem(r) {
    if (r.error === "login") return "Dijital Vergi Dairesi'nde açık oturum yok. Önce firmanın hesabıyla giriş yapın (ya da Geçiş Yap ile firmaya geçin), sonra yeniden basın.";
    if (r.error === "http" && (r.status === 401 || r.status === 403)) return "Dijital Vergi Dairesi oturumu kapanmış ya da bu hesabın e-Tebligat yetkisi yok. Yeniden giriş yapıp tekrar deneyin.";
    if (r.error === "switch-no-vkn") return "Geçiş Yap ile geçilen firmanın vergi kimlik numarası okunamadı (şahıs firması olabilir). Bu firmayı kendi hesabıyla girerek okuyun.";
    if (r.error === "changed") return "GİB'deki liste okunurken iki kez değişti; eksik kalmasın diye hiçbir şey kaydedilmedi. Yeniden başlatınca tekrar denenir.";
    if (r.error === "too-many") return "Bu firmada 2.000'den çok tebligat var; liste eksik kalacağı için hiçbir şey kaydedilmedi. destek@accountie.app'e yazın.";
    if (r.error === "http" && r.status >= 500) return "Dijital Vergi Dairesi şu an yanıt vermiyor. Biraz sonra tekrar deneyin.";
    if (r.error === "network") return "Dijital Vergi Dairesi'ne ulaşılamadı. Sayfayı yenileyip tekrar deneyin.";
    const detail = [r.step && `adım ${r.step}`, r.status && `HTTP ${r.status}`, r.keys?.length && `alanlar ${r.keys.join(", ")}`].filter(Boolean).join("; ");
    return `GİB'in yanıtı beklenen biçimde değil, hiçbir şey kaydedilmedi. Bu satırı destek@accountie.app'e iletin: ${detail}.`;
  }

  root.AccountieGib = { GIB_HOST, idNumbers, toNotice, readNotices, downloadNotice, unwrapSigned, problem };
})(globalThis);
