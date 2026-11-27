import {
  DEFAULT_READER_PREFS,
  ReaderPrefsSchema,
  computeStreak,
  deriveStatus,
  goalProgress,
  progressPercent,
  type BookProgress,
  type Bookmark,
  type CoverTheme,
  type DailyActivity,
  type Highlight,
  type HighlightColor,
  type LibraryBook,
  type ListId,
  type Note,
  type Page,
  type ReaderPrefs,
  type Stats,
} from "@rct/shared";
import { CATALOG, DEMO_READER_ID, type CatalogBook } from "./catalog.js";
import type { ContentStore } from "./content/store.js";
import type { Store } from "./db.js";

/** Most a single save can add to reading time, so a stuck or misbehaving client can't inflate stats. */
export const MAX_SECONDS_PER_SAVE = 60;

export class NotFound extends Error {}
export class NotReadable extends Error {}
export class OutOfRange extends Error {}

interface ProgressRow {
  current_page: number;
  furthest_page: number;
  seconds_read: number;
  started_at: string | null;
  last_read_at: string | null;
  completed_at: string | null;
}

/** Reading experience: library, pages, progress, bookmarks, highlights, notes, preferences, stats. */
export class ReadingRepo {
  constructor(
    private readonly store: Store,
    private readonly content: ContentStore,
    private readonly readerId = DEMO_READER_ID,
  ) {}

  private get db() {
    return this.store.db;
  }

  catalogBook(bookId: string): CatalogBook {
    const book = CATALOG.find((b) => b.id === bookId);
    if (!book) throw new NotFound(`No book with id "${bookId}".`);
    return book;
  }

  totalPages(book: CatalogBook): number {
    return this.content.get(book)?.pages.length ?? book.printPages ?? 0;
  }

  private isRead(bookId: string): boolean {
    const row = this.db.prepare("SELECT read FROM reading_status WHERE reader_id = ? AND book_id = ?").get(this.readerId, bookId) as { read: number } | undefined;
    return row?.read === 1;
  }

  private progressRow(bookId: string): ProgressRow | undefined {
    return this.db
      .prepare("SELECT current_page, furthest_page, seconds_read, started_at, last_read_at, completed_at FROM reading_progress WHERE reader_id = ? AND book_id = ?")
      .get(this.readerId, bookId) as ProgressRow | undefined;
  }

  progress(book: CatalogBook): BookProgress {
    const row = this.progressRow(book.id);
    const total = this.totalPages(book);
    const furthest = Math.min(row?.furthest_page ?? 0, total);
    const status = deriveStatus(this.isRead(book.id), furthest);
    return {
      status,
      currentPage: Math.min(row?.current_page ?? 0, total),
      furthestPage: furthest,
      totalPages: total,
      percent: progressPercent(status, furthest, total),
      secondsRead: row?.seconds_read ?? 0,
      startedAt: row?.started_at ?? null,
      lastReadAt: row?.last_read_at ?? null,
      completedAt: status === "completed" ? (row?.completed_at ?? null) : null,
    };
  }

