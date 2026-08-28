const OFFICIAL_HOSTS = new Set([
  "gib.gov.tr",
  "www.gib.gov.tr",
  "sgk.gov.tr",
  "www.sgk.gov.tr",
  "resmigazete.gov.tr",
  "www.resmigazete.gov.tr",
]);

const MAX_RESPONSE_BYTES = 2_000_000;

export function assertOfficialUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname)) {
    throw new Error(`İzin verilmeyen kaynak: ${url.hostname}`);
  }
  return url;
}

export async function fetchOfficialText(urlValue: string, init: RequestInit = {}): Promise<string> {
  const url = assertOfficialUrl(urlValue);
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "User-Agent": "Accountie/0.1 (internal accounting office)",
      ...init.headers,
    },
  });
  if (response.status >= 300 && response.status < 400) throw new Error("Kaynak beklenmeyen bir yönlendirme döndürdü.");
  if (!response.ok) throw new Error(`Kaynak isteği başarısız: ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_RESPONSE_BYTES) throw new Error("Kaynak yanıtı boyut sınırını aştı.");
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) throw new Error("Kaynak yanıtı boyut sınırını aştı.");
  return body;
}

export async function fetchOfficialJson(urlValue: string, init: RequestInit = {}): Promise<unknown> {
  const body = await fetchOfficialText(urlValue, {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
  });
  return JSON.parse(body) as unknown;
}
