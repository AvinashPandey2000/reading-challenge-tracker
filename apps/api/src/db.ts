import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Book, ListId, ListSummary, ReadingList, VideoProgress } from "@rct/shared";
import { CATALOG, DEMO_READER_ID, LIST_TITLES } from "./catalog.js";

interface BookRow {
  id: string;
  list_id: ListId | null;
  title: string;
  author: string;
  read: number | null;
  updated_at: string | null;
}

/**
 * SQLite storage. Schema:
 *   books(id, list_id, title, author, position)            -- the fixed catalog
 *   reading_status(reader_id, book_id, read, updated_at)   -- per-reader status
 *   video_progress(reader_id, position_seconds, updated_at)
 *
 * Seeding uses INSERT OR IGNORE, so it fills in missing rows on first start and never
 * overwrites a status the reader has already saved.
 */
export class Store {
  readonly db: DatabaseSync;

  constructor(readonly path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.migrate();
    this.seed();
  }

  /**
   * Versioned migrations (PRAGMA user_version). v1 is the original challenge schema; v2 adds the
   * reading experience. Existing databases (e.g. a Docker volume from v1) are upgraded in place.
   */
  private migrate() {
    const version = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    if (version < 1) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS books (
          id        TEXT PRIMARY KEY,
          list_id   TEXT NOT NULL CHECK (list_id IN ('fiction', 'nonfiction')),
          title     TEXT NOT NULL,
          author    TEXT NOT NULL,
          position  INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reading_status (
          reader_id  TEXT NOT NULL,
          book_id    TEXT NOT NULL REFERENCES books(id),
          read       INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
          updated_at TEXT,
          PRIMARY KEY (reader_id, book_id)
        );
        CREATE TABLE IF NOT EXISTS video_progress (
          reader_id        TEXT PRIMARY KEY,
          position_seconds REAL NOT NULL CHECK (position_seconds >= 0),
          updated_at       TEXT NOT NULL
        );
        PRAGMA user_version = 1;
      `);
    }
    if (version < 2) {
      // books.list_id becomes nullable (library-only books) and gains catalogue metadata.
      // SQLite can't alter a CHECK constraint, so the table is rebuilt; statuses are untouched.
      this.db.exec("PRAGMA foreign_keys = OFF;");
      this.transaction(() => {
        this.db.exec(`
          CREATE TABLE books_v2 (
            id          TEXT PRIMARY KEY,
            list_id     TEXT CHECK (list_id IN ('fiction', 'nonfiction') OR list_id IS NULL),
            title       TEXT NOT NULL,
            author      TEXT NOT NULL,
            position    INTEGER NOT NULL,
            category    TEXT NOT NULL DEFAULT '',
            year        INTEGER,
            summary     TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            readable    INTEGER NOT NULL DEFAULT 0,
            print_pages INTEGER,
            cover       TEXT NOT NULL DEFAULT '{}'
          );
          INSERT INTO books_v2 (id, list_id, title, author, position) SELECT id, list_id, title, author, position FROM books;
          DROP TABLE books;
          ALTER TABLE books_v2 RENAME TO books;

          CREATE TABLE IF NOT EXISTS reading_progress (
            reader_id     TEXT NOT NULL,
            book_id       TEXT NOT NULL REFERENCES books(id),
            current_page  INTEGER NOT NULL DEFAULT 0,
            furthest_page INTEGER NOT NULL DEFAULT 0,
            seconds_read  INTEGER NOT NULL DEFAULT 0,
            started_at    TEXT,
            last_read_at  TEXT,
            completed_at  TEXT,
            PRIMARY KEY (reader_id, book_id)
          );
          CREATE TABLE IF NOT EXISTS bookmarks (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            reader_id  TEXT NOT NULL,
            book_id    TEXT NOT NULL REFERENCES books(id),
            page       INTEGER NOT NULL,
            label      TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            UNIQUE (reader_id, book_id, page)
          );
          CREATE TABLE IF NOT EXISTS highlights (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            reader_id  TEXT NOT NULL,
            book_id    TEXT NOT NULL REFERENCES books(id),
            page       INTEGER NOT NULL,
            paragraph  INTEGER NOT NULL,
            color      TEXT NOT NULL,
            note       TEXT,
            excerpt    TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (reader_id, book_id, page, paragraph)
          );
          CREATE TABLE IF NOT EXISTS notes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            reader_id  TEXT NOT NULL,
            book_id    TEXT NOT NULL REFERENCES books(id),
            page       INTEGER,
            text       TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS daily_activity (
            reader_id TEXT NOT NULL,
            day       TEXT NOT NULL,
            seconds   INTEGER NOT NULL DEFAULT 0,
            pages     INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (reader_id, day)
          );
          CREATE TABLE IF NOT EXISTS reader_prefs (
            reader_id TEXT PRIMARY KEY,
            json      TEXT NOT NULL
          );
          PRAGMA user_version = 2;
        `);
      });
      this.db.exec("PRAGMA foreign_keys = ON;");
    }
  }

  private seed() {
    // Catalogue metadata isn't reader data, so it is refreshed on every start; statuses are never overwritten.
    const upsertBook = this.db.prepare(
      `INSERT INTO books (id, list_id, title, author, position, category, year, summary, description, readable, print_pages, cover)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET list_id = excluded.list_id, title = excluded.title, author = excluded.author,
         position = excluded.position, category = excluded.category, year = excluded.year, summary = excluded.summary,
         description = excluded.description, readable = excluded.readable, print_pages = excluded.print_pages, cover = excluded.cover`,
    );
    const insertStatus = this.db.prepare(
      "INSERT OR IGNORE INTO reading_status (reader_id, book_id, read, updated_at) VALUES (?, ?, 0, NULL)",
    );
    this.transaction(() => {
      for (const b of CATALOG) {
        upsertBook.run(b.id, b.listId, b.title, b.author, b.position, b.category, b.year, b.summary, b.description, b.readable ? 1 : 0, b.printPages, JSON.stringify(b.cover));
        insertStatus.run(DEMO_READER_ID, b.id);
      }
    });
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  ping(): boolean {
    return this.db.prepare("SELECT 1 AS ok").get() !== undefined;
  }

  private toBook(row: BookRow): Book {
    return {
      id: row.id,
      listId: row.list_id,
      title: row.title,
      author: row.author,
      read: row.read === 1,
      updatedAt: row.updated_at,
    };
  }

  listBooks(readerId = DEMO_READER_ID): ReadingList[] {
    const rows = this.db
      .prepare(
        `SELECT b.id, b.list_id, b.title, b.author, s.read, s.updated_at
           FROM books b
           LEFT JOIN reading_status s ON s.book_id = b.id AND s.reader_id = ?
          WHERE b.list_id IS NOT NULL
          ORDER BY CASE b.list_id WHEN 'fiction' THEN 0 ELSE 1 END, b.position`,
      )
      .all(readerId) as unknown as BookRow[];
    const lists: ReadingList[] = (["fiction", "nonfiction"] as const).map((id) => ({
      id,
      title: LIST_TITLES[id],
      readCount: 0,
      total: 0,
      books: [],
    }));
    for (const row of rows) {
      const list = lists.find((l) => l.id === row.list_id)!;
      const book = this.toBook(row);
      list.books.push(book);
      list.total += 1;
      if (book.read) list.readCount += 1;
    }
    return lists;
  }

  getBook(bookId: string, readerId = DEMO_READER_ID): Book | null {
    const row = this.db
      .prepare(
        `SELECT b.id, b.list_id, b.title, b.author, s.read, s.updated_at
           FROM books b
           LEFT JOIN reading_status s ON s.book_id = b.id AND s.reader_id = ?
          WHERE b.id = ?`,
      )
      .get(readerId, bookId) as unknown as BookRow | undefined;
    return row ? this.toBook(row) : null;
  }

  listSummary(listId: ListId, readerId = DEMO_READER_ID): ListSummary {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(s.read), 0) AS readCount
           FROM books b
           LEFT JOIN reading_status s ON s.book_id = b.id AND s.reader_id = ?
          WHERE b.list_id = ?`,
      )
      .get(readerId, listId) as { total: number; readCount: number };
    return { id: listId, title: LIST_TITLES[listId], readCount: Number(row.readCount), total: Number(row.total) };
  }

