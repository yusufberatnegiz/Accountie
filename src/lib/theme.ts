export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tema";
/** Matches --ground in globals.css; the browser bar takes this colour. */
export const THEME_COLOR = { light: "#f2f4f7", dark: "#0e1114" } as const;

/**
 * Runs in <head> before first paint (layout.tsx): applies a saved manual choice so the page never flashes.
 * "System" is the absence of data-theme; data-look then follows prefers-color-scheme.
 * Constant string, no user data: safe as an inline script under the current CSP ('unsafe-inline').
 */
/** Class that switches every transition off (globals.css) for the frame the colours change in. */
export const FREEZE_CLASS = "tema-degisiyor";
/**
 * data-look on <html> is what is shown ("light" | "dark") and is what the dark tokens key on, so an OS theme flip
 * changes colours in the same task as the freeze class: no frame ever starts a colour transition (the media query
 * alone would switch the colours a frame before the change event could freeze them). Without JS the media query still works.
 */
const LOOK = `var r=document.documentElement,q=matchMedia("(prefers-color-scheme: dark)");r.dataset.look=r.dataset.theme||(q.matches?"dark":"light");q.addEventListener("change",function(){if(r.dataset.theme)return;r.classList.add("${FREEZE_CLASS}");r.dataset.look=q.matches?"dark":"light";getComputedStyle(r).color;requestAnimationFrame(function(){requestAnimationFrame(function(){r.classList.remove("${FREEZE_CLASS}")})})})`;

export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.dataset.media=m.media;m.dataset.content=m.content;m.media="";m.content=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}"})})}}catch(e){}try{${LOOK}}catch(e){}`;
