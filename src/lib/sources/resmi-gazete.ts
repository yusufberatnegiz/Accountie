import { load } from "cheerio";
import { get } from "node:https";
import { rootCertificates } from "node:tls";
import { assertOfficialUrl } from "./official-fetch";

const BASE_URL = "https://www.resmigazete.gov.tr";
const MAX_RESPONSE_BYTES = 2_000_000;
// Resmî Gazete sunucusu ara sertifikayı göndermediği için doğrulamayı kapatmadan eksik zinciri tamamlarız.
const GEOTRUST_TLS_RSA_CA_G1 = `-----BEGIN CERTIFICATE-----
MIIEjTCCA3WgAwIBAgIQDQd4KhM/xvmlcpbhMf/ReTANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xNzExMDIxMjIzMzdaFw0yNzExMDIxMjIzMzdaMGAxCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xHzAdBgNVBAMTFkdlb1RydXN0IFRMUyBSU0EgQ0EgRzEwggEiMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQC+F+jsvikKy/65LWEx/TMkCDIuWegh1Ngwvm4Q
yISgP7oU5d79eoySG3vOhC3w/3jEMuipoH1fBtp7m0tTpsYbAhch4XA7rfuD6whU
gajeErLVxoiWMPkC/DnUvbgi74BJmdBiuGHQSd7LwsuXpTEGG9fYXcbTVN5SATYq
DfbexbYxTMwVJWoVb6lrBEgM3gBBqiiAiy800xu1Nq07JdCIQkBsNpFtZbIZhsDS
fzlGWP4wEmBQ3O67c+ZXkFr2DcrXBEtHam80Gp2SNhou2U5U7UesDL/xgLK6/0d7
6TnEVMSUVJkZ8VeZr+IUIlvoLrtjLbqugb0T3OYXW+CQU0kBAgMBAAGjggFAMIIB
PDAdBgNVHQ4EFgQUlE/UXYvkpOKmgP792PkA76O+AlcwHwYDVR0jBBgwFoAUTiJU
IBiV5uNu5g/6+rkS7QYXjzkwDgYDVR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQGCCsG
AQUFBwMBBggrBgEFBQcDAjASBgNVHRMBAf8ECDAGAQH/AgEAMDQGCCsGAQUFBwEB
BCgwJjAkBggrBgEFBQcwAYYYaHR0cDovL29jc3AuZGlnaWNlcnQuY29tMEIGA1Ud
HwQ7MDkwN6A1oDOGMWh0dHA6Ly9jcmwzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydEds
b2JhbFJvb3RHMi5jcmwwPQYDVR0gBDYwNDAyBgRVHSAAMCowKAYIKwYBBQUHAgEW
HGh0dHBzOi8vd3d3LmRpZ2ljZXJ0LmNvbS9DUFMwDQYJKoZIhvcNAQELBQADggEB
AIIcBDqC6cWpyGUSXAjjAcYwsK4iiGF7KweG97i1RJz1kwZhRoo6orU1JtBYnjzB
c4+/sXmnHJk3mlPyL1xuIAt9sMeC7+vreRIF5wFBC0MCN5sbHwhNN1JzKbifNeP5
ozpZdQFmkCo+neBiKR6HqIA+LMTMCMMuv2khGGuPHmtDze4GmEGZtYLyF8EQpa5Y
jPuV6k2Cr/N3XxFpT3hRpt/3usU/Zb9wfKPtWpoznZ4/44c1p9rzFcZYrWkj3A+7
TNBJE0GmP2fhXhP1D/XVfIW/h0yCJGEiV9Glm/uGOa3DXHlmbAcxSyCRraG+ZBkA
7h4SeM6Y8l/7MBRpPCz6l8Y=
-----END CERTIFICATE-----`;

function fetchGazetteHtml(urlValue: string): Promise<string> {
  const url = assertOfficialUrl(urlValue);
  return new Promise((resolve, reject) => {
    const request = get(url, {
      ca: [...rootCertificates, GEOTRUST_TLS_RSA_CA_G1],
      headers: { Accept: "text/html", "User-Agent": "Accountie/0.1 (internal accounting office)" },
      timeout: 10_000,
    }, (response) => {
      if ((response.statusCode ?? 500) >= 300 && (response.statusCode ?? 500) < 400) {
        response.resume();
        reject(new Error("Kaynak beklenmeyen bir yönlendirme döndürdü."));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Kaynak isteği başarısız: ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) response.destroy(new Error("Kaynak yanıtı boyut sınırını aştı."));
        else chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("Kaynak isteği zaman aşımına uğradı.")));
    request.on("error", reject);
  });
}

export type GazetteItem = {
  title: string;
  category: string;
  section: string;
  sourceUrl: string;
};

export type GazetteIssue = {
  date: string;
  title: string;
  pdfUrl: string;
  sourceUrl: string;
  items: GazetteItem[];
};

export function parseOfficialGazette(html: string, date: string, sourceUrl: string): GazetteIssue {
  const $ = load(html);
  const title = $("#spanGazeteTarih").text().replace(/\s+/g, " ").trim();
  const pdfHref = $("#btnPdfGoruntule").attr("href");
  if (!title || !pdfHref) throw new Error("Resmî Gazete sayfa yapısı doğrulanamadı.");
  const pdfUrl = new URL(pdfHref, BASE_URL).toString();
  assertOfficialUrl(pdfUrl);

  const items = $("#html-content .fihrist-item a").map((_, element) => {
    const link = $(element);
    const itemUrl = new URL(link.attr("href") ?? "", BASE_URL).toString();
    assertOfficialUrl(itemUrl);
    return {
      title: link.text().replace(/^\s*[–-]+\s*/, "").replace(/\s+/g, " ").trim(),
      category: link.parent().prevAll(".html-subtitle").first().text().replace(/\s+/g, " ").trim(),
      section: link.parent().prevAll(".html-title").first().text().replace(/\s+/g, " ").trim(),
      sourceUrl: itemUrl,
    };
  }).get().filter((item) => item.title);

  if (!items.length) throw new Error("Resmî Gazete içeriği bulunamadı.");
  return { date, title, pdfUrl, sourceUrl, items };
}

export async function fetchOfficialGazette(date: string): Promise<GazetteIssue> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Resmî Gazete sorgu tarihi geçersiz.");
  const [, year, month, day] = match;
  const sourceUrl = `${BASE_URL}/${day}.${month}.${year}`;
  const html = await fetchGazetteHtml(sourceUrl);
  return parseOfficialGazette(html, date, sourceUrl);
}
