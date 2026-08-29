import { describe, expect, it } from "vitest";
import { registrationCredentialsSchema } from "./credentials";

describe("registrationCredentialsSchema", () => {
  it("eşleşmeyen parolaları reddeder", () => {
    expect(registrationCredentialsSchema.safeParse({ name: "Ofis Kullanıcısı", email: "ofis@example.com", password: "guvenli123", passwordAgain: "farkli123" }).success).toBe(false);
  });
});
