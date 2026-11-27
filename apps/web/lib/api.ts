import {
  ApiErrorSchema,
  ListsResponseSchema,
  UpdateBookResponseSchema,
  VideoProgressSchema,
  type ListsResponse,
  type UpdateBookResponse,
  type VideoProgress,
} from "@rct/shared";

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

const TIMEOUT_MS = 10_000;

/** Reader data is never cached: every call goes to the backend. */
async function request<T>(path: string, parse: (data: unknown) => T, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
      signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("Network error", 0, "NETWORK");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(data);
    throw new ApiError(
      parsed.success ? parsed.data.error.message : `Request failed (${res.status})`,
      res.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
    );
  }
  return parse(data);
}

export const api = {
  getBooks: (): Promise<ListsResponse> => request("/api/books", (d) => ListsResponseSchema.parse(d)),
  setRead: (bookId: string, read: boolean): Promise<UpdateBookResponse> =>
    request(`/api/books/${encodeURIComponent(bookId)}`, (d) => UpdateBookResponseSchema.parse(d), {
      method: "PATCH",
      body: JSON.stringify({ read }),
    }),
  getVideoProgress: (): Promise<VideoProgress> => request("/api/video-progress", (d) => VideoProgressSchema.parse(d)),
  saveVideoProgress: (positionSeconds: number, opts?: { keepalive?: boolean }): Promise<VideoProgress> =>
    request("/api/video-progress", (d) => VideoProgressSchema.parse(d), {
      method: "PUT",
      body: JSON.stringify({ positionSeconds }),
      keepalive: opts?.keepalive,
    }),
};
