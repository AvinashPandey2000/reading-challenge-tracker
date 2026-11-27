"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_READER_PREFS,
  localDay,
  type BookDetails,
  type Bookmark,
  type Highlight,
  type HighlightColor,
  type Note,
  type Page,
  type ReaderPrefs,
} from "@rct/shared";
import { api } from "./api";

/** Reading time counts only while the page is visible and the reader interacted recently. */
export const IDLE_AFTER_MS = 2 * 60 * 1000;
export const FLUSH_EVERY_MS = 15 * 1000;

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

export function useReader(bookId: string, initialPage: number | null) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [details, setDetails] = useState<BookDetails | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_READER_PREFS);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cache = useRef(new Map<number, Page>());
  const pageRef = useRef(0);
  const seconds = useRef(0);
  const lastInteraction = useRef(0);

  const fetchPage = useCallback(
    async (n: number) => {
      const hit = cache.current.get(n);
      if (hit) return hit;
      const p = await api.getPage(bookId, n);
      cache.current.set(n, p);
      return p;
    },
    [bookId],
  );

  /** Saves the current page plus reading time since the last save. */
  const flush = useCallback(
    async (opts?: { keepalive?: boolean }) => {
      const n = pageRef.current;
      if (!n) return;
      const delta = Math.round(seconds.current);
      seconds.current -= delta;
      try {
        const res = await api.saveProgress(bookId, { page: n, secondsDelta: delta, day: localDay() }, opts);
        setDetails((d) => (d ? { ...d, book: { ...d.book, progress: res.progress } } : d));
        if (res.justCompleted) setFinished(true);
      } catch {
        seconds.current += delta; // keep the time for the next save
        setMessage("Couldn't save your place. We'll try again on the next page.");
      }
    },
    [bookId],
  );

  const goTo = useCallback(
    async (n: number) => {
      const total = details?.book.progress.totalPages ?? 0;
      if (n < 1 || (total && n > total)) return;
      lastInteraction.current = Date.now();
      setPageError(null);
      try {
        const p = await fetchPage(n);
        pageRef.current = n;
        setPage(p);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("page", String(n));
          window.history.replaceState(null, "", url);
          window.scrollTo({ top: 0 });
        }
        void flush();
        if (n < p.totalPages) void fetchPage(n + 1).catch(() => undefined); // prefetch
      } catch (err) {
        setPageError((err as Error).message || "Couldn't load this page. Try again.");
      }
    },
    [details, fetchPage, flush],
  );

  // Initial load: details, preferences, annotations, then the starting page.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [d, pr, hl, bm, nt] = await Promise.all([
          api.getDetails(bookId),
          api.getPreferences(),
          api.listHighlights(bookId),
          api.listBookmarks(bookId),
          api.listNotes(bookId),
        ]);
        if (!alive) return;
        if (!d.book.readable) {
          setLoad({ status: "error", message: `${d.book.title} isn't available to read here.` });
          return;
        }
        setDetails(d);
        setPrefs(pr);
        setHighlights(hl);
        setBookmarks(bm);
        setNotes(nt);
        const total = d.book.progress.totalPages;
        const start = Math.min(Math.max(1, initialPage ?? (d.book.progress.currentPage || 1)), total);
        const p = await fetchPage(start);
        if (!alive) return;
        pageRef.current = start;
        setPage(p);
        setLoad({ status: "ready" });
        lastInteraction.current = Date.now();
        void flush();
        if (start < total) void fetchPage(start + 1).catch(() => undefined);
      } catch (err) {
        if (alive) setLoad({ status: "error", message: (err as Error).message || "Couldn't open this book." });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per book
  }, [bookId]);

  // Reading-time tracking
  useEffect(() => {
    if (load.status !== "ready") return;
    const mark = () => (lastInteraction.current = Date.now());
    const events = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    let last = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastInteraction.current < IDLE_AFTER_MS) seconds.current += (now - last) / 1000;
      last = now;
    }, 1000);
    const flusher = setInterval(() => {
      if (seconds.current >= 1) void flush();
    }, FLUSH_EVERY_MS);
    const onHide = () => {
      if (seconds.current >= 1) void flush({ keepalive: true });
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(tick);
      clearInterval(flusher);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [load.status, flush]);

  const updatePrefs = useCallback(
    async (patch: Partial<ReaderPrefs>) => {
      const before = prefs;
      const next = { ...prefs, ...patch };
      setPrefs(next); // optimistic
      try {
        setPrefs(await api.savePreferences(next));
      } catch {
        setPrefs(before);
        setMessage("Couldn't save your reading settings. Try again.");
      }
    },
    [prefs],
  );

  const currentBookmark = page ? bookmarks.find((b) => b.page === page.page) : undefined;
  const toggleBookmark = useCallback(async () => {
    if (!page) return;
    try {
      if (currentBookmark) {
        await api.deleteBookmark(currentBookmark.id);
        setBookmarks((bs) => bs.filter((b) => b.id !== currentBookmark.id));
        setMessage(`Removed bookmark on page ${page.page}.`);
      } else {
        const b = await api.addBookmark(bookId, page.page);
        setBookmarks((bs) => [...bs, b].sort((x, y) => x.page - y.page));
        setMessage(`Bookmarked page ${page.page}.`);
      }
    } catch {
      setMessage("Couldn't update the bookmark. Try again.");
    }
  }, [bookId, currentBookmark, page]);

  const highlightFor = useCallback((n: number, paragraph: number) => highlights.find((h) => h.page === n && h.paragraph === paragraph), [highlights]);

  const setHighlight = useCallback(
    async (paragraph: number, color: HighlightColor, note?: string | null) => {
      if (!page) return;
      try {
        const h = await api.addHighlight(bookId, { page: page.page, paragraph, color, ...(note !== undefined ? { note } : {}) });
        setHighlights((hs) => [...hs.filter((x) => x.id !== h.id), h].sort((a, b) => a.page - b.page || a.paragraph - b.paragraph));
      } catch {
        setMessage("Couldn't save the highlight. Try again.");
      }
    },
    [bookId, page],
  );
  const saveHighlightNote = useCallback(async (id: number, note: string | null) => {
    try {
      const h = await api.updateHighlight(id, { note });
      setHighlights((hs) => hs.map((x) => (x.id === id ? h : x)));
      setMessage(note ? "Note saved." : "Note removed.");
    } catch {
      setMessage("Couldn't save the note. Try again.");
    }
  }, []);
  const removeHighlight = useCallback(async (id: number) => {
    try {
      await api.deleteHighlight(id);
      setHighlights((hs) => hs.filter((x) => x.id !== id));
    } catch {
      setMessage("Couldn't remove the highlight. Try again.");
    }
  }, []);

  const addNote = useCallback(
    async (text: string) => {
      try {
        const n = await api.addNote(bookId, text, page?.page ?? null);
        setNotes((ns) => [n, ...ns]);
        setMessage("Note saved.");
      } catch {
        setMessage("Couldn't save your note. Try again.");
      }
    },
    [bookId, page],
  );
  const deleteNote = useCallback(async (id: number) => {
    try {
      await api.deleteNote(id);
      setNotes((ns) => ns.filter((n) => n.id !== id));
    } catch {
      setMessage("Couldn't delete the note. Try again.");
    }
  }, []);
  const deleteBookmark = useCallback(async (id: number) => {
    try {
      await api.deleteBookmark(id);
      setBookmarks((bs) => bs.filter((b) => b.id !== id));
    } catch {
      setMessage("Couldn't remove the bookmark. Try again.");
    }
  }, []);

  return {
    load,
    details,
    page,
    pageError,
    prefs,
    highlights,
    bookmarks,
    notes,
    finished,
    message,
    setMessage,
    dismissFinished: () => setFinished(false),
    goTo,
    retryPage: () => page && goTo(page.page),
    updatePrefs,
    isBookmarked: !!currentBookmark,
    toggleBookmark,
    highlightFor,
    setHighlight,
    saveHighlightNote,
    removeHighlight,
    addNote,
    deleteNote,
    deleteBookmark,
  };
}
