import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { FastifyInstance } from "fastify";
import type { BookDetails, LibraryResponse, Page, SaveProgressResponse, Stats } from "@rct/shared";
import { ContentStore } from "../src/content/store.js";
import { makeApp, tempDbPath } from "./helpers.js";

let app: FastifyInstance;
let db: ReturnType<typeof tempDbPath>;
beforeEach(async () => {
  db = tempDbPath();
  app = await makeApp(db.path);
});
afterEach(async () => {
  await app.close();
  db.cleanup();
});

const DAY = "2026-11-27";
const get = (url: string) => app.inject({ method: "GET", url });
const send = (method: "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: unknown) =>
  app.inject({ method, url, ...(payload === undefined ? {} : { payload: payload as object }) });
const library = async () => ((await get("/api/library")).json() as LibraryResponse).books;
const book = async (id: string) => (await library()).find((b) => b.id === id)!;
const progress = (id: string, page: number, secondsDelta = 0, day = DAY) => send("PUT", `/api/books/${id}/progress`, { page, secondsDelta, day });

describe("library", () => {
  it("lists 10 books with metadata and Not Started progress; /api/books still has the 6 challenge books", async () => {
    const books = await library();
    expect(books).toHaveLength(10);
    const garden = books.find((b) => b.id === "the-secret-garden")!;
    expect(garden).toMatchObject({ category: "Children's classic", year: 1911, readable: true, pagesApprox: false, listId: "fiction", contentNote: null });
    expect(garden.progress).toMatchObject({ status: "not_started", percent: 0, currentPage: 0 });
    expect(garden.progress.totalPages).toBeGreaterThan(100);
    const hobbit = books.find((b) => b.id === "the-hobbit")!;
    expect(hobbit).toMatchObject({ readable: false, pagesApprox: true });
    expect(hobbit.progress.totalPages).toBe(310);
    expect(books.find((b) => b.id === "walden")!.listId).toBeNull();
    const challenge = (await get("/api/books")).json();
    expect(challenge.lists.flatMap((l: { books: unknown[] }) => l.books)).toHaveLength(6);
  });

  it("returns details with chapters and counts, and 404 for unknown books", async () => {
    const d = (await get("/api/books/alices-adventures-in-wonderland/details")).json() as BookDetails;
    expect(d.chapters[0]).toEqual({ title: "Chapter I — Down the Rabbit-hole", startPage: 1 });
    expect(d.counts).toEqual({ bookmarks: 0, highlights: 0, notes: 0 });
    expect((await get("/api/books/nope/details")).statusCode).toBe(404);
  });
});

describe("pages", () => {
  it("serves fixed pages with the chapter title; rejects out-of-range and unreadable books", async () => {
    const p1 = (await get("/api/books/the-secret-garden/pages/1")).json() as Page;
    expect(p1).toMatchObject({ bookId: "the-secret-garden", page: 1, chapterTitle: "Chapter I — There Is No One Left" });
    expect(p1.paragraphs.length).toBeGreaterThan(0);
    const last = await get(`/api/books/the-secret-garden/pages/${p1.totalPages}`);
    expect(last.statusCode).toBe(200);
    const beyond = await get(`/api/books/the-secret-garden/pages/${p1.totalPages + 1}`);
    expect(beyond.statusCode).toBe(404);
    expect(beyond.json().error.code).toBe("PAGE_OUT_OF_RANGE");
    expect((await get("/api/books/the-secret-garden/pages/0")).statusCode).toBe(400);
    expect((await get("/api/books/the-secret-garden/pages/abc")).statusCode).toBe(400);
    const hobbit = await get("/api/books/the-hobbit/pages/1");
    expect(hobbit.statusCode).toBe(409);
    expect(hobbit.json().error.code).toBe("NOT_READABLE");
  });
});

describe("progress", () => {
  it("moves Not Started → Currently Reading, saves the resume page and tracks time with a cap", async () => {
    let r = (await progress("peter-pan", 3, 20)).json() as SaveProgressResponse;
    expect(r.justCompleted).toBe(false);
    expect(r.progress).toMatchObject({ status: "reading", currentPage: 3, furthestPage: 3, secondsRead: 20 });
    // Going back keeps the furthest page but resumes where the reader stopped
    r = (await progress("peter-pan", 2, 500)).json() as SaveProgressResponse;
    expect(r.progress).toMatchObject({ currentPage: 2, furthestPage: 3, secondsRead: 80 }); // 500 capped to 60
    const pp = await book("peter-pan");
    expect(pp.progress.percent).toBe(Math.round((3 / pp.progress.totalPages) * 100));
    expect(pp.progress.lastReadAt).not.toBeNull();
  });

  it("reaching the last page completes the book and updates the challenge count; reopening keeps Completed", async () => {
    const total = (await book("the-secret-garden")).progress.totalPages;
    await progress("the-secret-garden", total - 1);
    const done = (await progress("the-secret-garden", total)).json() as SaveProgressResponse;
    expect(done.justCompleted).toBe(true);
    expect(done.progress).toMatchObject({ status: "completed", percent: 100 });
    expect(done.progress.completedAt).not.toBeNull();
    const fiction = (await get("/api/books")).json().lists[0];
    expect(fiction.readCount).toBe(1);
    // Re-reading a completed book
    const again = (await progress("the-secret-garden", 5)).json() as SaveProgressResponse;
    expect(again.justCompleted).toBe(false);
    expect(again.progress).toMatchObject({ status: "completed", currentPage: 5 });
  });

  it("Mark as Read via PATCH sets Completed; reset returns to Not Started and keeps notes and bookmarks", async () => {
    await progress("the-hobbit", 120); // manual page tracking for a non-readable book
    expect((await book("the-hobbit")).progress).toMatchObject({ status: "reading", furthestPage: 120, percent: 39 });
    await send("POST", "/api/books/the-hobbit/notes", { text: "Riddles chapter!", page: 70 });
    await send("POST", "/api/books/the-hobbit/bookmarks", { page: 120 });
    await send("PATCH", "/api/books/the-hobbit", { read: true });
    expect((await book("the-hobbit")).progress).toMatchObject({ status: "completed", percent: 100 });
    const reset = await send("DELETE", "/api/books/the-hobbit/progress");
    expect(reset.statusCode).toBe(200);
    expect((await book("the-hobbit")).progress).toMatchObject({ status: "not_started", percent: 0, currentPage: 0, secondsRead: 0 });
    expect((await get("/api/books")).json().lists[0].readCount).toBe(0);
    const d = (await get("/api/books/the-hobbit/details")).json() as BookDetails;
    expect(d.counts).toMatchObject({ notes: 1, bookmarks: 1 });
  });

  it("validates the body and the page range", async () => {
    expect((await progress("nope", 1)).statusCode).toBe(404);
    for (const body of [{}, { page: 0, day: DAY }, { page: 1.5, day: DAY }, { page: 1, day: "yesterday" }, { page: "2", day: DAY }, { page: 1, day: DAY, extra: 1 }]) {
      const r = await send("PUT", "/api/books/peter-pan/progress", body);
      expect(r.statusCode).toBe(400);
      expect(r.json().error.code).toBe("INVALID_BODY");
    }
    expect((await progress("the-hobbit", 311)).json().error.code).toBe("PAGE_OUT_OF_RANGE");
  });
});

describe("bookmarks, highlights and notes", () => {
  it("bookmarks a page once with a chapter label and deletes it", async () => {
    const b = (await send("POST", "/api/books/alices-adventures-in-wonderland/bookmarks", { page: 2 })).json();
    expect(b).toMatchObject({ page: 2, label: "Chapter I — Down the Rabbit-hole · page 2" });
    await send("POST", "/api/books/alices-adventures-in-wonderland/bookmarks", { page: 2 });
    const list = (await get("/api/books/alices-adventures-in-wonderland/bookmarks")).json().bookmarks;
    expect(list).toHaveLength(1);
    expect((await send("DELETE", `/api/bookmarks/${b.id}`)).json()).toEqual({ ok: true });
    expect((await send("DELETE", `/api/bookmarks/${b.id}`)).statusCode).toBe(404);
  });

  it("highlights a paragraph with an excerpt, updates colour and note, and deletes it", async () => {
    const h = (await send("POST", "/api/books/walden/highlights", { page: 1, paragraph: 0, color: "yellow" })).json();
    expect(h).toMatchObject({ page: 1, paragraph: 0, color: "yellow", note: null });
    expect(h.excerpt.length).toBeGreaterThan(10);
    const again = (await send("POST", "/api/books/walden/highlights", { page: 1, paragraph: 0, color: "green", note: "Simplicity" })).json();
    expect(again).toMatchObject({ id: h.id, color: "green", note: "Simplicity" });
    const patched = (await send("PATCH", `/api/highlights/${h.id}`, { note: null })).json();
    expect(patched.note).toBeNull();
    expect((await send("POST", "/api/books/walden/highlights", { page: 1, paragraph: 999, color: "blue" })).statusCode).toBe(404);
    expect((await send("POST", "/api/books/walden/highlights", { page: 1, paragraph: 0, color: "purple" })).statusCode).toBe(400);
    expect((await send("POST", "/api/books/the-hobbit/highlights", { page: 1, paragraph: 0, color: "blue" })).statusCode).toBe(409);
    expect((await send("PATCH", `/api/highlights/${h.id}`, {})).statusCode).toBe(400);
    expect((await send("DELETE", `/api/highlights/${h.id}`)).statusCode).toBe(200);
    expect((await get("/api/books/walden/highlights")).json().highlights).toEqual([]);
  });

  it("creates, edits and deletes notes; rejects empty text", async () => {
    const n = (await send("POST", "/api/books/matilda/notes", { text: "  Loved the library scenes  " })).json();
    expect(n).toMatchObject({ text: "Loved the library scenes", page: null });
    expect((await send("PATCH", `/api/notes/${n.id}`, { text: "Edited" })).json().text).toBe("Edited");
    expect((await send("POST", "/api/books/matilda/notes", { text: "   " })).statusCode).toBe(400);
    expect((await send("DELETE", `/api/notes/${n.id}`)).statusCode).toBe(200);
    expect((await send("PATCH", `/api/notes/${n.id}`, { text: "x" })).statusCode).toBe(404);
  });
});

describe("preferences and stats", () => {
  it("returns defaults, saves valid preferences and rejects invalid ones", async () => {
    const defaults = (await get("/api/reader/preferences")).json();
    expect(defaults).toMatchObject({ fontSize: 18, theme: "light", goal: { period: "daily", minutes: 15 } });
    const next = { ...defaults, fontSize: 22, theme: "sepia", lineSpacing: 2, align: "justify", fontFamily: "sans", background: "paper", goal: { period: "weekly", minutes: 60 } };
    expect((await send("PUT", "/api/reader/preferences", next)).json()).toEqual(next);
    expect((await get("/api/reader/preferences")).json()).toEqual(next);
    expect((await send("PUT", "/api/reader/preferences", { ...next, fontSize: 99 })).statusCode).toBe(400);
  });

  it("computes totals, streak, goal and Continue / Recently Read", async () => {
    await progress("peter-pan", 4, 60, "2026-11-25");
    await progress("peter-pan", 6, 60, "2026-11-26");
    await progress("walden", 2, 60, "2026-11-27");
    await progress("walden", 3, 60, "2026-11-27");
    await send("PATCH", "/api/books/matilda", { read: true });
    const s = (await get("/api/reading/stats?today=2026-11-27")).json() as Stats;
    expect(s).toMatchObject({ totalBooks: 10, reading: 2, completed: 1, notStarted: 7, streak: 3, secondsRead: 240 });
    expect(s.pagesRead).toBe(6 + 3 + 240);
    expect(s.goal).toMatchObject({ period: "daily", targetMinutes: 15, minutesDone: 2, met: false });
    expect(s.continueReading).toEqual(["walden", "peter-pan"]);
    expect(s.recentlyRead.slice(0, 2)).toEqual(["walden", "peter-pan"]);
    expect((await get("/api/reading/stats")).statusCode).toBe(400);
  });
});

describe("migration and local override", () => {
  it("upgrades a v1 database in place, keeping challenge status and video position", async () => {
    await app.close();
    db.cleanup();
    db = tempDbPath();
    const v1 = new DatabaseSync(db.path);
    v1.exec(`
      CREATE TABLE books (id TEXT PRIMARY KEY, list_id TEXT NOT NULL CHECK (list_id IN ('fiction','nonfiction')), title TEXT NOT NULL, author TEXT NOT NULL, position INTEGER NOT NULL);
      CREATE TABLE reading_status (reader_id TEXT NOT NULL, book_id TEXT NOT NULL REFERENCES books(id), read INTEGER NOT NULL DEFAULT 0, updated_at TEXT, PRIMARY KEY (reader_id, book_id));
      CREATE TABLE video_progress (reader_id TEXT PRIMARY KEY, position_seconds REAL NOT NULL, updated_at TEXT NOT NULL);
      INSERT INTO books VALUES ('matilda','fiction','Matilda','Roald Dahl',2);
      INSERT INTO reading_status VALUES ('demo-reader','matilda',1,'2026-11-01T00:00:00.000Z');
      INSERT INTO video_progress VALUES ('demo-reader', 12.3, '2026-11-01T00:00:00.000Z');
    `);
    v1.close();
    app = await makeApp(db.path);
    const lists = (await get("/api/books")).json();
    expect(lists.lists[0].readCount).toBe(1);
    expect((await get("/api/video-progress")).json().positionSeconds).toBe(12.3);
    expect(await library()).toHaveLength(10);
    expect((await book("matilda")).progress.status).toBe("completed");
  });

  it("with a local override, every book opens the override text and says so", async () => {
    await app.close();
    const dir = mkdtempSync(join(tmpdir(), "rct-override-"));
    mkdirSync(join(dir, "local"));
    const override = join(dir, "local", "override.json");
    writeFileSync(
      override,
      JSON.stringify({ id: "local", title: "Demo Text", author: "Me", chapters: [{ title: "One", startPage: 1 }], pages: [{ chapter: 0, paragraphs: ["Hello."] }, { chapter: 0, paragraphs: ["World."] }] }),
    );
    app = await makeApp(db.path, new ContentStore({ overridePath: override }));
    const hobbit = await book("the-hobbit");
    expect(hobbit).toMatchObject({ readable: true, contentNote: "Reading “Demo Text” (local demo text) for every book." });
    expect(hobbit.progress.totalPages).toBe(2);
    expect(((await get("/api/books/the-hobbit/pages/2")).json() as Page).paragraphs).toEqual(["World."]);
    rmSync(dir, { recursive: true, force: true });
  });
});
