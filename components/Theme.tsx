"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./Icons";
import { useHydrated } from "@/lib/storage";

export const THEME_KEY = "lmg.theme";

type Theme = "light" | "dark";

/**
 * Laeuft vor dem ersten Paint im <head> und setzt data-theme, damit
 * beim Laden im dunklen Raum nichts weiss aufblitzt.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

/* Das Theme steht im DOM-Attribut. Der Cache haelt den Wert fuer
   React stabil; geaendert wird er nur ueber setTheme. */
let cached: Theme | null = null;
const listeners = new Set<() => void>();

function getTheme(): Theme {
  if (cached === null) {
    cached =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
  }
  return cached;
}

function setTheme(next: Theme) {
  cached = next;
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* privater Modus */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  const hydrated = useHydrated();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
      title={theme === "dark" ? "Helles Design" : "Dunkles Design"}
      aria-label={theme === "dark" ? "Helles Design" : "Dunkles Design"}
    >
      {hydrated ? (
        <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
      ) : (
        <span className="size-[19px]" />
      )}
    </button>
  );
}
