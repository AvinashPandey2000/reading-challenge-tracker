import { DEFAULT_READER_PREFS, type BookDetails, type LibraryBook, type Page, type Stats } from "@rct/shared";

const progress = (over: Partial<LibraryBook["progress"]> = {}): LibraryBook["progress"] => ({
  status: "not_started",
  currentPage: 0,
  furthestPage: 0,
  totalPages: 10,
  percent: 0,
  secondsRead: 0,
  startedAt: null,
  lastReadAt: null,
  completedAt: null,
  ...over,
});
const cover = { background: "#333", accent: "#eee", ink: "#fff", motif: "leaf" as const };

export const book = (id: string, title: string, over: Partial<LibraryBook> = {}): LibraryBook => ({
  id,
  title,
  author: "Some Author",
  category: "Fantasy",
  year: 1900,
  summary: `${title} summary`,
  description: `${title} description`,
  listId: null,
  readable: true,
  pagesApprox: false,
  contentNote: null,
  cover,
  progress: progress(),
  ...over,
});

export const libraryBooks = (): LibraryBook[] => [
  book("alice", "Alice's Adventures in Wonderland", { author: "Lewis Carroll" }),
  book("walden", "Walden", { category: "Essays", progress: progress({ status: "reading", currentPage: 3, furthestPage: 3, percent: 30, lastReadAt: new Date().toISOString() }) }),
  book("the-hobbit", "The Hobbit", { readable: false, pagesApprox: true, listId: "fiction", progress: progress({ status: "completed", percent: 100, totalPages: 310 }) }),
];

export const stats = (over: Partial<Stats> = {}): Stats => ({
  totalBooks: 3,
  reading: 1,
  completed: 1,
  notStarted: 1,
  pagesRead: 313,
  secondsRead: 600,
  streak: 2,
  goal: { period: "daily", targetMinutes: 15, minutesDone: 10, percent: 67, met: false },
  continueReading: ["walden"],
  recentlyRead: ["walden"],
  ...over,
});

export const details = (b: LibraryBook): BookDetails => ({
  book: b,
  chapters: [{ title: "Chapter I", startPage: 1 }],
  counts: { bookmarks: 0, highlights: 0, notes: 0 },
});

export const page = (n: number, total = 10): Page => ({
  bookId: "walden",
  page: n,
  totalPages: total,
  chapterTitle: "Chapter I",
  paragraphs: [`Page ${n} first paragraph.`, `Page ${n} second paragraph.`],
});

export { DEFAULT_READER_PREFS };