  /**
   * Idempotent: writing the same status twice leaves the same status and count.
   * `updated_at` only changes when the status actually changes.
   */
  setRead(bookId: string, read: boolean, readerId = DEMO_READER_ID): { book: Book; list: ListSummary | null } | null {
    return this.transaction(() => this.setReadInTransaction(bookId, read, readerId));
  }

  /** setRead for callers that already hold a transaction (reading progress, reset). */
  setReadInTransaction(bookId: string, read: boolean, readerId = DEMO_READER_ID): { book: Book; list: ListSummary | null } | null {
    {
      const existing = this.getBook(bookId, readerId);
      if (!existing) return null;
      if (existing.read !== read) {
        this.db
          .prepare(
            `INSERT INTO reading_status (reader_id, book_id, read, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (reader_id, book_id) DO UPDATE SET read = excluded.read, updated_at = excluded.updated_at`,
          )
          .run(readerId, bookId, read ? 1 : 0, new Date().toISOString());
        // Keep the reading-progress completion date in step with the flag.
        const now = new Date().toISOString();
        this.db
          .prepare(
            `INSERT INTO reading_progress (reader_id, book_id, completed_at) VALUES (?, ?, ?)
             ON CONFLICT (reader_id, book_id) DO UPDATE SET completed_at = excluded.completed_at`,
          )
          .run(readerId, bookId, read ? now : null);
      }
      const book = this.getBook(bookId, readerId)!;
      return { book, list: book.listId ? this.listSummary(book.listId, readerId) : null };
    }
  }

  getVideoProgress(readerId = DEMO_READER_ID): VideoProgress {
    const row = this.db
      .prepare("SELECT position_seconds, updated_at FROM video_progress WHERE reader_id = ?")
      .get(readerId) as { position_seconds: number; updated_at: string } | undefined;
    return row ? { positionSeconds: row.position_seconds, updatedAt: row.updated_at } : { positionSeconds: 0, updatedAt: null };
  }

  /** Stores the exact position sent (earlier positions overwrite later ones, e.g. after seeking back). */
  saveVideoProgress(positionSeconds: number, readerId = DEMO_READER_ID): VideoProgress {
    const rounded = Math.round(positionSeconds * 1000) / 1000;
    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO video_progress (reader_id, position_seconds, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (reader_id) DO UPDATE SET position_seconds = excluded.position_seconds, updated_at = excluded.updated_at`,
      )
      .run(readerId, rounded, updatedAt);
    return { positionSeconds: rounded, updatedAt };
  }

  close() {
    if (this.db.isOpen) this.db.close();
  }
}
