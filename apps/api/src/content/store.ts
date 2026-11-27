import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BookContent } from "./paginate.js";
import type { CatalogBook } from "../catalog.js";

interface StoredContent extends BookContent {
  id: string;
  title?: string;
  author?: string;
}

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Reader text.
 * - Public-domain books: apps/api/content/<bookId>.json (committed; built by scripts/build-content.mts).
 * - Optional local override: apps/api/content/local/override.json (git- and docker-ignored; created by
 *   scripts/import-local-book.mts from a PDF you own). While it exists, EVERY book opens that text.
 */
export class ContentStore {
  private cache = new Map<string, StoredContent | null>();
  readonly dir: string;
  readonly override: StoredContent | null;

  /**
   * @param opts.overridePath  path of the local override file; `null` disables it (tests).
   *        Defaults to $CONTENT_OVERRIDE or <dir>/local/override.json. CONTENT_OVERRIDE="" disables it.
   */
  constructor(opts: { dir?: string; overridePath?: string | null } = {}) {
    this.dir = opts.dir ?? process.env.CONTENT_DIR ?? resolve(here, "../../content");
    const fromEnv = process.env.CONTENT_OVERRIDE;
    const overridePath = opts.overridePath !== undefined ? opts.overridePath : fromEnv === "" ? null : (fromEnv ?? join(this.dir, "local", "override.json"));
    this.override = overridePath && existsSync(overridePath) ? (JSON.parse(readFileSync(overridePath, "utf8")) as StoredContent) : null;
  }

  /** Content for a book, or null if it can't be read in the app. */
  get(book: CatalogBook): StoredContent | null {
    if (this.override) return this.override;
    if (!book.readable) return null;
    if (!this.cache.has(book.id)) {
      const path = join(this.dir, `${book.id}.json`);
      this.cache.set(book.id, existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as StoredContent) : null);
    }
    return this.cache.get(book.id) ?? null;
  }

  /** Shown in the UI when every book opens the local stand-in text. */
  note(): string | null {
    return this.override ? `Reading “${this.override.title ?? "local text"}” (local demo text) for every book.` : null;
  }
}
