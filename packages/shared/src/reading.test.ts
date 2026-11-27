import { describe, expect, it } from "vitest";
import {
  DEFAULT_READER_PREFS,
  ReaderPrefsSchema,
  SaveProgressBodySchema,
  computeStreak,
  deriveStatus,
  filterAndSearch,
  filterCounts,
  formatDuration,
  formatLastRead,
  goalProgress,
  progressPercent,
  readerColors,
  weekStart,
  type LibraryBook,
} from "./reading.js";
import { coverTitleLines } from "./covers.js";

const book = (title: string, author: string, category: string, status: LibraryBook["progress"]["status"]) =>
  ({ title, author, category, progress: { status } }) as unknown as LibraryBook;

describe("status and progress", () => {
  it("derives the status from the read flag and pages read", () => {
    expect(deriveStatus(false, 0)).toBe("not_started");
    expect(deriveStatus(false, 3)).toBe("reading");
    expect(deriveStatus(true, 0)).toBe("completed");
    expect(deriveStatus(true, 3)).toBe("completed");
  });
  it("computes the percentage, with Completed always 100", () => {
    expect(progressPercent("not_started", 0, 140)).toBe(0);
    expect(progressPercent("reading", 35, 140)).toBe(25);
    expect(progressPercent("completed", 10, 140)).toBe(100);
    expect(progressPercent("reading", 5, 0)).toBe(0);
  });
});

describe("filterAndSearch", () => {
  const books = [
    book("The Secret Garden", "Frances Hodgson Burnett", "Children's classic", "reading"),
    book("Alice's Adventures in Wonderland", "Lewis Carroll", "Fantasy", "not_started"),
    book("Walden", "Henry David Thoreau", "Essays", "completed"),
  ];
  it("filters by status and searches title, author and category (case and accent insensitive)", () => {
    expect(filterAndSearch(books, "all", "").length).toBe(3);
    expect(filterAndSearch(books, "reading", "").map((b) => b.title)).toEqual(["The Secret Garden"]);
    expect(filterAndSearch(books, "all", "ALICE").map((b) => b.title)).toEqual(["Alice's Adventures in Wonderland"]);
    expect(filterAndSearch(books, "all", "thoreau").length).toBe(1);
    expect(filterAndSearch(books, "all", "éssays").length).toBe(1);
    expect(filterAndSearch(books, "completed", "alice")).toEqual([]);
    expect(filterCounts(books)).toEqual({ all: 3, not_started: 1, reading: 1, completed: 1 });
  });
});

describe("streak and goal", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(computeStreak([], "2026-11-27")).toBe(0);
    expect(computeStreak(["2026-11-25", "2026-11-26", "2026-11-27"], "2026-11-27")).toBe(3);
    expect(computeStreak(["2026-11-25", "2026-11-26"], "2026-11-27")).toBe(2); // not read yet today
    expect(computeStreak(["2026-11-24", "2026-11-26", "2026-11-27"], "2026-11-27")).toBe(2); // gap
    expect(computeStreak(["2026-11-20"], "2026-11-27")).toBe(0);
    expect(computeStreak(["2026-02-28", "2026-03-01"], "2026-03-01")).toBe(2); // month boundary
  });
  it("tracks daily and weekly minute goals", () => {
    const activity = [
      { day: "2026-11-23", seconds: 600, pages: 2 }, // Monday
      { day: "2026-11-26", seconds: 300, pages: 1 },
      { day: "2026-11-27", seconds: 480, pages: 3 },
      { day: "2026-11-20", seconds: 9999, pages: 9 }, // previous week
    ];
    expect(weekStart("2026-11-27")).toBe("2026-11-23");
    expect(goalProgress({ period: "daily", minutes: 15 }, activity, "2026-11-27")).toEqual({
      period: "daily", targetMinutes: 15, minutesDone: 8, percent: 53, met: false,
    });
    expect(goalProgress({ period: "weekly", minutes: 20 }, activity, "2026-11-27")).toMatchObject({ minutesDone: 23, percent: 100, met: true });
  });
});

describe("formatting", () => {
  it("formats durations and last-read times", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(125)).toBe("2 min");
    expect(formatDuration(3720)).toBe("1 h 2 min");
    const now = new Date(2026, 10, 27, 15, 0);
    expect(formatLastRead(null, now)).toBe("Not opened yet");
    expect(formatLastRead(new Date(2026, 10, 27, 14, 58).toISOString(), now)).toBe("2 min ago");
    expect(formatLastRead(new Date(2026, 10, 27, 9, 5).toISOString(), now)).toBe("Today at 09:05");
    expect(formatLastRead(new Date(2026, 10, 26, 21, 30).toISOString(), now)).toBe("Yesterday at 21:30");
    expect(formatLastRead(new Date(2026, 9, 3, 12, 0).toISOString(), now)).toBe("3 Oct 2026");
  });
  it("splits cover titles", () => {
    expect(coverTitleLines("The Secret Garden")).toEqual(["The Secret", "Garden"]);
    expect(coverTitleLines("Matilda")).toEqual(["Matilda"]);
  });
});

describe("schemas", () => {
  it("validates reader preferences and progress bodies", () => {
    expect(ReaderPrefsSchema.safeParse(DEFAULT_READER_PREFS).success).toBe(true);
    expect(ReaderPrefsSchema.safeParse({ ...DEFAULT_READER_PREFS, fontSize: 40 }).success).toBe(false);
    expect(ReaderPrefsSchema.safeParse({ ...DEFAULT_READER_PREFS, lineSpacing: 1.6 }).success).toBe(false);
    expect(ReaderPrefsSchema.safeParse({ ...DEFAULT_READER_PREFS, theme: "sepia", background: "sage" }).success).toBe(true);
    expect(SaveProgressBodySchema.safeParse({ page: 3, day: "2026-11-27" }).success).toBe(true);
    expect(SaveProgressBodySchema.safeParse({ page: 0, day: "2026-11-27" }).success).toBe(false);
    expect(SaveProgressBodySchema.safeParse({ page: 2, day: "27/11/2026" }).success).toBe(false);
  });
  it("resolves reader colours with optional tints", () => {
    expect(readerColors({ theme: "sepia", background: "theme" }).background).toBe("#F4E9D3");
    expect(readerColors({ theme: "dark", background: "sage" }).background).toBe("#172019");
  });
});
