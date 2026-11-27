"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  LOAD_ERROR_MESSAGE,
  booksReducer,
  canStartSave,
  initialBooksState,
  updateAnnouncement,
} from "@rct/shared";
import { api } from "./api";

export function useBooks() {
  const [state, dispatch] = useReducer(booksReducer, initialBooksState);
  // Mirror of state for synchronous duplicate-click checks between renders.
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

  const setRead = useCallback(async (bookId: string, read: boolean) => {
    if (inFlight.current.has(bookId) || !canStartSave(stateRef.current, bookId)) return;
    inFlight.current.add(bookId);
    dispatch({ type: "save/start", bookId, read });
    try {
      const response = await api.setRead(bookId, read);
      dispatch({
        type: "save/success",
        response,
        announcement: updateAnnouncement(response),
      });
    } catch {
      dispatch({ type: "save/failure", bookId, read });
    } finally {
      inFlight.current.delete(bookId);
    }
  }, []);

  return { state, load, setRead };
}
