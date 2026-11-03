import { describe, expect, it } from "vitest";
import { checkAuthForm } from "./validation";

describe("checkAuthForm (the form's pre-send check, same schema as the server)", () => {
  it("passes valid values", () => {
    expect(checkAuthForm(false, { email: "a@b.co", password: "12345678" })).toBeUndefined();
    expect(checkAuthForm(true, { name: "Ay Su", email: "a@b.co", password: "12345678" })).toBeUndefined();
  });
  it("marks every invalid field and focuses the first in form order", () => {
    expect(checkAuthForm(true, { name: "", email: "abc", password: "kısa" })).toMatchObject({ field: "name", fields: ["name", "email", "password"], email: "abc", name: "" });
    expect(checkAuthForm(false, { email: "a@b.co", password: "" })).toMatchObject({ error: "bicim-sifre", field: "password", fields: ["password"] });
  });
  it("never hands the password back", () => {
    expect(JSON.stringify(checkAuthForm(false, { email: "x", password: "gizli" }))).not.toContain("gizli");
  });
});
