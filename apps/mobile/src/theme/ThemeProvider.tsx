import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type Colors } from "./colors";

export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "rct.theme";

interface ThemeValue {
  colors: Colors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** False until the saved preference has been read (the splash stays up until then). */
  ready: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/** Follows the OS appearance by default; a manual choice is saved in AsyncStorage. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => {
        if (alive && (v === "light" || v === "dark")) setPref(v);
      })
      .catch(() => undefined)
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    void (p === "system" ? AsyncStorage.removeItem(THEME_KEY) : AsyncStorage.setItem(THEME_KEY, p)).catch(() => undefined);
  }, []);

  const scheme: "light" | "dark" = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const value = useMemo(
    () => ({ colors: scheme === "dark" ? darkColors : lightColors, scheme, preference, setPreference, ready }),
    [scheme, preference, setPreference, ready],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  // Outside a provider (e.g. isolated component tests) fall back to the light palette.
  return ctx ?? { colors: lightColors, scheme: "light", preference: "system", setPreference: () => undefined, ready: true };
}

/** Memoised StyleSheet factory keyed on the current palette. */
export function useThemedStyles<T>(factory: (c: Colors) => T): T {
  const { colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- factory is a module-level function
  return useMemo(() => factory(colors), [colors]);
}
