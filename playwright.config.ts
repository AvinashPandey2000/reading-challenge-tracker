import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the production build: `next start` on WEB_PORT, with /api rewritten to the
 * Node API on 127.0.0.1:4000. The API itself is started per test by the `api` fixture
 * (e2e/fixtures.ts) on a fresh temporary SQLite file, so tests can also restart it.
 * Port 4000 must be free (stop `npm run dev` / Docker first).
 */
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npm run build && npm run start -w @rct/web -- --port ${WEB_PORT} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${WEB_PORT}/robots.txt`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_SITE_URL: "https://reading.example.org" },
  },
});
