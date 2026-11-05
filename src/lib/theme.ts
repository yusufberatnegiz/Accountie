export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tema";
/** Matches --ground in globals.css; the browser bar takes this colour. */
export const THEME_COLOR = { light: "#f3f2ef", dark: "#0e0d0b" } as const;

/**
 * Runs in <head> before first paint (layout.tsx): applies a saved manual choice so the page never flashes.
 * "System" is the absence of data-theme; data-look then follows prefers-color-scheme.
 * Constant string, no user data: allowed by hash under the panel CSP (src/lib/csp.ts), so any edit stays covered.
 */
/** Class that switches every transition off (globals.css) for the frame the colours change in. */
export const FREEZE_CLASS = "tema-degisiyor";
/**
 * data-look on <html> is what is shown ("light" | "dark") and is what the dark tokens key on, so an OS theme flip
 * changes colours in the same task as the freeze class: no frame ever starts a colour transition (the media query
 * alone would switch the colours a frame before the change event could freeze them). Without JS the media query still works.
 * The browser bar colour is one theme-color meta that this script creates and applyTheme updates, set to the shown look.
 * React must not render it: React matches a hoisted <meta> by its content on hydration, so once the script had changed
 * the colour React inserted a second, stale copy (the duplicates viewport.themeColor and a JSX meta both produced).
 * Without JS the bar keeps the browser's own colour.
 */
const LOOK = `var r=document.documentElement,q=matchMedia("(prefers-color-scheme: dark)"),b=function(){var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=r.dataset.look==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}"};r.dataset.look=r.dataset.theme||(q.matches?"dark":"light");b();q.addEventListener("change",function(){if(r.dataset.theme)return;r.classList.add("${FREEZE_CLASS}");r.dataset.look=q.matches?"dark":"light";b();requestAnimationFrame(function(){requestAnimationFrame(function(){r.classList.remove("${FREEZE_CLASS}")})})})`;

export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}try{${LOOK}}catch(e){}`;
