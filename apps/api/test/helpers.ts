import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";

/** Each call gets its own temporary SQLite file so tests never share state. */
export function tempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "rct-api-"));
  return { path: join(dir, "reading.db"), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export async function makeApp(dbPath: string) {
  const app = await buildApp({ dbPath });
  await app.ready();
  return app;
}
