import { z } from "zod";
import { ListIdSchema } from "./schemas.js";

/* ------------------------------------------------------------------ */
/* Status and progress                                                 */
/* ------------------------------------------------------------------ */

export const READING_STATUSES = ["not_started", "reading", "completed"] as const;
export const ReadingStatusSchema = z.enum(READING_STATUSES);
export type ReadingStatus = z.infer<typeof ReadingStatusSchema>;

export const STATUS_LABEL: Record<ReadingStatus, string> = {
  not_started: "Not Started",
  reading: "Currently Reading",
  completed: "Completed",
};

/** "Completed" is the same flag as the challenge checkbox (`read`). */
export function deriveStatus(read: boolean, furthestPage: number): ReadingStatus {
  if (read) return "completed";
  return furthestPage > 0 ? "reading" : "not_started";
}

export function progressPercent(status: ReadingStatus, furthestPage: number, totalPages: number): number {
  if (status === "completed") return 100;
  if (totalPages <= 0) return 0;
  return Math.min(100, Math.round((furthestPage / totalPages) * 100));
}

export const BookProgressSchema = z.object({
  status: ReadingStatusSchema,
  currentPage: z.number().int().nonnegative(),
  furthestPage: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  percent: z.number().min(0).max(100),
  secondsRead: z.number().int().nonnegative(),
  startedAt: z.string().nullable(),
  lastReadAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type BookProgress = z.infer<typeof BookProgressSchema>;

export const CoverThemeSchema = z.object({
  background: z.string(),
  accent: z.string(),
  ink: z.string(),
  motif: z.enum(["key", "leaf", "wave", "star", "sun", "rabbit", "boat", "moon", "orbit", "page"]),
});
export type CoverTheme = z.infer<typeof CoverThemeSchema>;

export const LibraryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  category: z.string(),
  year: z.number().int().nullable(),
  summary: z.string(),
  description: z.string(),
  listId: ListIdSchema.nullable(),
  /** Text can be read in the app (public domain, or a local demo text). */
  readable: z.boolean(),
  /** Page counts for books tracked by hand are approximate (typical print edition). */
  pagesApprox: z.boolean(),
  /** Set when the reader text is a local stand-in rather than this book. */
  contentNote: z.string().nullable(),
  cover: CoverThemeSchema,
  progress: BookProgressSchema,
});
export type LibraryBook = z.infer<typeof LibraryBookSchema>;

export const LibraryResponseSchema = z.object({ books: z.array(LibraryBookSchema) });
export type LibraryResponse = z.infer<typeof LibraryResponseSchema>;

export const ChapterSchema = z.object({ title: z.string(), startPage: z.number().int().positive() });
export type Chapter = z.infer<typeof ChapterSchema>;

export const BookDetailsSchema = z.object({
  book: LibraryBookSchema,
  chapters: z.array(ChapterSchema),
  counts: z.object({ bookmarks: z.number().int(), highlights: z.number().int(), notes: z.number().int() }),
});
export type BookDetails = z.infer<typeof BookDetailsSchema>;

export const PageSchema = z.object({
  bookId: z.string(),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive(),
  chapterTitle: z.string().nullable(),
  paragraphs: z.array(z.string()),
});
export type Page = z.infer<typeof PageSchema>;

/* ------------------------------------------------------------------ */
/* Request bodies                                                       */
/* ------------------------------------------------------------------ */

export const DaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "\"day\" must be a local date like 2026-11-27.");

export const SaveProgressBodySchema = z.strictObject({
  page: z.number({ error: "\"page\" must be a page number." }).int("\"page\" must be a whole number.").min(1, "\"page\" starts at 1."),
  /** Active reading time since the last save; the server caps it. */
  secondsDelta: z.number().int().min(0).max(3600).optional(),
  day: DaySchema,
});
export type SaveProgressBody = z.infer<typeof SaveProgressBodySchema>;

export const SaveProgressResponseSchema = z.object({
  progress: BookProgressSchema,
  justCompleted: z.boolean(),
});
export type SaveProgressResponse = z.infer<typeof SaveProgressResponseSchema>;

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export const HighlightColorSchema = z.enum(HIGHLIGHT_COLORS);
export type HighlightColor = z.infer<typeof HighlightColorSchema>;

