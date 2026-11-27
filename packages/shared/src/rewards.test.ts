import { describe, expect, it } from "vitest";
import type { ReadingList } from "./schemas.js";
import { claimCodeFor, computeRewards, newlyUnlocked, offerMessage, offerState } from "./rewards.js";

const list = (id: "fiction" | "nonfiction", readCount: number): ReadingList => ({
  id,
  title: id === "fiction" ? "Fiction" : "Nonfiction",
  readCount,
  total: 3,
  books: [],
});

describe("computeRewards", () => {
  it("starts with everything locked", () => {
    const r = computeRewards([list("fiction", 0), list("nonfiction", 0)], "demo-reader");
    expect(r.map((x) => [x.id, x.unlocked, x.current, x.total])).toEqual([
      ["fiction-bookmark", false, 0, 3],
      ["nonfiction-bookmark", false, 0, 3],
      ["challenge-tote", false, 0, 6],
    ]);
    expect(r.every((x) => x.claimCode === null)).toBe(true);
  });

  it("unlocks each list bookmark independently", () => {
    const r = computeRewards([list("fiction", 3), list("nonfiction", 2)], "demo-reader");
    expect(r.find((x) => x.id === "fiction-bookmark")!.unlocked).toBe(true);
    expect(r.find((x) => x.id === "nonfiction-bookmark")!.unlocked).toBe(false);
    expect(r.find((x) => x.id === "challenge-tote")).toMatchObject({ unlocked: false, current: 5, claimCode: null });
  });

  it("unlocks the tote with a stable claim code when all six are read", () => {
    const r = computeRewards([list("fiction", 3), list("nonfiction", 3)], "demo-reader");
    const tote = r.find((x) => x.id === "challenge-tote")!;
    expect(tote.unlocked).toBe(true);
    expect(tote.claimCode).toMatch(/^LANTERN-[A-Z2-9]{4}$/);
    expect(tote.claimCode).toBe(claimCodeFor("demo-reader", "challenge-tote"));
    expect(claimCodeFor("someone-else", "challenge-tote")).not.toBe(tote.claimCode);
  });

  it("never unlocks the tote when a list is missing", () => {
    const r = computeRewards([list("fiction", 3)], "r");
    expect(r.find((x) => x.id === "challenge-tote")!.unlocked).toBe(false);
  });

  it("reports only newly unlocked rewards", () => {
    const before = computeRewards([list("fiction", 2), list("nonfiction", 3)], "r");
    const after = computeRewards([list("fiction", 3), list("nonfiction", 3)], "r");
    expect(newlyUnlocked(before, after)).toEqual(["Fiction bookmark", "Lantern Lane tote bag"]);
    expect(newlyUnlocked(after, after)).toEqual([]);
  });
});

describe("offer", () => {
  it("counts days left and words the banner", () => {
    const s = offerState(new Date("2026-11-27T10:00:00Z"));
    expect(s).toEqual({ endsAt: "2027-01-31T23:59:59Z", daysLeft: 66, ended: false });
    expect(offerMessage(s)).toEqual({
      headline: "Finish both lists by 31 January 2027 and your late fees are waived.",
      detail: "66 days left",
    });
    expect(offerMessage(offerState(new Date("2027-01-31T12:00:00Z"))).detail).toBe("1 day left");
  });
  it("handles the end of the offer", () => {
    const s = offerState(new Date("2027-02-01T00:00:00Z"));
    expect(s.ended).toBe(true);
    expect(s.daysLeft).toBe(0);
    expect(offerMessage(s).headline).toBe("This offer ended on 31 January 2027.");
  });
});
