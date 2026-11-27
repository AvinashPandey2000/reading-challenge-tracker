import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, tempDbPath } from "./helpers.js";

let app: FastifyInstance;
let db: ReturnType<typeof tempDbPath>;

beforeEach(async () => {
  db = tempDbPath();
  app = await makeApp(db.path);
});
afterEach(async () => {
  await app.close();
  db.cleanup();
});

const put = (payload: unknown) =>
  app.inject({ method: "PUT", url: "/api/video-progress", payload: payload as object });
const get = async () => (await app.inject({ method: "GET", url: "/api/video-progress" })).json();

describe("video progress", () => {
  it("starts at 0 with no saved timestamp", async () => {
    expect(await get()).toEqual({ positionSeconds: 0, updatedAt: null });
  });

  it("saves the exact position and returns it", async () => {
    const res = await put({ positionSeconds: 12.345 });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.json().positionSeconds).toBe(12.345);
    expect((await get()).positionSeconds).toBe(12.345);
  });

  it("lets an earlier position overwrite a later one (seeking backward)", async () => {
    await put({ positionSeconds: 30 });
    await put({ positionSeconds: 8.5 });
    expect((await get()).positionSeconds).toBe(8.5);
  });

  it.each([
    ["missing", {}],
    ["negative", { positionSeconds: -1 }],
    ["string", { positionSeconds: "12" }],
    ["null", { positionSeconds: null }],
    ["too large", { positionSeconds: 10 ** 9 }],
    ["extra keys", { positionSeconds: 1, readerId: "someone-else" }],
  ])("rejects %s with 400", async (_label, payload) => {
    await put({ positionSeconds: 5 });
    const res = await put(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_POSITION");
    expect((await get()).positionSeconds).toBe(5);
  });
});
