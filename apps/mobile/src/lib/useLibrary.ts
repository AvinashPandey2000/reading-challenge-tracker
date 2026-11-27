/** Same data logic as apps/web/lib/useLibrary.ts (shared API client, identical behaviour). */
import { useCallback, useEffect, useState } from "react";
import { localDay, type LibraryBook, type ReaderPrefs, type Stats } from "@rct/shared";
import { api } from "./api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; books: LibraryBook[]; stats: Stats; prefs: ReaderPrefs };

/** Library + stats + preferences, always fetched fresh (no-store). */
export function useLibrary() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const [{ books }, stats, prefs] = await Promise.all([api.getLibrary(), api.getStats(localDay()), api.getPreferences()]);
      setState({ status: "ready", books, stats, prefs });
    } catch {
      setState({ status: "error", message: "Couldn't load your library. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  const saveGoal = useCallback(
    async (goal: ReaderPrefs["goal"]) => {
      if (state.status !== "ready") return false;
      try {
        await api.savePreferences({ ...state.prefs, goal });
        const stats = await api.getStats(localDay());
        setState({ ...state, prefs: { ...state.prefs, goal }, stats });
        return true;
      } catch {
        return false;
      }
    },
    [state],
  );

  return { state, retry, refresh: load, saveGoal };
}
