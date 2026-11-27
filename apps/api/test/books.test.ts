import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { ListsResponse, UpdateBookResponse } from "@rct/shared";
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

const patch = (id: string, payload?: unknown, raw?: string) =>
  app.inject({
    method: "PATCH",
    url: `/api/books/${id}`,
    headers: payload === undefined && raw === undefined ? {} : { "content-type": "application/json" },
    payload: raw ?? (payload === undefined ? undefined : JSON.stringify(payload)),
  });

const getLists = async () => (await app.inject({ method: "GET", url: "/api/books" })).json() as ListsResponse;
const count = (lists: ListsResponse, id: string) => lists.lists.find((l) => l.id === id)!;

describe("GET /api/books on a fresh database", () => {
  it("returns two lists with exactly three unread books each", async () => {
    const res = await app.inject({ method: "GET", url: "/api/books" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const body = res.json() as ListsResponse;
    expect(body.lists.map((l) => l.id)).toEqual(["fiction", "nonfiction"]);
    expect(body.lists[0]!.books.map((b) => b.title)).toEqual(["The Hobbit", "Matilda", "The Secret Garden"]);
    expect(body.lists[1]!.books.map((b) => b.title)).toEqual([
      "The Story of My Life",
      "A Brief History of Time",
      "The Diary of a Young Girl",
    ]);
    for (const list of body.lists) {
      expect(list.books).toHaveLength(3);
      expect(list.books.every((b) => b.read === false)).toBe(true);
      expect(list.readCount).toBe(0);
      expect(list.total).toBe(3);
    }
  });
});

describe("PATCH /api/books/:id", () => {
  it("marks a book read and then unread, updating only its own list count", async () => {
    let res = await patch("matilda", { read: true });
    expect(res.statusCode).toBe(200);
    const body = res.json() as UpdateBookResponse & { message: string };
    expect(body.book).toMatchObject({ id: "matilda", read: true, listId: "fiction" });
    expect(body.list).toEqual({ id: "fiction", title: "Fiction", readCount: 1, total: 3 });
    expect(body.message).toBe("Matilda marked as read. Fiction: 1 of 3 read.");

    let lists = await getLists();
    expect(count(lists, "fiction").readCount).toBe(1);
    expect(count(lists, "nonfiction").readCount).toBe(0);

    res = await patch("matilda", { read: false });
    expect(res.statusCode).toBe(200);
    lists = await getLists();
    expect(count(lists, "fiction").readCount).toBe(0);
  });

  it("is idempotent: the same update twice leaves the same status and count", async () => {
    const first = (await patch("the-hobbit", { read: true })).json() as UpdateBookResponse;
    const second = (await patch("the-hobbit", { read: true })).json() as UpdateBookResponse;
    expect(second.book.read).toBe(true);
    expect(second.list.readCount).toBe(1);
    expect(second.book.updatedAt).toBe(first.book.updatedAt);
    expect(count(await getLists(), "fiction").readCount).toBe(1);
  });

  it("keeps independent counts for each list", async () => {
    await patch("matilda", { read: true });
    await patch("the-secret-garden", { read: true });
    await patch("a-brief-history-of-time", { read: true });
    const lists = await getLists();
    expect(count(lists, "fiction").readCount).toBe(2);
    expect(count(lists, "nonfiction").readCount).toBe(1);
  });

  it("returns 404 for an unknown book id", async () => {
    const res = await patch("war-and-peace", { read: true });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "BOOK_NOT_FOUND", message: 'No book with id "war-and-peace".' } });
  });

  it.each([
    ["missing body", undefined],
    ["empty object", {}],
    ["null", { read: null }],
    ["0", { read: 0 }],
    ["1", { read: 1 }],
    ['"false"', { read: "false" }],
    ['"true"', { read: "true" }],
    ["array", { read: [true] }],
    ["extra keys", { read: true, title: "Hacked" }],
  ])("returns 400 for %s and leaves the status unchanged", async (_label, payload) => {
    const res = await patch("matilda", payload);
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_STATUS");
    expect(body.error.message.length).toBeGreaterThan(10);
    expect(count(await getLists(), "fiction").readCount).toBe(0);
  });

  it("returns a readable 400 for malformed JSON", async () => {
    const res = await patch("matilda", undefined, "{read: true");
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "INVALID_JSON", message: "The request body must be valid JSON." } });
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });
});

describe("persistence", () => {
  it("survives a server restart and seeding never overwrites saved status", async () => {
    await patch("matilda", { read: true });
    await app.inject({ method: "PUT", url: "/api/video-progress", payload: { positionSeconds: 12.4 } });
    await app.close();

    app = await makeApp(db.path); // same file, fresh process state; seed runs again
    const lists = await getLists();
    expect(count(lists, "fiction").readCount).toBe(1);
    expect(lists.lists[0]!.books.find((b) => b.id === "matilda")!.read).toBe(true);
    expect(count(lists, "nonfiction").readCount).toBe(0);
    const progress = (await app.inject({ method: "GET", url: "/api/video-progress" })).json();
    expect(progress.positionSeconds).toBe(12.4);
  });
});

describe("GET /api/health", () => {
  it("reports ok", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
