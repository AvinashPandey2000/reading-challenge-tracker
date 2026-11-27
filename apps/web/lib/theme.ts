"use client";

import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";
import { THEME_STORAGE_KEY } from "./themeScript";
export { THEME_STORAGE_KEY };

const listeners = new Set<() => void>();

function read(): ThemePreference {
  const v = document.documentElement.dataset.theme;
  return v === "light" || v === "dark" ? v : "system";
}

export function setThemePreference(pref: ThemePreference) {
  document.documentElement.dataset.theme = pref;
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable (private mode): the choice lasts for this page view */
  }
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "system",
  );
}
