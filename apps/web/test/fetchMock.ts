import { vi } from "vitest";
import type { ListsResponse } from "@rct/shared";

export const freshLists = (): ListsResponse => ({
  lists: [
    {
      id: "fiction",
      title: "Fiction",
      readCount: 0,
      total: 3,
      books: [
        { id: "the-hobbit", listId: "fiction", title: "The Hobbit", author: "J. R. R. Tolkien", read: false, updatedAt: null },
        { id: "matilda", listId: "fiction", title: "Matilda", author: "Roald Dahl", read: false, updatedAt: null },
        { id: "the-secret-garden", listId: "fiction", title: "The Secret Garden", author: "Frances Hodgson Burnett", read: false, updatedAt: null },
      ],
    },
    {
      id: "nonfiction",
      title: "Nonfiction",
      readCount: 0,
      total: 3,
      books: [
        { id: "the-story-of-my-life", listId: "nonfiction", title: "The Story of My Life", author: "Helen Keller", read: false, updatedAt: null },
        { id: "a-brief-history-of-time", listId: "nonfiction", title: "A Brief History of Time", author: "Stephen Hawking", read: false, updatedAt: null },
        { id: "the-diary-of-a-young-girl", listId: "nonfiction", title: "The Diary of a Young Girl", author: "Anne Frank", read: false, updatedAt: null },
      ],
    },
  ],
});

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Installs a fetch mock that routes by "METHOD path". */
export function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const key = `${(init?.method ?? "GET").toUpperCase()} ${url}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unmocked request: ${key}`);
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** PATCH handler that mirrors the real API for one book. */
export function patchOk(lists: ListsResponse, readCountAfter: number) {
  return (url: string, init?: RequestInit) => {
    const id = url.split("/").pop()!;
    const { read } = JSON.parse(String(init?.body)) as { read: boolean };
    const list = lists.lists.find((l) => l.books.some((b) => b.id === id))!;
    const book = list.books.find((b) => b.id === id)!;
    return json({
      book: { ...book, read, updatedAt: "2026-11-27T10:00:00.000Z" },
      list: { id: list.id, title: list.title, readCount: readCountAfter, total: 3 },
    });
  };
}
