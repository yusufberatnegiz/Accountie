import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkAuthForm } from "./validation";

it("turns off zod's eval probe, which the auth pages' CSP would report on every load", () => {
  expect(z.config().jitless).toBe(true);
});

describe("checkAuthForm (the form's pre-send check, same schema as the server)", () => {
  it("passes valid values", () => {
    expect(checkAuthForm(false, { email: "a@b.co", password: "12345678" })).toBeUndefined();
    expect(checkAuthForm(true, { name: "Ay Su", email: "a@b.co", password: "12345678" })).toBeUndefined();
  });
  it("marks every invalid field and focuses the first in form order", () => {
    expect(checkAuthForm(true, { name: "", email: "abc", password: "kısa" })).toMatchObject({ field: "name", fields: ["name", "email", "password"], email: "abc", name: "" });
    expect(checkAuthForm(false, { email: "a@b.co", password: "" })).toMatchObject({ error: "bos-sifre", field: "password", fields: ["password"] });
    // The length rule is the signup's: a login only needs a password typed.
    expect(checkAuthForm(false, { email: "a@b.co", password: "kısa" })).toBeUndefined();
    expect(checkAuthForm(true, { name: "Ay Su", email: "a@b.co", password: "kısa" })).toMatchObject({ error: "bicim-sifre", fields: ["password"] });
  });
  it("never hands the password back", () => {
    expect(JSON.stringify(checkAuthForm(false, { email: "x", password: "gizli" }))).not.toContain("gizli");
  });
});
