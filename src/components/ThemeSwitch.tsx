"use client";

import { useId, useSyncExternalStore, type ReactNode } from "react";
import { FREEZE_CLASS, THEME_COLOR, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

export const THEME_EVENT = "accountie-theme";
const EVENT = THEME_EVENT;
const DARK_QUERY = "(prefers-color-scheme: dark)";

function read(): ThemeChoice {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

/** The browser bar colour: the one theme-color meta the head script owns (theme.ts), set to the shown look. */
function syncThemeColor(look: "light" | "dark") {
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!m) {
    m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
  }
  m.content = THEME_COLOR[look];
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  // No colour fades: inputs and buttons would sit unreadable mid-way for 180ms (YON 6.2).
  root.classList.add(FREEZE_CLASS);
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  const look = choice === "system" ? (matchMedia(DARK_QUERY).matches ? "dark" : "light") : choice;
  root.dataset.look = look;
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private mode or blocked storage: the choice still applies for this page.
  }
  syncThemeColor(look);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove(FREEZE_CLASS)));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

const OPTIONS: { value: ThemeChoice; label: string; short: string; icon: ReactNode }[] = [
  { value: "system", label: "Sistem teması", short: "Sistem", icon: <><rect x="2.5" y="3" width="11" height="7.5" rx="1" /><path d="M6 13.5h4M8 10.5v3" /></> },
  { value: "light", label: "Açık tema", short: "Açık", icon: <><circle cx="8" cy="8" r="2.75" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></> },
  { value: "dark", label: "Koyu tema", short: "Koyu", icon: <path d="M13 9.6A5.5 5.5 0 0 1 6.4 3a5.5 5.5 0 1 0 6.6 6.6z" /> },
];

/** Sistem / Açık / Koyu as a native radiogroup: arrow keys, labels and focus come from the platform. */
/** `labelled` adds the option names beside the icons (settings screen). */
export function ThemeSwitch({ labelled = false }: { labelled?: boolean }) {
  const name = useId();
  // Server snapshot is "system": the radios settle on the saved choice right after hydration, the colours never wait.
  const current = useSyncExternalStore(subscribe, read, () => "system" as ThemeChoice);
  return (
    <fieldset className={labelled ? "theme-switch theme-switch-labelled" : "theme-switch"} role="radiogroup" aria-label="Tema">
      {OPTIONS.map((o) => (
        <label key={o.value} title={o.label} data-choice={o.value}>
          <input type="radio" name={name} value={o.value} checked={current === o.value} onChange={() => applyTheme(o.value)} aria-label={o.label} />
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">{o.icon}</svg>
          {labelled ? <span aria-hidden="true">{o.short}</span> : null}
        </label>
      ))}
    </fieldset>
  );
}

type Look = "light" | "dark";

/** What the visitor sees right now: the manual choice, or the system preference under "system". */
function readLook(): Look {
  const d = document.documentElement.dataset;
  return (d.theme ?? d.look) === "dark" ? "dark" : "light";
}

function subscribeLook(onChange: () => void) {
  const mq = matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  window.addEventListener(EVENT, onChange);
  return () => { mq.removeEventListener("change", onChange); window.removeEventListener(EVENT, onChange); };
}

/** The look a press leads to; matching the system preference stores nothing, so the page follows the system again. */
export function nextChoice(look: Look, systemDark: boolean): ThemeChoice {
  const target: Look = look === "dark" ? "light" : "dark";
  return (target === "dark") === systemDark ? "system" : target;
}

/** One button for narrow bars: every press visibly flips the theme (a three-step cycle had a press that changed nothing). */
/** Both icons are in the server HTML and CSS shows the one for <html data-look> (globals.css), so the first paint is right. */
/** The label waits for hydration: the server cannot know the look, and a wrong spoken theme is worse than a neutral name. */
export function ThemeCycle() {
  const look = useSyncExternalStore(subscribeLook, readLook, () => null);
  const label = look === null ? "Temayı değiştir" : look === "dark" ? "Tema: Koyu. Açık temaya geç" : "Tema: Açık. Koyu temaya geç";
  return (
    <button type="button" className="theme-cycle" onClick={() => applyTheme(nextChoice(readLook(), matchMedia(DARK_QUERY).matches))} aria-label={label}>
      {OPTIONS.filter((x) => x.value !== "system").map((x) => (
        <svg key={x.value} className={`theme-cycle-${x.value}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">{x.icon}</svg>
      ))}
    </button>
  );
}