  libraryBook(book: CatalogBook): LibraryBook {
    const content = this.content.get(book);
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      year: book.year,
      summary: book.summary,
      description: book.description,
      listId: book.listId as ListId | null,
      readable: content !== null,
      pagesApprox: content === null,
      contentNote: this.content.note(),
      cover: book.cover as CoverTheme,
      progress: this.progress(book),
    };
  }

  library(): LibraryBook[] {
    return CATALOG.map((b) => this.libraryBook(b));
  }

  details(bookId: string) {
    const book = this.catalogBook(bookId);
    const count = (table: string) =>
      (this.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE reader_id = ? AND book_id = ?`).get(this.readerId, bookId) as { n: number }).n;
    return {
      book: this.libraryBook(book),
      chapters: this.content.get(book)?.chapters ?? [],
      counts: { bookmarks: count("bookmarks"), highlights: count("highlights"), notes: count("notes") },
    };
  }

  page(bookId: string, n: number): Page {
    const book = this.catalogBook(bookId);
    const content = this.content.get(book);
    if (!content) throw new NotReadable(`${book.title} isn't available to read here. Borrow it from the library and track your page instead.`);
    const page = content.pages[n - 1];
    if (!page) throw new OutOfRange(`Page ${n} doesn't exist. ${book.title} has ${content.pages.length} pages.`);
    return {
      bookId,
      page: n,
      totalPages: content.pages.length,
      chapterTitle: content.chapters[page.chapter]?.title ?? null,
      paragraphs: page.paragraphs,
    };
  }

  /**
   * Saves the page the reader is on. Status moves Not Started → Currently Reading on the first save
   * and Currently Reading → Completed when the last page is reached.
   */
  saveProgress(bookId: string, page: number, secondsDelta: number, day: string) {
    const book = this.catalogBook(bookId);
    const total = this.totalPages(book);
    if (page > total) throw new OutOfRange(`Page ${page} doesn't exist. ${book.title} has ${total} pages.`);
    const seconds = Math.min(Math.max(0, secondsDelta), MAX_SECONDS_PER_SAVE);
    const now = new Date().toISOString();
    return this.store.transaction(() => {
      const before = this.progressRow(bookId);
      const wasRead = this.isRead(bookId);
      const furthestBefore = before?.furthest_page ?? 0;
      this.db
        .prepare(
          `INSERT INTO reading_progress (reader_id, book_id, current_page, furthest_page, seconds_read, started_at, last_read_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (reader_id, book_id) DO UPDATE SET
             current_page = excluded.current_page,
             furthest_page = MAX(reading_progress.furthest_page, excluded.furthest_page),
             seconds_read = reading_progress.seconds_read + excluded.seconds_read,
             started_at = COALESCE(reading_progress.started_at, excluded.started_at),
             last_read_at = excluded.last_read_at`,
        )
        .run(this.readerId, bookId, page, page, seconds, now, now);
      const newPages = Math.max(0, page - furthestBefore);
      this.db
        .prepare(
          `INSERT INTO daily_activity (reader_id, day, seconds, pages) VALUES (?, ?, ?, ?)
           ON CONFLICT (reader_id, day) DO UPDATE SET seconds = seconds + excluded.seconds, pages = pages + excluded.pages`,
        )
        .run(this.readerId, day, seconds, newPages);
      let justCompleted = false;
      if (page === total && !wasRead) {
        this.store.setReadInTransaction(bookId, true, this.readerId);
        justCompleted = true;
      }
      return { progress: this.progress(book), justCompleted };
    });
  }

  /** Back to Not Started. Bookmarks, highlights and notes are kept. */
  resetProgress(bookId: string) {
    const book = this.catalogBook(bookId);
    this.store.transaction(() => {
      this.db.prepare("DELETE FROM reading_progress WHERE reader_id = ? AND book_id = ?").run(this.readerId, bookId);
      this.store.setReadInTransaction(bookId, false, this.readerId);
    });
    return { progress: this.progress(book) };
  }

  /* -------------------------- bookmarks --------------------------- */

  private bookmark(row: Record<string, unknown>): Bookmark {
    return { id: Number(row.id), bookId: String(row.book_id), page: Number(row.page), label: String(row.label), createdAt: String(row.created_at) };
  }
  listBookmarks(bookId: string): Bookmark[] {
    this.catalogBook(bookId);
    return (this.db.prepare("SELECT * FROM bookmarks WHERE reader_id = ? AND book_id = ? ORDER BY page").all(this.readerId, bookId) as Record<string, unknown>[]).map((r) =>
      this.bookmark(r),
    );
  }
  addBookmark(bookId: string, page: number, label?: string): Bookmark {
    const book = this.catalogBook(bookId);
    const total = this.totalPages(book);
    if (page > total) throw new OutOfRange(`Page ${page} doesn't exist. ${book.title} has ${total} pages.`);
    const content = this.content.get(book);
    const chapter = content ? content.chapters[content.pages[page - 1]!.chapter]?.title : undefined;
    const finalLabel = label?.trim() || (chapter ? `${chapter} · page ${page}` : `Page ${page}`);
    // Bookmarking the same page twice keeps one bookmark (idempotent).
    this.db
      .prepare(
        `INSERT INTO bookmarks (reader_id, book_id, page, label, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (reader_id, book_id, page) DO UPDATE SET label = excluded.label`,
      )
      .run(this.readerId, bookId, page, finalLabel, new Date().toISOString());
    return this.bookmark(this.db.prepare("SELECT * FROM bookmarks WHERE reader_id = ? AND book_id = ? AND page = ?").get(this.readerId, bookId, page) as Record<string, unknown>);
  }
  deleteBookmark(id: number) {
    const r = this.db.prepare("DELETE FROM bookmarks WHERE id = ? AND reader_id = ?").run(id, this.readerId);
    if (!r.changes) throw new NotFound(`No bookmark with id ${id}.`);
  }

  /* -------------------------- highlights -------------------------- */

  private highlight(row: Record<string, unknown>): Highlight {
    return {
      id: Number(row.id),
      bookId: String(row.book_id),
      page: Number(row.page),
      paragraph: Number(row.paragraph),
      color: row.color as HighlightColor,
      note: (row.note as string | null) ?? null,
      excerpt: String(row.excerpt),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
  listHighlights(bookId: string): Highlight[] {
    this.catalogBook(bookId);
    return (
      this.db.prepare("SELECT * FROM highlights WHERE reader_id = ? AND book_id = ? ORDER BY page, paragraph").all(this.readerId, bookId) as Record<string, unknown>[]
    ).map((r) => this.highlight(r));
  }
  addHighlight(bookId: string, page: number, paragraph: number, color: HighlightColor, note?: string | null): Highlight {
    const p = this.page(bookId, page); // validates readability and range
    const text = p.paragraphs[paragraph];
    if (text === undefined) throw new OutOfRange(`Paragraph ${paragraph} doesn't exist on page ${page}.`);
    const excerpt = text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
    const now = new Date().toISOString();
    // One highlight per paragraph: highlighting again updates the colour (and note, if given).
    this.db
      .prepare(
        `INSERT INTO highlights (reader_id, book_id, page, paragraph, color, note, excerpt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (reader_id, book_id, page, paragraph) DO UPDATE SET
           color = excluded.color, note = COALESCE(excluded.note, highlights.note), updated_at = excluded.updated_at`,
      )
      .run(this.readerId, bookId, page, paragraph, color, note?.trim() || null, excerpt, now, now);
    return this.highlight(
      this.db.prepare("SELECT * FROM highlights WHERE reader_id = ? AND book_id = ? AND page = ? AND paragraph = ?").get(this.readerId, bookId, page, paragraph) as Record<string, unknown>,
    );
  }
  updateHighlight(id: number, patch: { color?: HighlightColor; note?: string | null }): Highlight {
    const row = this.db.prepare("SELECT * FROM highlights WHERE id = ? AND reader_id = ?").get(id, this.readerId) as Record<string, unknown> | undefined;
    if (!row) throw new NotFound(`No highlight with id ${id}.`);
    const color = patch.color ?? (row.color as string);
    const note = patch.note === undefined ? (row.note as string | null) : patch.note?.trim() || null;
    this.db.prepare("UPDATE highlights SET color = ?, note = ?, updated_at = ? WHERE id = ?").run(color, note, new Date().toISOString(), id);
    return this.highlight(this.db.prepare("SELECT * FROM highlights WHERE id = ?").get(id) as Record<string, unknown>);
  }
  deleteHighlight(id: number) {
    const r = this.db.prepare("DELETE FROM highlights WHERE id = ? AND reader_id = ?").run(id, this.readerId);
    if (!r.changes) throw new NotFound(`No highlight with id ${id}.`);
  }

  /* ----------------------------- notes ---------------------------- */

  private note(row: Record<string, unknown>): Note {
    return {
      id: Number(row.id),
      bookId: String(row.book_id),
      page: row.page === null ? null : Number(row.page),
      text: String(row.text),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
  listNotes(bookId: string): Note[] {
    this.catalogBook(bookId);
    return (this.db.prepare("SELECT * FROM notes WHERE reader_id = ? AND book_id = ? ORDER BY created_at DESC, id DESC").all(this.readerId, bookId) as Record<string, unknown>[]).map(
      (r) => this.note(r),
    );
  }
  addNote(bookId: string, text: string, page?: number | null): Note {
    const book = this.catalogBook(bookId);
    if (page && page > this.totalPages(book)) throw new OutOfRange(`Page ${page} doesn't exist. ${book.title} has ${this.totalPages(book)} pages.`);
    const now = new Date().toISOString();
    const r = this.db
      .prepare("INSERT INTO notes (reader_id, book_id, page, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(this.readerId, bookId, page ?? null, text.trim(), now, now);
    return this.note(this.db.prepare("SELECT * FROM notes WHERE id = ?").get(Number(r.lastInsertRowid)) as Record<string, unknown>);
  }
  updateNote(id: number, text: string): Note {
    const r = this.db.prepare("UPDATE notes SET text = ?, updated_at = ? WHERE id = ? AND reader_id = ?").run(text.trim(), new Date().toISOString(), id, this.readerId);
    if (!r.changes) throw new NotFound(`No note with id ${id}.`);
    return this.note(this.db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as Record<string, unknown>);
  }
  deleteNote(id: number) {
    const r = this.db.prepare("DELETE FROM notes WHERE id = ? AND reader_id = ?").run(id, this.readerId);
    if (!r.changes) throw new NotFound(`No note with id ${id}.`);
  }

  /* ------------------------- preferences -------------------------- */

  preferences(): ReaderPrefs {
    const row = this.db.prepare("SELECT json FROM reader_prefs WHERE reader_id = ?").get(this.readerId) as { json: string } | undefined;
    if (!row) return DEFAULT_READER_PREFS;
    const parsed = ReaderPrefsSchema.safeParse({ ...DEFAULT_READER_PREFS, ...JSON.parse(row.json) });
    return parsed.success ? parsed.data : DEFAULT_READER_PREFS;
  }
  savePreferences(prefs: ReaderPrefs): ReaderPrefs {
    this.db
      .prepare("INSERT INTO reader_prefs (reader_id, json) VALUES (?, ?) ON CONFLICT (reader_id) DO UPDATE SET json = excluded.json")
      .run(this.readerId, JSON.stringify(prefs));
    return this.preferences();
  }

  /* ----------------------------- stats ---------------------------- */

  stats(today: string): Stats {
    const books = this.library();
    const activity = this.db.prepare("SELECT day, seconds, pages FROM daily_activity WHERE reader_id = ?").all(this.readerId) as unknown as DailyActivity[];
    const byRecent = books.filter((b) => b.progress.lastReadAt).sort((a, b) => (b.progress.lastReadAt! > a.progress.lastReadAt! ? 1 : -1));
    return {
      totalBooks: books.length,
      reading: books.filter((b) => b.progress.status === "reading").length,
      completed: books.filter((b) => b.progress.status === "completed").length,
      notStarted: books.filter((b) => b.progress.status === "not_started").length,
      pagesRead: books.reduce((n, b) => n + (b.progress.status === "completed" ? b.progress.totalPages : b.progress.furthestPage), 0),
      secondsRead: books.reduce((n, b) => n + b.progress.secondsRead, 0),
      streak: computeStreak(
        activity.filter((a) => a.seconds > 0 || a.pages > 0).map((a) => a.day),
        today,
      ),
      goal: goalProgress(this.preferences().goal, activity, today),
      continueReading: byRecent.filter((b) => b.progress.status === "reading").map((b) => b.id),
      recentlyRead: byRecent.slice(0, 6).map((b) => b.id),
    };
  }
}
