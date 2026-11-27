import type { FastifyInstance, FastifyReply } from "fastify";
import type { z } from "zod";
import {
  CreateBookmarkBodySchema,
  CreateHighlightBodySchema,
  CreateNoteBodySchema,
  DaySchema,
  ReaderPrefsSchema,
  SaveProgressBodySchema,
  UpdateHighlightBodySchema,
  UpdateNoteBodySchema,
} from "@rct/shared";
import { NotFound, NotReadable, OutOfRange, type ReadingRepo } from "../reading.js";
import { sendError } from "../errors.js";

/** Runs a handler and maps domain errors to the API's error shape. */
async function handle<T>(reply: FastifyReply, fn: () => T) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NotFound) return sendError(reply, 404, "NOT_FOUND", err.message);
    if (err instanceof NotReadable) return sendError(reply, 409, "NOT_READABLE", err.message);
    if (err instanceof OutOfRange) return sendError(reply, 404, "PAGE_OUT_OF_RANGE", err.message);
    throw err;
  }
}

function parse<S extends z.ZodType>(schema: S, body: unknown, reply: FastifyReply): z.infer<S> | null {
  const r = schema.safeParse(body ?? {});
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  const where = issue?.path.length ? `"${issue.path.join(".")}": ` : "";
  void sendError(reply, 400, "INVALID_BODY", issue?.code === "unrecognized_keys" ? `Unexpected field(s): ${(issue as { keys: string[] }).keys.join(", ")}.` : `${where}${issue?.message ?? "Invalid request body."}`);
  return null;
}

const intParam = (v: string) => (/^\d+$/.test(v) ? Number(v) : NaN);

export function registerReadingRoutes(app: FastifyInstance, repo: ReadingRepo) {
  app.get("/api/library", async () => ({ books: repo.library() }));

  app.get<{ Params: { id: string } }>("/api/books/:id/details", (req, reply) => handle(reply, () => repo.details(req.params.id)));

  app.get<{ Params: { id: string; n: string } }>("/api/books/:id/pages/:n", (req, reply) =>
    handle(reply, () => {
      const n = intParam(req.params.n);
      if (!Number.isInteger(n) || n < 1) return sendError(reply, 400, "INVALID_BODY", "Page numbers start at 1.");
      return repo.page(req.params.id, n);
    }),
  );

  app.put<{ Params: { id: string } }>("/api/books/:id/progress", (req, reply) =>
    handle(reply, () => {
      repo.catalogBook(req.params.id); // 404 before body validation, like PATCH /api/books/:id
      const body = parse(SaveProgressBodySchema, req.body, reply);
      if (!body) return reply;
      return repo.saveProgress(req.params.id, body.page, body.secondsDelta ?? 0, body.day);
    }),
  );

  app.delete<{ Params: { id: string } }>("/api/books/:id/progress", (req, reply) => handle(reply, () => repo.resetProgress(req.params.id)));

  // Bookmarks
  app.get<{ Params: { id: string } }>("/api/books/:id/bookmarks", (req, reply) => handle(reply, () => ({ bookmarks: repo.listBookmarks(req.params.id) })));
  app.post<{ Params: { id: string } }>("/api/books/:id/bookmarks", (req, reply) =>
    handle(reply, () => {
      repo.catalogBook(req.params.id);
      const body = parse(CreateBookmarkBodySchema, req.body, reply);
      if (!body) return reply;
      return reply.code(201).send(repo.addBookmark(req.params.id, body.page, body.label));
    }),
  );
  app.delete<{ Params: { bid: string } }>("/api/bookmarks/:bid", (req, reply) =>
    handle(reply, () => {
      repo.deleteBookmark(intParam(req.params.bid));
      return { ok: true as const };
    }),
  );

  // Highlights
  app.get<{ Params: { id: string } }>("/api/books/:id/highlights", (req, reply) => handle(reply, () => ({ highlights: repo.listHighlights(req.params.id) })));
  app.post<{ Params: { id: string } }>("/api/books/:id/highlights", (req, reply) =>
    handle(reply, () => {
      repo.catalogBook(req.params.id);
      const body = parse(CreateHighlightBodySchema, req.body, reply);
      if (!body) return reply;
      return reply.code(201).send(repo.addHighlight(req.params.id, body.page, body.paragraph, body.color, body.note));
    }),
  );
  app.patch<{ Params: { hid: string } }>("/api/highlights/:hid", (req, reply) =>
    handle(reply, () => {
      const body = parse(UpdateHighlightBodySchema, req.body, reply);
      if (!body) return reply;
      return repo.updateHighlight(intParam(req.params.hid), body);
    }),
  );
  app.delete<{ Params: { hid: string } }>("/api/highlights/:hid", (req, reply) =>
    handle(reply, () => {
      repo.deleteHighlight(intParam(req.params.hid));
      return { ok: true as const };
    }),
  );

  // Notes
  app.get<{ Params: { id: string } }>("/api/books/:id/notes", (req, reply) => handle(reply, () => ({ notes: repo.listNotes(req.params.id) })));
  app.post<{ Params: { id: string } }>("/api/books/:id/notes", (req, reply) =>
    handle(reply, () => {
      repo.catalogBook(req.params.id);
      const body = parse(CreateNoteBodySchema, req.body, reply);
      if (!body) return reply;
      return reply.code(201).send(repo.addNote(req.params.id, body.text, body.page));
    }),
  );
  app.patch<{ Params: { nid: string } }>("/api/notes/:nid", (req, reply) =>
    handle(reply, () => {
      const body = parse(UpdateNoteBodySchema, req.body, reply);
      if (!body) return reply;
      return repo.updateNote(intParam(req.params.nid), body.text);
    }),
  );
  app.delete<{ Params: { nid: string } }>("/api/notes/:nid", (req, reply) =>
    handle(reply, () => {
      repo.deleteNote(intParam(req.params.nid));
      return { ok: true as const };
    }),
  );

  // Preferences (one copy per reader, shared by web and mobile)
  app.get("/api/reader/preferences", async () => repo.preferences());
  app.put("/api/reader/preferences", async (req, reply) => {
    const body = parse(ReaderPrefsSchema, req.body, reply);
    if (!body) return reply;
    return repo.savePreferences(body);
  });

  // Stats (the client says which local day it is, so streaks follow the reader's time zone)
  app.get<{ Querystring: { today?: string } }>("/api/reading/stats", async (req, reply) => {
    const day = DaySchema.safeParse(req.query.today);
    if (!day.success) return sendError(reply, 400, "INVALID_BODY", "Pass ?today=YYYY-MM-DD (the reader's local date).");
    return repo.stats(day.data);
  });
}
