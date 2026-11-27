"use client";

import { useCallback, useEffect, useState } from "react";
import { localDay, type BookDetails, type Bookmark, type Highlight, type Note } from "@rct/shared";
import { api } from "./api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; details: BookDetails; bookmarks: Bookmark[]; highlights: Highlight[]; notes: Note[] };

export function useBookDetails(bookId: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [details, bookmarks, highlights, notes] = await Promise.all([
        api.getDetails(bookId),
        api.listBookmarks(bookId),
        api.listHighlights(bookId),
        api.listNotes(bookId),
      ]);
      setState({ status: "ready", details, bookmarks, highlights, notes });
    } catch (err) {
      const notFound = (err as { status?: number }).status === 404;
      setState({ status: "error", notFound, message: notFound ? "We couldn't find that book." : "Couldn't load this book. Check your connection and try again." });
    }
  }, [bookId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  /** Runs an action, then reloads; returns an error message or null. */
  const act = useCallback(
    async (fn: () => Promise<unknown>, failure: string): Promise<string | null> => {
      setBusy(true);
      try {
        await fn();
        await load();
        return null;
      } catch (err) {
        return (err as Error).message && (err as { code?: string }).code !== "NETWORK" ? `${failure} ${(err as Error).message}` : failure;
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  return {
    state,
    busy,
    reload: load,
    markRead: (read: boolean) => act(() => api.setRead(bookId, read), read ? "Couldn't mark it as read." : "Couldn't mark it as unread."),
    reset: () => act(() => api.resetProgress(bookId), "Couldn't reset your progress."),
    setPage: (page: number) => act(() => api.saveProgress(bookId, { page, day: localDay() }), "Couldn't save your page."),
    addNote: (text: string) => act(() => api.addNote(bookId, text), "Couldn't save your note."),
    deleteNote: (id: number) => act(() => api.deleteNote(id), "Couldn't delete the note."),
    deleteBookmark: (id: number) => act(() => api.deleteBookmark(id), "Couldn't remove the bookmark."),
    addBookmark: (page: number) => act(() => api.addBookmark(bookId, page), "Couldn't add the bookmark."),
    deleteHighlight: (id: number) => act(() => api.deleteHighlight(id), "Couldn't remove the highlight."),
  };
}
