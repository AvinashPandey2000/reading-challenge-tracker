import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { claimCodeFor, type Reward } from "@rct/shared";
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

const read = (id: string, value = true) =>
  app.inject({ method: "PATCH", url: `/api/books/${id}`, payload: { read: value } });
const rewards = async () => {
  const res = await app.inject({ method: "GET", url: "/api/rewards" });
  expect(res.statusCode).toBe(200);
  expect(res.headers["cache-control"]).toBe("no-store");
  return res.json() as { rewards: Reward[]; offer: { endsAt: string; daysLeft: number; ended: boolean } };
};
const byId = (r: Reward[], id: string) => r.find((x) => x.id === id)!;

const FICTION = ["the-hobbit", "matilda", "the-secret-garden"];
const NONFICTION = ["the-story-of-my-life", "a-brief-history-of-time", "the-diary-of-a-young-girl"];

describe("GET /api/rewards", () => {
  it("is all locked on a fresh database and includes the offer", async () => {
    const body = await rewards();
    expect(body.rewards.every((r) => !r.unlocked)).toBe(true);
    expect(body.offer.endsAt).toBe("2027-01-31T23:59:59Z");
    expect(typeof body.offer.daysLeft).toBe("number");
  });

  it("finishing Fiction unlocks only the Fiction bookmark", async () => {
    for (const id of FICTION) await read(id);
    const r = (await rewards()).rewards;
    expect(byId(r, "fiction-bookmark").unlocked).toBe(true);
    expect(byId(r, "nonfiction-bookmark").unlocked).toBe(false);
    expect(byId(r, "challenge-tote")).toMatchObject({ unlocked: false, current: 3, total: 6, claimCode: null });
  });

  it("finishing all six unlocks the tote with a stable claim code; un-reading locks it again", async () => {
    for (const id of [...FICTION, ...NONFICTION]) await read(id);
    const tote = byId((await rewards()).rewards, "challenge-tote");
    expect(tote.unlocked).toBe(true);
    expect(tote.claimCode).toBe(claimCodeFor("demo-reader", "challenge-tote"));

    await read("matilda", false);
    const r = (await rewards()).rewards;
    expect(byId(r, "challenge-tote")).toMatchObject({ unlocked: false, claimCode: null });
    expect(byId(r, "fiction-bookmark").unlocked).toBe(false);
    expect(byId(r, "nonfiction-bookmark").unlocked).toBe(true);
  });
});
