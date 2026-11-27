import { z } from "zod";

/** The two reading lists in the challenge. */
export const LIST_IDS = ["fiction", "nonfiction"] as const;
export const ListIdSchema = z.enum(LIST_IDS);
export type ListId = z.infer<typeof ListIdSchema>;

export const BookSchema = z.object({
  id: z.string(),
  /** null for books that are only in My Library (not part of the challenge lists) */
  listId: ListIdSchema.nullable(),
  title: z.string(),
  author: z.string(),
  read: z.boolean(),
  updatedAt: z.string().nullable(),
});
export type Book = z.infer<typeof BookSchema>;

export const ListSummarySchema = z.object({
  id: ListIdSchema,
  title: z.string(),
  readCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type ListSummary = z.infer<typeof ListSummarySchema>;

export const ReadingListSchema = ListSummarySchema.extend({
  books: z.array(BookSchema),
});
export type ReadingList = z.infer<typeof ReadingListSchema>;

export const ListsResponseSchema = z.object({
  lists: z.array(ReadingListSchema),
});
export type ListsResponse = z.infer<typeof ListsResponseSchema>;

/**
 * Body for PATCH /api/books/:id. `read` must be a real JSON boolean:
 * null, 0, 1, "true" and "false" are all rejected. Unknown keys are rejected too.
 */
export const UpdateBookBodySchema = z.strictObject({
  read: z.boolean({
    error: (issue) =>
      issue.input === undefined
        ? "Missing \"read\". Send {\"read\": true} or {\"read\": false}."
        : "\"read\" must be true or false (a JSON boolean).",
  }),
});
export type UpdateBookBody = z.infer<typeof UpdateBookBodySchema>;

export const UpdateBookResponseSchema = z.object({
  book: BookSchema,
  /** The challenge list's new count, or null for library-only books. */
  list: ListSummarySchema.nullable(),
});
export type UpdateBookResponse = z.infer<typeof UpdateBookResponseSchema>;

/** Upper bound for a saved playback position (6 hours) to reject nonsense values. */
export const MAX_POSITION_SECONDS = 6 * 60 * 60;

export const SaveVideoProgressBodySchema = z.strictObject({
  positionSeconds: z
    .number({ error: "\"positionSeconds\" must be a number of seconds." })
    .finite("\"positionSeconds\" must be a finite number.")
    .min(0, "\"positionSeconds\" can't be negative.")
    .max(MAX_POSITION_SECONDS, "\"positionSeconds\" is too large."),
});
export type SaveVideoProgressBody = z.infer<typeof SaveVideoProgressBodySchema>;

export const VideoProgressSchema = z.object({
  positionSeconds: z.number().nonnegative(),
  updatedAt: z.string().nullable(),
});
export type VideoProgress = z.infer<typeof VideoProgressSchema>;

export const ERROR_CODES = [
  "BOOK_NOT_FOUND",
  "INVALID_STATUS",
  "INVALID_POSITION",
  "INVALID_JSON",
  "INVALID_BODY",
  "NOT_READABLE",
  "PAGE_OUT_OF_RANGE",
  "NOT_FOUND",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
