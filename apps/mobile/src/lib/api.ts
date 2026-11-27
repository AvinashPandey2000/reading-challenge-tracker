import {
  ApiErrorSchema,
  ListsResponseSchema,
  UpdateBookResponseSchema,
  VideoProgressSchema,
  type ListsResponse,
  type UpdateBookResponse,
  type VideoProgress,
} from "@rct/shared";
import { BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

async function request<T>(path: string, parse: (d: unknown) => T, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // Never cached: a fresh fetch must reflect changes made on the web client.
      headers: { accept: "application/json", "cache-control": "no-store", ...(init?.body ? { "content-type": "application/json" } : {}) },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Network error", 0, "NETWORK");
  } finally {
    clearTimeout(timer);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(data);
    throw new ApiError(parsed.success ? parsed.data.error.message : `HTTP ${res.status}`, res.status, parsed.success ? parsed.data.error.code : "HTTP_ERROR");
  }
  return parse(data);
}

export const api = {
  getBooks: (): Promise<ListsResponse> => request("/api/books", (d) => ListsResponseSchema.parse(d)),
  setRead: (id: string, read: boolean): Promise<UpdateBookResponse> =>
    request(`/api/books/${encodeURIComponent(id)}`, (d) => UpdateBookResponseSchema.parse(d), { method: "PATCH", body: JSON.stringify({ read }) }),
  getVideoProgress: (): Promise<VideoProgress> => request("/api/video-progress", (d) => VideoProgressSchema.parse(d)),
  saveVideoProgress: (positionSeconds: number): Promise<VideoProgress> =>
    request("/api/video-progress", (d) => VideoProgressSchema.parse(d), { method: "PUT", body: JSON.stringify({ positionSeconds }) }),
};
