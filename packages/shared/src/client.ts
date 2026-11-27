import { z } from "zod";
import {
  ApiErrorSchema,
  ListsResponseSchema,
  UpdateBookResponseSchema,
  VideoProgressSchema,
  type ListsResponse,
  type UpdateBookResponse,
  type VideoProgress,
} from "./schemas.js";
import {
  BookDetailsSchema,
  BookmarkSchema,
  BookProgressSchema,
  HighlightSchema,
  LibraryResponseSchema,
  NoteSchema,
  PageSchema,
  ReaderPrefsSchema,
  SaveProgressResponseSchema,
  StatsSchema,
  type Bookmark,
  type BookDetails,
  type BookProgress,
  type Highlight,
  type HighlightColor,
  type LibraryResponse,
  type Note,
  type Page,
  type ReaderPrefs,
  type SaveProgressResponse,
  type Stats,
} from "./reading.js";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  keepalive?: boolean;
  signal?: AbortSignal;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * One API client for both the web app and the Expo app, so every endpoint, validation and
 * error message is identical. Reader data is never cached.
 */
export function createApiClient(baseUrl: string, fetchImpl: FetchLike = (i, init) => fetch(i, init), timeoutMs = 10_000) {
  async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit & RequestOptions): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
        signal: init?.signal ?? controller.signal,
      });
    } catch {
      throw new ApiError("Network error", 0, "NETWORK");
    } finally {
      clearTimeout(timer);
    }
    const data: unknown = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const parsed = ApiErrorSchema.safeParse(data);
      throw new ApiError(
        parsed.success ? parsed.data.error.message : `Request failed (${res.status})`,
        res.status,
        parsed.success ? parsed.data.error.code : "HTTP_ERROR",
      );
    }
    return schema.parse(data);
  }
  const json = (method: string, body?: unknown, opts?: RequestOptions) => ({
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...opts,
  });
  const id = encodeURIComponent;
  const Ok = z.object({ ok: z.literal(true) });

  return {
    // Challenge (assignment) endpoints
    getBooks: (): Promise<ListsResponse> => request("/api/books", ListsResponseSchema),
    setRead: (bookId: string, read: boolean): Promise<UpdateBookResponse> =>
      request(`/api/books/${id(bookId)}`, UpdateBookResponseSchema, json("PATCH", { read })),
    getVideoProgress: (): Promise<VideoProgress> => request("/api/video-progress", VideoProgressSchema),
    saveVideoProgress: (positionSeconds: number, opts?: RequestOptions): Promise<VideoProgress> =>
      request("/api/video-progress", VideoProgressSchema, json("PUT", { positionSeconds }, opts)),

    // Reading experience
    getLibrary: (): Promise<LibraryResponse> => request("/api/library", LibraryResponseSchema),
    getDetails: (bookId: string): Promise<BookDetails> => request(`/api/books/${id(bookId)}/details`, BookDetailsSchema),
    getPage: (bookId: string, page: number): Promise<Page> => request(`/api/books/${id(bookId)}/pages/${page}`, PageSchema),
    saveProgress: (bookId: string, body: { page: number; secondsDelta?: number; day: string }, opts?: RequestOptions): Promise<SaveProgressResponse> =>
      request(`/api/books/${id(bookId)}/progress`, SaveProgressResponseSchema, json("PUT", body, opts)),
    resetProgress: (bookId: string): Promise<{ progress: BookProgress }> =>
      request(`/api/books/${id(bookId)}/progress`, z.object({ progress: BookProgressSchema }), json("DELETE")),

    listBookmarks: (bookId: string): Promise<Bookmark[]> =>
      request(`/api/books/${id(bookId)}/bookmarks`, z.object({ bookmarks: z.array(BookmarkSchema) })).then((r) => r.bookmarks),
    addBookmark: (bookId: string, page: number, label?: string): Promise<Bookmark> =>
      request(`/api/books/${id(bookId)}/bookmarks`, BookmarkSchema, json("POST", { page, ...(label ? { label } : {}) })),
    deleteBookmark: (bookmarkId: number) => request(`/api/bookmarks/${bookmarkId}`, Ok, json("DELETE")),

    listHighlights: (bookId: string): Promise<Highlight[]> =>
      request(`/api/books/${id(bookId)}/highlights`, z.object({ highlights: z.array(HighlightSchema) })).then((r) => r.highlights),
    addHighlight: (bookId: string, body: { page: number; paragraph: number; color: HighlightColor; note?: string | null }): Promise<Highlight> =>
      request(`/api/books/${id(bookId)}/highlights`, HighlightSchema, json("POST", body)),
    updateHighlight: (highlightId: number, body: { color?: HighlightColor; note?: string | null }): Promise<Highlight> =>
      request(`/api/highlights/${highlightId}`, HighlightSchema, json("PATCH", body)),
    deleteHighlight: (highlightId: number) => request(`/api/highlights/${highlightId}`, Ok, json("DELETE")),

    listNotes: (bookId: string): Promise<Note[]> =>
      request(`/api/books/${id(bookId)}/notes`, z.object({ notes: z.array(NoteSchema) })).then((r) => r.notes),
    addNote: (bookId: string, text: string, page?: number | null): Promise<Note> =>
      request(`/api/books/${id(bookId)}/notes`, NoteSchema, json("POST", { text, ...(page ? { page } : {}) })),
    updateNote: (noteId: number, text: string): Promise<Note> => request(`/api/notes/${noteId}`, NoteSchema, json("PATCH", { text })),
    deleteNote: (noteId: number) => request(`/api/notes/${noteId}`, Ok, json("DELETE")),

    getPreferences: (): Promise<ReaderPrefs> => request("/api/reader/preferences", ReaderPrefsSchema),
    savePreferences: (prefs: ReaderPrefs): Promise<ReaderPrefs> => request("/api/reader/preferences", ReaderPrefsSchema, json("PUT", prefs)),
    getStats: (today: string): Promise<Stats> => request(`/api/reading/stats?today=${id(today)}`, StatsSchema),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
