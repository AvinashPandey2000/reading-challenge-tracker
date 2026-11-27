import { describe, expect, it } from "vitest";
import { booksReducer, initialBooksState, type BooksState } from "./bookState.js";
import type { ReadingList } from "./schemas.js";
import { formatCount, formatTimestamp, resumePosition } from "./format.js";
import { UpdateBookBodySchema, SaveVideoProgressBodySchema } from "./schemas.js";

const lists: ReadingList[] = [
  {
    id: "fiction",
    title: "Fiction",
    readCount: 0,
    total: 2,
    books: [
      { id: "matilda", listId: "fiction", title: "Matilda", author: "Roald Dahl", read: false, updatedAt: null },
      { id: "the-hobbit", listId: "fiction", title: "The Hobbit", author: "J. R. R. Tolkien", read: false, updatedAt: null },
    ],
  },
];

const ready: BooksState = booksReducer(initialBooksState, { type: "load/success", lists });

describe("booksReducer", () => {
  it("keeps the confirmed value while a save is pending", () => {
    const s = booksReducer(ready, { type: "save/start", bookId: "matilda", read: true });
    expect(s.pending).toEqual({ matilda: true });
    expect(s.lists[0]!.books[0]!.read).toBe(false);
    expect(s.lists[0]!.readCount).toBe(0);
  });

  it("ignores a duplicate in-flight save for the same book but allows other books", () => {
    const a = booksReducer(ready, { type: "save/start", bookId: "matilda", read: true });
    const b = booksReducer(a, { type: "save/start", bookId: "matilda", read: false });
    expect(b).toBe(a);
    const c = booksReducer(b, { type: "save/start", bookId: "the-hobbit", read: true });
    expect(c.pending).toEqual({ matilda: true, "the-hobbit": true });
  });

  it("updates the row and the count together on success", () => {
    const a = booksReducer(ready, { type: "save/start", bookId: "matilda", read: true });
    const b = booksReducer(a, {
      type: "save/success",
      announcement: "Matilda marked as read.",
      response: {
        book: { ...lists[0]!.books[0]!, read: true, updatedAt: "2026-01-01T00:00:00.000Z" },
        list: { id: "fiction", title: "Fiction", readCount: 1, total: 2 },
      },
    });
    expect(b.lists[0]!.books[0]!.read).toBe(true);
    expect(b.lists[0]!.readCount).toBe(1);
    expect(b.pending).toEqual({});
    expect(b.lastSavedId).toBe("matilda");
  });

  it("keeps the confirmed value and records a retryable error on failure", () => {
    const a = booksReducer(ready, { type: "save/start", bookId: "matilda", read: true });
    const b = booksReducer(a, { type: "save/failure", bookId: "matilda", read: true });
    expect(b.lists[0]!.books[0]!.read).toBe(false);
    expect(b.lists[0]!.readCount).toBe(0);
    expect(b.errors.matilda).toEqual({ target: true, message: "Couldn't save Matilda. Try again." });
    const retry = booksReducer(b, { type: "save/start", bookId: "matilda", read: true });
    expect(retry.errors.matilda).toBeUndefined();
  });

  it("shows the error state only when nothing has loaded yet", () => {
    const failed = booksReducer(initialBooksState, { type: "load/failure", message: "x" });
    expect(failed.status).toBe("error");
    const stillReady = booksReducer(ready, { type: "load/failure", message: "x" });
    expect(stillReady.status).toBe("ready");
  });
});

describe("format helpers", () => {
  it("formats counts and timestamps", () => {
    expect(formatCount(1, 3)).toBe("1 of 3 read");
    expect(formatTimestamp(12.7)).toBe("0:12");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });
  it("clamps resume positions", () => {
    expect(resumePosition(12, 45)).toBe(12);
    expect(resumePosition(44.8, 45)).toBe(0);
    expect(resumePosition(-1, 45)).toBe(0);
    expect(resumePosition(12, NaN)).toBe(12);
  });
});

describe("schemas", () => {
  it("accepts only JSON booleans for read", () => {
    expect(UpdateBookBodySchema.safeParse({ read: true }).success).toBe(true);
    for (const bad of [{}, { read: null }, { read: 0 }, { read: 1 }, { read: "false" }, { read: true, extra: 1 }]) {
      expect(UpdateBookBodySchema.safeParse(bad).success).toBe(false);
    }
  });
  it("validates playback positions", () => {
    expect(SaveVideoProgressBodySchema.safeParse({ positionSeconds: 12.4 }).success).toBe(true);
    for (const bad of [{}, { positionSeconds: -1 }, { positionSeconds: "12" }, { positionSeconds: null }]) {
      expect(SaveVideoProgressBodySchema.safeParse(bad).success).toBe(false);
    }
  });
});