export const BookmarkSchema = z.object({
  id: z.number().int(),
  bookId: z.string(),
  page: z.number().int().positive(),
  label: z.string(),
  createdAt: z.string(),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;
export const CreateBookmarkBodySchema = z.strictObject({
  page: z.number().int().min(1),
  label: z.string().trim().max(120).optional(),
});

export const HighlightSchema = z.object({
  id: z.number().int(),
  bookId: z.string(),
  page: z.number().int().positive(),
  paragraph: z.number().int().nonnegative(),
  color: HighlightColorSchema,
  note: z.string().nullable(),
  excerpt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Highlight = z.infer<typeof HighlightSchema>;
export const CreateHighlightBodySchema = z.strictObject({
  page: z.number().int().min(1),
  paragraph: z.number().int().min(0),
  color: HighlightColorSchema,
  note: z.string().trim().max(2000).nullable().optional(),
});
export const UpdateHighlightBodySchema = z
  .strictObject({ color: HighlightColorSchema.optional(), note: z.string().trim().max(2000).nullable().optional() })
  .refine((b) => b.color !== undefined || b.note !== undefined, "Send \"color\" or \"note\".");

export const NoteSchema = z.object({
  id: z.number().int(),
  bookId: z.string(),
  page: z.number().int().positive().nullable(),
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;
export const CreateNoteBodySchema = z.strictObject({
  text: z.string().trim().min(1, "Write something first.").max(2000),
  page: z.number().int().min(1).nullable().optional(),
});
export const UpdateNoteBodySchema = z.strictObject({ text: z.string().trim().min(1).max(2000) });

/* ------------------------------------------------------------------ */
/* Reader preferences                                                   */
/* ------------------------------------------------------------------ */

export const FONT_SIZES = { min: 14, max: 28, step: 2 } as const;
export const LINE_SPACINGS = [1.3, 1.5, 1.7, 2.0] as const;
export const FONT_FAMILIES = ["serif", "sans", "mono"] as const;
export const READER_THEMES = ["light", "dark", "sepia"] as const;
export const ALIGNMENTS = ["left", "justify"] as const;

/** Page colours for each reader theme (identical on web and mobile; contrast-checked). */
export const READER_PALETTE = {
  light: { background: "#FFFDF8", text: "#1D1B16", muted: "#5B5346", accent: "#A35400" },
  dark: { background: "#15130F", text: "#EDE6D8", muted: "#B9AE9C", accent: "#F2A541" },
  sepia: { background: "#F4E9D3", text: "#3B2F20", muted: "#6B5A43", accent: "#8A4A00" },
} as const;

/** Optional page tints that override the theme background (text colour follows the theme). */
export const READER_BACKGROUNDS = {
  theme: { label: "Theme default", light: null, dark: null, sepia: null },
  paper: { label: "Paper", light: "#FAF7F0", dark: "#1E1B16", sepia: "#F1E4CB" },
  sage: { label: "Sage", light: "#EEF3EA", dark: "#172019", sepia: "#E9E6CF" },
  mist: { label: "Mist", light: "#EEF1F5", dark: "#151A21", sepia: "#EDE3D2" },
} as const;
export type ReaderBackground = keyof typeof READER_BACKGROUNDS;

export const ReaderPrefsSchema = z.strictObject({
  fontSize: z.number().int().min(FONT_SIZES.min).max(FONT_SIZES.max),
  fontFamily: z.enum(FONT_FAMILIES),
  theme: z.enum(READER_THEMES),
  lineSpacing: z.union(LINE_SPACINGS.map((v) => z.literal(v)) as unknown as [z.ZodLiteral<1.3>, z.ZodLiteral<1.5>, z.ZodLiteral<1.7>, z.ZodLiteral<2>]),
  align: z.enum(ALIGNMENTS),
  background: z.enum(Object.keys(READER_BACKGROUNDS) as [ReaderBackground, ...ReaderBackground[]]),
  goal: z.strictObject({
    period: z.enum(["daily", "weekly"]),
    minutes: z.number().int().min(5).max(1000),
  }),
});
export type ReaderPrefs = z.infer<typeof ReaderPrefsSchema>;

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fontSize: 18,
  fontFamily: "serif",
  theme: "light",
  lineSpacing: 1.7,
  align: "left",
  background: "theme",
  goal: { period: "daily", minutes: 15 },
};

export function readerColors(prefs: Pick<ReaderPrefs, "theme" | "background">) {
  const base = READER_PALETTE[prefs.theme];
  const tint = READER_BACKGROUNDS[prefs.background][prefs.theme];
  return { ...base, background: tint ?? base.background };
}

/* ------------------------------------------------------------------ */
/* Stats, streak, goal                                                  */
/* ------------------------------------------------------------------ */

export const DailyActivitySchema = z.object({ day: z.string(), seconds: z.number().int(), pages: z.number().int() });
export type DailyActivity = z.infer<typeof DailyActivitySchema>;

export const StatsSchema = z.object({
  totalBooks: z.number().int(),
  reading: z.number().int(),
  completed: z.number().int(),
  notStarted: z.number().int(),
  pagesRead: z.number().int(),
  secondsRead: z.number().int(),
  streak: z.number().int(),
  goal: z.object({
    period: z.enum(["daily", "weekly"]),
    targetMinutes: z.number().int(),
    minutesDone: z.number().int(),
    percent: z.number(),
    met: z.boolean(),
  }),
  continueReading: z.array(z.string()),
  recentlyRead: z.array(z.string()),
});
export type Stats = z.infer<typeof StatsSchema>;

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Today's local date as YYYY-MM-DD (the device decides what "today" is). */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Consecutive days with reading activity, ending today — or yesterday, so the streak doesn't
 * reset in the morning before the reader has opened a book.
 */
export function computeStreak(activeDays: string[], today: string): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Monday of the ISO week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(day, -dow);
}

export function goalProgress(goal: ReaderPrefs["goal"], activity: DailyActivity[], today: string) {
  const from = goal.period === "daily" ? today : weekStart(today);
  const seconds = activity.filter((a) => a.day >= from && a.day <= today).reduce((n, a) => n + a.seconds, 0);
  const minutesDone = Math.floor(seconds / 60);
  const percent = Math.min(100, Math.round((minutesDone / goal.minutes) * 100));
  return { period: goal.period, targetMinutes: goal.minutes, minutesDone, percent, met: minutesDone >= goal.minutes };
}

/* ------------------------------------------------------------------ */
/* Library filtering and formatting                                     */
/* ------------------------------------------------------------------ */

export type LibraryFilter = "all" | ReadingStatus;
export const LIBRARY_FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not Started" },
  { id: "reading", label: "Currently Reading" },
  { id: "completed", label: "Completed" },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterAndSearch<T extends Pick<LibraryBook, "title" | "author" | "category" | "progress">>(
  books: T[],
  filter: LibraryFilter,
  query: string,
): T[] {
  const q = fold(query.trim());
  return books.filter(
    (b) =>
      (filter === "all" || b.progress.status === filter) &&
      (!q || [b.title, b.author, b.category].some((field) => fold(field).includes(q))),
  );
}

export function filterCounts(books: Pick<LibraryBook, "progress">[]): Record<LibraryFilter, number> {
  const counts: Record<LibraryFilter, number> = { all: books.length, not_started: 0, reading: 0, completed: 0 };
  for (const b of books) counts[b.progress.status] += 1;
  return counts;
}

/** 0 → "0 min", 125 → "2 min", 3720 → "1 h 2 min" */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Just now", "5 min ago", "Today at 14:05", "Yesterday at 09:12", "3 Nov 2026" */
export function formatLastRead(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Not opened yet";
  const then = new Date(iso);
  const diff = (now.getTime() - then.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  const hhmm = `${String(then.getHours()).padStart(2, "0")}:${String(then.getMinutes()).padStart(2, "0")}`;
  if (localDay(then) === localDay(now)) return `Today at ${hhmm}`;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (localDay(then) === localDay(y)) return `Yesterday at ${hhmm}`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${then.getDate()} ${months[then.getMonth()]} ${then.getFullYear()}`;
}

export function pagesLabel(book: Pick<LibraryBook, "pagesApprox" | "progress">): string {
  const { furthestPage, totalPages, status } = book.progress;
  const done = status === "completed" ? totalPages : furthestPage;
  return `${done} of ${book.pagesApprox ? "~" : ""}${totalPages} pages`;
}
