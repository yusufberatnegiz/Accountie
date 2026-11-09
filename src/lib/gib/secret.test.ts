import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { open, seal, secretContext, secretKey, SecretError } from "./secret";

const key = randomBytes(32);
const ctx = secretContext("user-a", "firm-1", "sifre");

afterEach(() => { delete process.env.GIB_SECRET_KEY; });

describe("GİB şifresinin mühürlenmesi", () => {
  it("açılınca aynı metni verir; her mühür farklıdır, düz metni içermez", () => {
    const a = seal(key, "Gizli-Şifre1", ctx), b = seal(key, "Gizli-Şifre1", ctx);
    expect(a).not.toBe(b);
    expect(a).not.toContain("Gizli");
    expect(open(key, a, ctx)).toBe("Gizli-Şifre1");
  });

  it("başka anahtar, başka kullanıcı/firma/alan ya da değiştirilmiş mühürle açılmaz", () => {
    const sealed = seal(key, "Gizli-Şifre1", ctx);
    expect(() => open(randomBytes(32), sealed, ctx)).toThrow(SecretError);
    expect(() => open(key, sealed, secretContext("user-b", "firm-1", "sifre"))).toThrow(SecretError);
    expect(() => open(key, sealed, secretContext("user-a", "firm-2", "sifre"))).toThrow(SecretError);
    expect(() => open(key, sealed, secretContext("user-a", "firm-1", "kullanici"))).toThrow(SecretError);
    const parts = sealed.split(".");
    const flipped = Buffer.from(parts[3], "base64url"); flipped[0] ^= 1;
    expect(() => open(key, [parts[0], parts[1], parts[2], flipped.toString("base64url")].join("."), ctx)).toThrow(SecretError);
    expect(() => open(key, "düz metin", ctx)).toThrow(SecretError);
  });

  it("mühür boyu şifrenin uzunluğunu söylemez; başka anahtarın mührü 'key' hatası verir (kayıt silinmesin diye)", () => {
    expect(seal(key, "a", ctx).length).toBe(seal(key, "x".repeat(64), ctx).length);
    expect(open(key, seal(key, "ğüşİ", ctx), ctx)).toBe("ğüşİ");
    expect(() => open(randomBytes(32), seal(key, "a", ctx), ctx)).toThrow("key");
    expect(() => open(key, "v2.xx.yy.zz.ww", ctx)).toThrow("key");
  });

  it("anahtar yoksa ya da 32 bayt değilse özellik kapalı (null)", () => {
    expect(secretKey()).toBeNull();
    process.env.GIB_SECRET_KEY = Buffer.alloc(16).toString("base64");
    expect(secretKey()).toBeNull();
    process.env.GIB_SECRET_KEY = "kısa";
    expect(secretKey()).toBeNull();
    process.env.GIB_SECRET_KEY = Buffer.alloc(32).toString("base64"); // a placeholder of zeros
    expect(secretKey()).toBeNull();
    process.env.GIB_SECRET_KEY = key.toString("base64");
    expect(secretKey()?.equals(key)).toBe(true);
  });
});
