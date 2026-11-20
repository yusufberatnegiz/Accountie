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
    const ids = user?.gecisYapildiMi ? [vkn] : [vkn, tckn];
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
      for (let page = 1; rows.length < MAX && page <= MAX; page++) {
        const body = { meta: { pagination: { pageNo: page, pageSize: PAGE_SIZE }, filters: [{ fieldName: "arsivDurum", values: [archived] }] } };
        const list = await call("tebligat-listele", `${API}/etebligat/etebligat/tebligat-listele`, body);
        if (list.error) return list;
        const got = list.json.data?.tebligatDtoList;
        // GİB answers an empty list with no array at all when there is nothing: count 0 is fine, anything else is a changed answer.
        if (!Array.isArray(got)) {
          if (Number(list.json.data?.count ?? list.json.pageDetail?.total) === 0 || list.json.data === null) break;
          return { error: "shape", step: "tebligat-listele", keys: [...keys(list.json), ...keys(list.json.data).map((k) => `data.${k}`)] };
        }
        rows.push(...got);
        fetched += got.length;
        // By GİB's total when it gives one: GİB may send pages smaller than asked.
        const total = Number(list.json.pageDetail?.total);
        if (!got.length || (total > 0 ? fetched >= total : got.length < PAGE_SIZE)) break;
      }
    }
    const notices = [...new Map(rows.map(toNotice).filter(Boolean).map((n) => [n.gibId, n])).values()].slice(0, MAX);
    return { idNumbers: ids, name: text(user.json.unvan) || [text(user.json.name), text(user.json.surname)].filter(Boolean).join(" ") || null, notices };
  }

  /** The popup's sentence for a failed read. */
  function problem(r) {
    if (r.error === "login") return "Dijital Vergi Dairesi'nde açık oturum yok. Önce firmanın hesabıyla giriş yapın, e-Tebligat sayfası açıkken yeniden basın.";
    if (r.error === "http" && (r.status === 401 || r.status === 403)) return "Dijital Vergi Dairesi oturumu kapanmış ya da bu hesabın e-Tebligat yetkisi yok. Yeniden giriş yapıp tekrar deneyin.";
    if (r.error === "network") return "Dijital Vergi Dairesi'ne ulaşılamadı. Sayfayı yenileyip tekrar deneyin.";
    const detail = [r.step && `adım ${r.step}`, r.status && `HTTP ${r.status}`, r.keys?.length && `alanlar ${r.keys.join(", ")}`].filter(Boolean).join("; ");
    return `GİB'in yanıtı beklenen biçimde değil, hiçbir şey kaydedilmedi. Bu satırı destek@accountie.app'e iletin: ${detail}.`;
  }

  root.AccountieGib = { GIB_HOST, idNumbers, toNotice, readNotices, problem };
})(globalThis);
