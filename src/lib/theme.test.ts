import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT } from "./theme";

// Runs the inline <head> script against a minimal fake document.
function run(saved: string | null, throws = false, systemDark = false) {
  const dataset: Record<string, string> = {};
  const head: { name?: string; content?: string }[] = [];
  const localStorage = { getItem: () => { if (throws) throw new Error("blocked"); return saved; } };
  const document = {
    documentElement: { dataset },
    head: { appendChild: (m: (typeof head)[number]) => head.push(m) },
    createElement: () => ({}),
    querySelector: () => head[0] ?? null,
  };
  const matchMedia = () => ({ matches: systemDark, addEventListener: () => {} });
  new Function("localStorage", "document", "matchMedia", THEME_INIT_SCRIPT)(localStorage, document, matchMedia);
  return { theme: dataset.theme, look: dataset.look, head };
}

describe("theme init script", () => {
  it("applies a saved manual choice and the matching browser bar colour", () => {
    const r = run("dark");
    expect(r.theme).toBe("dark");
    expect(r.look).toBe("dark");
    expect(r.head).toEqual([{ name: "theme-color", content: "#0c0c0b" }]);
  });
  it("a saved choice wins over the system look, in one meta", () => {
    const r = run("light", false, true);
    expect(r.head).toEqual([{ name: "theme-color", content: "#f3f2ef" }]);
  });
  it("leaves system preference alone when nothing or junk is saved", () => {
    expect(run(null).theme).toBeUndefined();
    expect(run("purple").theme).toBeUndefined();
    expect(run(null, false, true).head).toEqual([{ name: "theme-color", content: "#0c0c0b" }]);
  });
  it("switches transitions off for the frame an OS theme change lands in", () => {
    const classes = new Set<string>();
    let onChange: (() => void) | undefined;
    const frames: (() => void)[] = [];
    const document = {
      documentElement: { dataset: {}, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } },
      addEventListener: () => {},
      querySelector: () => ({}),
    };
    const mq = { matches: false, addEventListener: (_: string, fn: () => void) => { onChange = fn; } };
    const matchMedia = () => mq;
    new Function("localStorage", "document", "matchMedia", "getComputedStyle", "requestAnimationFrame", THEME_INIT_SCRIPT)(
      { getItem: () => null }, document, matchMedia, () => ({}), (fn: () => void) => frames.push(fn));
    expect(document.documentElement.dataset).toMatchObject({ look: "light" });
    mq.matches = true;
    onChange?.();
    // Colours and the freeze change in the same task, so no colour transition can start.
    expect(document.documentElement.dataset).toMatchObject({ look: "dark" });
    expect(classes.has("tema-degisiyor")).toBe(true);
    while (frames.length) frames.shift()!();
    expect(classes.size).toBe(0);
  });
  it("survives blocked storage", () => {
    expect(run(null, true).theme).toBeUndefined();
  });
});

describe("theme button", () => {
  it("always flips what is shown, and falls back to system when the target is the system look", async () => {
    const { nextChoice } = await import("@/components/ThemeSwitch");
    expect(nextChoice("light", false)).toBe("dark");
    expect(nextChoice("dark", false)).toBe("system");
    expect(nextChoice("dark", true)).toBe("light");
    expect(nextChoice("light", true)).toBe("system");
  });
});
