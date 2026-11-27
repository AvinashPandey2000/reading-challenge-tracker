import type { ListsResponse } from "@rct/shared";

export const freshLists = (): ListsResponse => ({
  lists: [
    {
      id: "fiction", title: "Fiction", readCount: 0, total: 3,
      books: [
        { id: "the-hobbit", listId: "fiction", title: "The Hobbit", author: "J. R. R. Tolkien", read: false, updatedAt: null },
        { id: "matilda", listId: "fiction", title: "Matilda", author: "Roald Dahl", read: false, updatedAt: null },
        { id: "the-secret-garden", listId: "fiction", title: "The Secret Garden", author: "Frances Hodgson Burnett", read: false, updatedAt: null },
      ],
    },
    {
      id: "nonfiction", title: "Nonfiction", readCount: 0, total: 3,
      books: [
        { id: "the-story-of-my-life", listId: "nonfiction", title: "The Story of My Life", author: "Helen Keller", read: false, updatedAt: null },
        { id: "a-brief-history-of-time", listId: "nonfiction", title: "A Brief History of Time", author: "Stephen Hawking", read: false, updatedAt: null },
        { id: "the-diary-of-a-young-girl", listId: "nonfiction", title: "The Diary of a Young Girl", author: "Anne Frank", read: false, updatedAt: null },
      ],
    },
  ],
});

export const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

export function mockFetch(routes: Record<string, Handler>) {
  const fn = jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const key = `${(init?.method ?? "GET").toUpperCase()} ${path}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unmocked request: ${key}`);
    return handler(path, init);
  });
  (global as any).fetch = fn;
  return fn;
}

export function patchOk(lists: ListsResponse, readCountAfter: number): Handler {
  return (path, init) => {
    const id = path.split("/").pop()!;
    const { read } = JSON.parse(String(init?.body));
    const list = lists.lists.find((l) => l.books.some((b) => b.id === id))!;
    const book = list.books.find((b) => b.id === id)!;
    return json({ book: { ...book, read, updatedAt: "now" }, list: { id: list.id, title: list.title, readCount: readCountAfter, total: 3 } });
  };
}

export const progressRoutes = (initial = 0): Record<string, Handler> => ({
  "GET /api/video-progress": () => json({ positionSeconds: initial, updatedAt: initial ? "x" : null }),
  "PUT /api/video-progress": (_p, init) => json({ positionSeconds: JSON.parse(String(init!.body)).positionSeconds, updatedAt: "now" }),
});
