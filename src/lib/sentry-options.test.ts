import { describe, expect, it } from "vitest";
import { sentryOptions } from "./sentry-options";

describe("Sentry: istekten hiçbir veri gitmez", () => {
  it("gövde, başlık, çerez, sorgu, yerel değişken ve veritabanı parametresi toplanmaz", () => {
    expect(sentryOptions.dataCollection).toMatchObject({ httpBodies: [], httpHeaders: false, cookies: false, urlQueryParams: false, stackFrameVariables: false, databaseQueryData: false, userInfo: false });
  });

  it("bir entegrasyon yine de eklerse olay gövdesiz ve başlıksız gider", () => {
    const event = { request: { data: '{"logins":[{"password":"Gizli"}]}', headers: { authorization: "Bearer acx_x" }, cookies: { sb: "x" }, query_string: "a=1", url: "/api/x" } };
    const sent = sentryOptions.beforeSend(structuredClone(event));
    expect(JSON.stringify(sent)).not.toMatch(/Gizli|acx_|sb/);
    expect(sent.request).toEqual({ url: "/api/x" });
  });

  it("varsayılan akış modunda yok sayılan işlem ayarlarını SDK'ya göndermez", () => {
    expect(sentryOptions).not.toHaveProperty("beforeSendTransaction");
    expect(sentryOptions).not.toHaveProperty("ignoreTransactions");
  });
});
