// Dijital Vergi Dairesi e-Tebligat listesini, kullanıcının kendi açtığı oturumdan okur (docs/e-tebligat-arastirma-plan.md).
// Yalnız iki okuma: oturumdaki kişi (user-info) ve tebligat listesi. Zarf açan, belge indiren ya da arşivleyen GİB adreslerine
// hiç gidilmez: zarf açmak GİB'de "Mükellef Okuma Tarihi" yazar. GİB'in oturum anahtarı bu sekmeden çıkmaz.
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

  /**
   * Reads the open session's notices (not archived, then archived). `{ idNumbers, name, notices }`, or `{ error, step, status, keys }`
   * with only the HTTP status and the answer's field names, never its content, so a GİB change can be diagnosed from one report.
   */
  async function readNotices(storage = root.sessionStorage, fetcher = root.fetch) {
    const token = storage?.getItem("token");
    if (!token) return { error: "login" };
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" };
    const call = async (step, url, body) => {
      const res = await fetcher(url, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined, credentials: "omit" }).catch(() => null);
      if (!res) return { error: "network", step };
      if (!res.ok) return { error: "http", step, status: res.status };
      const json = await res.json().catch(() => null);
      return json && typeof json === "object" ? { json } : { error: "shape", step, status: res.status };
    };
    const user = await call("user-info", `${API}/auth/tdvd/user-info`);
    if (user.error) return user;
    const ids = idNumbers(user.json);
    if (!ids.length) return { error: "shape", step: "user-info", keys: keys(user.json) };
    const rows = [];
    for (const archived of ["0", "1"]) {
      let fetched = 0;
      // Pages from 1, as the portal's own list asks (pageNo: pageIndex + 1).
      for (let page = 1; page <= MAX; page++) {
        const body = { meta: { pagination: { pageNo: page, pageSize: PAGE_SIZE }, filters: [{ fieldName: "arsivDurum", values: [archived] }] } };
        const list = await call("tebligat-listele", `${API}/etebligat/etebligat/tebligat-listele`, body);
        if (list.error) return list;
        const got = list.json.data?.tebligatDtoList;
        const total = Number(list.json.pageDetail?.total ?? list.json.data?.count);
        const shape = () => ({ error: "shape", step: "tebligat-listele", keys: [...keys(list.json), ...keys(list.json.data).map((k) => `data.${k}`)] });
        // "No notices" only on an explicit zero: an error GİB sends with HTTP 200 (data null, messages) must never pass for an empty list.
        if (!Array.isArray(got)) {
          if (total === 0 || (fetched > 0 && !(total > fetched))) break;
          return shape();
        }
        // A page that stops short of GİB's own total is a partial read, never saved as the whole list.
        if (!got.length) { if (total > fetched) return shape(); break; }
        rows.push(...got);
        fetched += got.length;
        if (rows.length > MAX) return { error: "too-many" };
        // By GİB's total when it gives one: GİB may send pages smaller than asked.
        if (total > 0 ? fetched >= total : got.length < PAGE_SIZE) break;
      }
    }
    const notices = [...new Map(rows.map(toNotice).filter(Boolean).map((n) => [n.gibId, n])).values()].slice(0, MAX);
    return { idNumbers: ids, name: text(user.json.unvan) || [text(user.json.name), text(user.json.surname)].filter(Boolean).join(" ") || null, notices };
  }

  /** The popup's sentence for a failed read. */
  function problem(r) {
    if (r.error === "login") return "Dijital Vergi Dairesi'nde açık oturum yok. Önce firmanın hesabıyla giriş yapın (ya da Geçiş Yap ile firmaya geçin), sonra yeniden basın.";
    if (r.error === "http" && (r.status === 401 || r.status === 403)) return "Dijital Vergi Dairesi oturumu kapanmış ya da bu hesabın e-Tebligat yetkisi yok. Yeniden giriş yapıp tekrar deneyin.";
    if (r.error === "too-many") return "Bu firmada 2.000'den çok tebligat var; liste eksik kalacağı için hiçbir şey kaydedilmedi. destek@accountie.app'e yazın.";
    if (r.error === "http" && r.status >= 500) return "Dijital Vergi Dairesi şu an yanıt vermiyor. Biraz sonra tekrar deneyin.";
    if (r.error === "network") return "Dijital Vergi Dairesi'ne ulaşılamadı. Sayfayı yenileyip tekrar deneyin.";
    const detail = [r.step && `adım ${r.step}`, r.status && `HTTP ${r.status}`, r.keys?.length && `alanlar ${r.keys.join(", ")}`].filter(Boolean).join("; ");
    return `GİB'in yanıtı beklenen biçimde değil, hiçbir şey kaydedilmedi. Bu satırı destek@accountie.app'e iletin: ${detail}.`;
  }

  root.AccountieGib = { GIB_HOST, idNumbers, toNotice, readNotices, problem };
})(globalThis);
