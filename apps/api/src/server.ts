import { resolve } from "node:path";
import { buildApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";
const dbPath = resolve(process.env.DATABASE_PATH ?? "./data/reading.db");

const app = await buildApp({
  dbPath,
  corsOrigin: process.env.CORS_ORIGIN,
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, "shutting down");
  const timer = setTimeout(() => process.exit(1), 10_000);
  timer.unref();
  try {
    await app.close(); // stops accepting connections, then closes SQLite (onClose hook)
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port, host });
  app.log.info({ dbPath }, "reading challenge API ready");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
