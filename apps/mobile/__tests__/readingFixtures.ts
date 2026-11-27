import { DEFAULT_READER_PREFS, type LibraryBook, type Stats } from "@rct/shared";
import { json } from "./helpers";

const progress = (over: Partial<LibraryBook["progress"]> = {}): LibraryBook["progress"] => ({
  status: "not_started", currentPage: 0, furthestPage: 0, totalPages: 10, percent: 0, secondsRead: 0, startedAt: null, lastReadAt: null, completedAt: null, ...over,
});
const cover = { background: "#333", accent: "#eee", ink: "#fff", motif: "leaf" as const };
export const book = (id: string, title: string, over: Partial<LibraryBook> = {}): LibraryBook => ({
  id, title, author: "Some Author", category: "Fantasy", year: 1900, summary: `${title} summary`, description: `${title} description`,
  listId: null, readable: true, pagesApprox: false, contentNote: null, cover, progress: progress(), ...over,
});
export const libraryBooks = (): LibraryBook[] => [
  book("alice", "Alice's Adventures in Wonderland", { author: "Lewis Carroll" }),
  book("walden", "Walden", { category: "Essays", progress: progress({ status: "reading", currentPage: 3, furthestPage: 3, percent: 30, lastReadAt: new Date().toISOString() }) }),
  book("the-hobbit", "The Hobbit", { readable: false, pagesApprox: true, listId: "fiction", progress: progress({ status: "completed", percent: 100, totalPages: 310 }) }),
];
export const stats = (): Stats => ({
  totalBooks: 3, reading: 1, completed: 1, notStarted: 1, pagesRead: 313, secondsRead: 600, streak: 2,
  goal: { period: "daily", targetMinutes: 15, minutesDone: 10, percent: 67, met: false },
  continueReading: ["walden"], recentlyRead: ["walden"],
});

/** Routes for the reading API (paths without origin), with a mutable Walden state. */
export function readingRoutes() {
  let walden = libraryBooks()[1]!;
  const calls: { method: string; path: string; body: unknown }[] = [];
  const record = (method: string, path: string, init?: RequestInit) => calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
  const routes: Record<string, (p: string, i?: RequestInit) => Response> = {
    "GET /api/library": () => json({ books: [libraryBooks()[0], walden, libraryBooks()[2]] }),
    "GET /api/reader/preferences": () => json(DEFAULT_READER_PREFS),
    "PUT /api/reader/preferences": (p, i) => (record("PUT", p, i), json(JSON.parse(String(i!.body)))),
    "GET /api/books/walden/details": () => json({ book: walden, chapters: [{ title: "Chapter I", startPage: 1 }], counts: { bookmarks: 0, highlights: 0, notes: 0 } }),
    "GET /api/books/walden/bookmarks": () => json({ bookmarks: [] }),
    "GET /api/books/walden/highlights": () => json({ highlights: [] }),
    "GET /api/books/walden/notes": () => json({ notes: [] }),
    "PATCH /api/books/walden": (p, i) => {
      record("PATCH", p, i);
      walden = { ...walden, progress: { ...walden.progress, status: "completed", percent: 100 } };
      return json({ book: { id: "walden", listId: null, title: "Walden", author: "x", read: true, updatedAt: "now" }, list: null });
    },
    "PUT /api/books/walden/progress": (p, i) => {
      record("PUT", p, i);
      const b = JSON.parse(String(i!.body));
      walden = { ...walden, progress: { ...walden.progress, currentPage: b.page, furthestPage: Math.max(walden.progress.furthestPage, b.page) } };
      return json({ progress: walden.progress, justCompleted: b.page === 10 });
    },
    "POST /api/books/walden/highlights": (p, i) => {
      record("POST", p, i);
      const b = JSON.parse(String(i!.body));
      return json({ id: 9, bookId: "walden", page: b.page, paragraph: b.paragraph, color: b.color, note: b.note ?? null, excerpt: "x", createdAt: "now", updatedAt: "now" }, 201);
    },
  };
  for (let n = 1; n <= 10; n++)
    routes[`GET /api/books/walden/pages/${n}`] = () => json({ bookId: "walden", page: n, totalPages: 10, chapterTitle: "Chapter I", paragraphs: [`Page ${n} first paragraph.`, `Page ${n} second paragraph.`] });
  return { routes, calls };
}
