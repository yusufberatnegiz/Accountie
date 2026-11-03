export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tema";
/** Matches --ground in globals.css; the browser bar takes this colour. */
export const THEME_COLOR = { light: "#f2f4f7", dark: "#0e1114" } as const;

/**
 * Runs in <head> before first paint (layout.tsx): applies a saved manual choice so the page never flashes.
 * "System" is the absence of data-theme; CSS then follows prefers-color-scheme on its own.
 * Constant string, no user data: safe as an inline script under the current CSP ('unsafe-inline').
 */
/** Class that switches every transition off (globals.css) for the frame the colours change in. */
export const FREEZE_CLASS = "tema-degisiyor";
// Also run when the OS theme flips while "system" is chosen: the media query changes colours without applyTheme.
const FREEZE = `var r=document.documentElement;r.classList.add("${FREEZE_CLASS}");getComputedStyle(r).color;requestAnimationFrame(function(){requestAnimationFrame(function(){r.classList.remove("${FREEZE_CLASS}")})})`;

export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.dataset.media=m.media;m.dataset.content=m.content;m.media="";m.content=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}"})})}}catch(e){}try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){${FREEZE}})}catch(e){}`;
