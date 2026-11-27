import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import { SaveVideoProgressBodySchema, UpdateBookBodySchema, computeRewards, offerState, savedAnnouncement } from "@rct/shared";
import { DEMO_READER_ID } from "./catalog.js";
import { Store } from "./db.js";
import { sendError } from "./errors.js";

export interface BuildAppOptions {
  dbPath: string;
  /** Comma-separated list of allowed origins, or "*" (development only). Unset = same-origin only. */
  corsOrigin?: string;
  logger?: FastifyServerOptions["logger"];
}

declare module "fastify" {
  interface FastifyInstance {
    store: Store;
  }
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 16 * 1024 });
  const store = new Store(opts.dbPath);
  app.decorate("store", store);
  app.addHook("onClose", async () => store.close());

  if (opts.corsOrigin) {
    const origins = opts.corsOrigin.split(",").map((o) => o.trim());
    await app.register(cors, {
      origin: origins.includes("*") ? true : origins,
      methods: ["GET", "PATCH", "PUT", "OPTIONS"],
    });
  }

  // Reader-specific data must never be cached by browsers, proxies or CDNs.
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("cache-control", "no-store");
    return payload;
  });

  app.setErrorHandler((err: { statusCode?: number; code?: string; message: string }, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status === 400 || err.code === "FST_ERR_CTP_EMPTY_JSON_BODY" || err.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
      return sendError(reply, 400, "INVALID_JSON", "The request body must be valid JSON.");
    }
    if (status === 413) {
      return sendError(reply, 413, "INVALID_JSON", "The request body is too large.");
    }
    if (status === 415) {
      return sendError(reply, 415, "INVALID_JSON", "Send the request body as application/json.");
    }
    req.log.error(err);
    return sendError(reply, 500, "INTERNAL_ERROR", "Something went wrong on the server. Try again.");
  });

  app.setNotFoundHandler((req, reply) =>
    sendError(reply, 404, "NOT_FOUND", `No route for ${req.method} ${req.url.split("?")[0]}.`),
  );

  app.get("/api/health", async (_req, reply) => {
    try {
      store.ping();
      return { ok: true };
    } catch {
      return sendError(reply, 503, "INTERNAL_ERROR", "Database unavailable.");
    }
  });

  app.get("/api/books", async () => ({ lists: store.listBooks() }));

  app.patch<{ Params: { id: string } }>("/api/books/:id", async (req, reply) => {
    const { id } = req.params;
    const existing = store.getBook(id);
    if (!existing) {
      return sendError(reply, 404, "BOOK_NOT_FOUND", `No book with id "${id}".`);
    }
    const parsed = UpdateBookBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.code === "unrecognized_keys"
        ? "Only \"read\" can be updated. Send {\"read\": true} or {\"read\": false}."
        : parsed.error.issues[0]?.message ?? "\"read\" must be true or false.";
      return sendError(reply, 400, "INVALID_STATUS", message);
    }
    const result = store.setRead(id, parsed.data.read)!;
    req.log.info({ bookId: id, read: parsed.data.read }, "book status saved");
    return {
      ...result,
      // Convenience text clients can announce verbatim.
      message: savedAnnouncement(result.book.title, result.book.read, result.list.title, result.list.readCount, result.list.total),
    };
  });

  // Rewards are derived from saved progress with the same function both clients use.
  app.get("/api/rewards", async () => ({
    rewards: computeRewards(store.listBooks(), DEMO_READER_ID),
    offer: offerState(),
  }));

  app.get("/api/video-progress", async () => store.getVideoProgress());

  app.put("/api/video-progress", async (req, reply) => {
    const parsed = SaveVideoProgressBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue?.code === "unrecognized_keys"
        ? "Only \"positionSeconds\" can be saved."
        : issue?.message ?? "\"positionSeconds\" must be a number of seconds.";
      return sendError(reply, 400, "INVALID_POSITION", message);
    }
    return store.saveVideoProgress(parsed.data.positionSeconds);
  });

  return app;
}
