import { useCallback, useEffect, useReducer, useRef } from "react";
import { AccessibilityInfo } from "react-native";
import { LOAD_ERROR_MESSAGE, booksReducer, canStartSave, initialBooksState, savedAnnouncement } from "@rct/shared";
import { api } from "./api";

/** Same state machine as the web client (packages/shared/src/bookState.ts). */
export function useBooks() {
  const [state, dispatch] = useReducer(booksReducer, initialBooksState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const inFlight = useRef(new Set<string>());

  const load = useCallback(async () => {
    dispatch({ type: "load/start" });
    try {
      const { lists } = await api.getBooks();
      dispatch({ type: "load/success", lists });
    } catch {
      dispatch({ type: "load/failure", message: LOAD_ERROR_MESSAGE });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state.announcement) AccessibilityInfo.announceForAccessibility(state.announcement);
  }, [state.announcement]);

  const setRead = useCallback(async (bookId: string, read: boolean) => {
    if (inFlight.current.has(bookId) || !canStartSave(stateRef.current, bookId)) return;
    inFlight.current.add(bookId);
    dispatch({ type: "save/start", bookId, read });
    try {
      const response = await api.setRead(bookId, read);
      dispatch({
        type: "save/success",
        response,
        announcement: savedAnnouncement(response.book.title, response.book.read, response.list.title, response.list.readCount, response.list.total),
      });
    } catch {
      dispatch({ type: "save/failure", bookId, read });
    } finally {
      inFlight.current.delete(bookId);
    }
  }, []);

  return { state, load, setRead };
}
