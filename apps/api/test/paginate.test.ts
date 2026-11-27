import { describe, expect, it } from "vitest";
import { paginate, toParagraphs } from "../src/content/paginate.js";

describe("paginate", () => {
  it("starts each chapter on a new page, never makes empty pages and respects the size target", () => {
    const para = "A sentence that is about fifty characters long ok. ";
    const ch = (title: string, n: number) => ({ title, paragraphs: Array.from({ length: n }, () => para.repeat(4).trim()) });
    const content = paginate([ch("One", 20), ch("Two", 3), { title: "Empty", paragraphs: [] }], 1000);
    expect(content.chapters.map((c) => c.title)).toEqual(["One", "Two"]);
    expect(content.pages.every((p) => p.paragraphs.length > 0)).toBe(true);
    const twoStart = content.chapters[1]!.startPage;
    expect(content.pages[twoStart - 1]!.chapter).toBe(1);
    expect(content.pages[twoStart - 2]!.chapter).toBe(0);
    for (const p of content.pages) expect(p.paragraphs.join("").length).toBeLessThanOrEqual(1000 + 210);
  });

  it("splits very long paragraphs at sentence ends", () => {
    const long = "This is one sentence. ".repeat(200);
    const content = paginate([{ title: "Long", paragraphs: [long] }]);
    expect(content.pages.length).toBeGreaterThan(1);
    expect(content.pages.every((p) => p.paragraphs.every((x) => x.endsWith(".")))).toBe(true);
  });

  it("unwraps Gutenberg text into paragraphs", () => {
    expect(toParagraphs("Line one\nline two _here_.\n\n[Illustration]\n\n  *  *  *  \n\nNext.")).toEqual([
      "Line one line two here.",
      "Next.",
    ]);
  });
});
