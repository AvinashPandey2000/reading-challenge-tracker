import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";
import { ContentStore } from "../src/content/store.js";

/** Each call gets its own temporary SQLite file so tests never share state. */
export function tempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "rct-api-"));
  return { path: join(dir, "reading.db"), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Tests always use the committed public-domain texts, never a local override on the dev machine. */
export async function makeApp(dbPath: string, content = new ContentStore({ overridePath: null })) {
  const app = await buildApp({ dbPath, content });
  await app.ready();
  return app;
}
