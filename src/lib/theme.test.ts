import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT } from "./theme";

// Runs the inline <head> script against a minimal fake document.
function run(saved: string | null, throws = false) {
  const dataset: Record<string, string> = {};
  const meta = { media: "(prefers-color-scheme: light)", content: "#f2f4f7", dataset: {} as Record<string, string> };
  let onReady: (() => void) | undefined;
  const localStorage = { getItem: () => { if (throws) throw new Error("blocked"); return saved; } };
  const document = {
    documentElement: { dataset },
    addEventListener: (_: string, fn: () => void) => { onReady = fn; },
    querySelectorAll: () => [meta],
  };
  new Function("localStorage", "document", THEME_INIT_SCRIPT)(localStorage, document);
  onReady?.();
  return { theme: dataset.theme, meta };
}

describe("theme init script", () => {
  it("applies a saved manual choice and the matching browser bar colour", () => {
    const r = run("dark");
    expect(r.theme).toBe("dark");
    expect(r.meta).toMatchObject({ media: "", content: "#0e1114" });
  });
  it("leaves system preference alone when nothing or junk is saved", () => {
    expect(run(null).theme).toBeUndefined();
    expect(run("purple").theme).toBeUndefined();
    expect(run(null).meta.media).toBe("(prefers-color-scheme: light)");
  });
  it("switches transitions off for the frame an OS theme change lands in", () => {
    const classes = new Set<string>();
    let onChange: (() => void) | undefined;
    const frames: (() => void)[] = [];
    const document = {
      documentElement: { dataset: {}, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } },
      addEventListener: () => {},
      querySelectorAll: () => [],
    };
    const matchMedia = () => ({ addEventListener: (_: string, fn: () => void) => { onChange = fn; } });
    new Function("localStorage", "document", "matchMedia", "getComputedStyle", "requestAnimationFrame", THEME_INIT_SCRIPT)(
      { getItem: () => null }, document, matchMedia, () => ({}), (fn: () => void) => frames.push(fn));
    onChange?.();
    expect(classes.has("tema-degisiyor")).toBe(true);
    while (frames.length) frames.shift()!();
    expect(classes.size).toBe(0);
  });
  it("survives blocked storage", () => {
    expect(run(null, true).theme).toBeUndefined();
  });
});
