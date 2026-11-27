import { test as base, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const API_PORT = 4000;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const serverEntry = resolve(__dirname, "../apps/api/dist/server.js");

/** Runs the real Node API on a temporary SQLite file. `restart()` keeps the same file. */
class ApiServer {
  private proc: ChildProcess | null = null;
  readonly dir = mkdtempSync(join(tmpdir(), "rct-e2e-"));
  readonly dbPath = join(this.dir, "reading.db");
  readonly url = API_URL;

  async start() {
    this.proc = spawn(process.execPath, ["--no-warnings", serverEntry], {
      // CONTENT_OVERRIDE="" → always the committed public-domain texts, never a local override on this machine.
      env: { ...process.env, API_PORT: String(API_PORT), API_HOST: "127.0.0.1", DATABASE_PATH: this.dbPath, LOG_LEVEL: "warn", CONTENT_OVERRIDE: "" },
      stdio: ["ignore", "inherit", "inherit"],
    });
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (res.ok) return;
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("API did not start");
  }

  async stop() {
    const proc = this.proc;
    if (!proc || proc.exitCode !== null) return;
    const exited = new Promise((r) => proc.once("exit", r));
    proc.kill("SIGTERM");
    await exited;
    this.proc = null;
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  async dispose() {
    await this.stop();
    rmSync(this.dir, { recursive: true, force: true });
  }
}

export const test = base.extend<{ api: ApiServer }>({
  api: [
    async ({}, use) => {
      const server = new ApiServer();
      await server.start();
      await use(server);
      await server.dispose();
    },
    { auto: true },
  ],
});

export { expect };

export async function openChallenge(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("count-fiction")).toBeVisible();
}

export const count = (page: Page, list: "fiction" | "nonfiction") => page.getByTestId(`count-${list}`);
