// Process supervisor for the single production container.
// Starts the API (internal, 127.0.0.1:4000) and the Next.js server (public, 0.0.0.0:3000).
// - Forwards SIGTERM/SIGINT to both and waits for them to close (SQLite is closed cleanly).
// - If either process exits unexpectedly, stops the other and exits non-zero so the
//   container's restart policy can take over.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// Inside the image: /app/api/... and /app/web/...; locally (`npm start`) the repo layout is used.
const inImage = here === "/app";
const apiEntry = inImage ? "/app/api/apps/api/dist/server.js" : join(here, "../apps/api/dist/server.js");
const webEntry = inImage ? "/app/web/apps/web/server.js" : join(here, "../apps/web/.next/standalone/apps/web/server.js");

const children = new Map();
let shuttingDown = false;

function start(name, entry, env) {
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", entry], {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  children.set(name, child);
  child.on("exit", (code, signal) => {
    children.delete(name);
    if (!shuttingDown) {
      console.error(`[start] ${name} exited unexpectedly (code=${code}, signal=${signal}); stopping container`);
      shutdown("child-exit", 1);
    } else if (children.size === 0) {
      process.exit(process.exitCode ?? 0);
    }
  });
  return child;
}

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  console.log(`[start] shutting down (${reason})`);
  for (const child of children.values()) child.kill("SIGTERM");
  if (children.size === 0) process.exit(exitCode);
  setTimeout(() => {
    for (const child of children.values()) child.kill("SIGKILL");
    process.exit(exitCode || 1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start("api", apiEntry, {
  API_HOST: process.env.API_HOST ?? "127.0.0.1",
  API_PORT: process.env.API_PORT ?? "4000",
});
start("web", webEntry, {
  PORT: process.env.PORT ?? "3000",
  HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
});
console.log(`[start] web on :${process.env.PORT ?? 3000}, api on ${process.env.API_HOST ?? "127.0.0.1"}:${process.env.API_PORT ?? 4000}`);
