/**
 * Builds reader content for the public-domain books (outputs committed to apps/api/content/).
 *   npx tsx scripts/build-content.mts <dir with pg113.txt pg2397.txt pg11.txt pg289.txt pg16.txt pg205.txt>
 * Source: Project Gutenberg (mirror gutenberg.pglaf.org), used only as a text source; the Gutenberg
 * header, footer and licence text are stripped. All six works are public domain (see ASSETS.md).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { paginate, toParagraphs, type ChapterText } from "../apps/api/src/content/paginate.ts";

const dir = process.argv[2];
if (!dir) throw new Error("usage: build-content.mts <gutenberg dir>");
const out = resolve(import.meta.dirname, "../apps/api/content");
mkdirSync(out, { recursive: true });

const body = (n: number) => {
  const raw = readFileSync(join(dir, `pg${n}.txt`), "utf8").replace(/\r/g, "");
  const start = raw.indexOf("\n", raw.indexOf("*** START OF THE PROJECT GUTENBERG")) + 1;
  const end = raw.indexOf("*** END OF THE PROJECT GUTENBERG");
  return raw.slice(start, end).split("\n");
};
const SMALL = new Set(["a", "an", "and", "the", "of", "in", "on", "to", "for", "at", "by", "or"]);
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.$/, "")
    .split(" ")
    .map((w, i) => (/^[ivxlc]+\.?$/.test(w) ? w.toUpperCase() : i > 0 && SMALL.has(w) ? w : w.replace(/^([“"'(]?)([a-z])/, (_, a: string, b: string) => a + b.toUpperCase())))
    .join(" ");
const chapterLabel = (h: string, t: string | null) => {
  const num = h.replace(/^chapter\s+/i, "").match(/^[IVXLC]+/)?.[0] ?? h;
  return t ? `Chapter ${num} — ${titleCase(t)}` : `Chapter ${num}`;
};

/**
 * Splits lines into chapters at heading lines. A heading may be followed by a title line.
 * The body begins at the first heading whose chapter has real content (skips the contents list).
 */
function chaptersFrom(lines: string[], isHeading: (l: string) => boolean, opts: { titleNext?: boolean; stopAt?: RegExp; label?: (h: string, t: string | null) => string }) {
  const idx = lines.map((l, i) => (isHeading(l.trim()) ? i : -1)).filter((i) => i >= 0);
  // The stop heading also appears in the contents list, so use its last occurrence.
  const stop = opts.stopAt ? lines.findLastIndex((l) => opts.stopAt!.test(l.trim())) : -1;
  const chapters: ChapterText[] = [];
  idx.forEach((start, k) => {
    let end = idx[k + 1] ?? lines.length;
    if (stop > 0 && end > stop) end = stop;
    if (stop > 0 && start >= stop) return;
    const heading = lines[start]!.trim();
    let first = start + 1;
    while (first < end && !lines[first]!.trim()) first++;
    let title: string | null = null;
    if (opts.titleNext && first < end && lines[first]!.trim().length < 70 && /^[A-Z“"'’ ,.;:!?&-]+$/i.test(lines[first]!.trim()) && lines[first + 1]?.trim() === "") {
      title = lines[first]!.trim();
      first++;
    }
    const paragraphs = toParagraphs(lines.slice(first, end).join("\n"));
    const size = paragraphs.join("").length;
    if (size < 400) return; // contents-list entries
    chapters.push({ title: opts.label ? opts.label(heading, title) : title ? titleCase(title) : heading, paragraphs });
  });
  return chapters;
}

const roman = "[IVXLC]+";
const books: Record<string, () => ChapterText[]> = {
  "the-secret-garden": () =>
    chaptersFrom(body(113), (l) => new RegExp(`^CHAPTER ${roman}\\.?$`).test(l), { titleNext: true, label: chapterLabel }),
  "the-story-of-my-life": () =>
    chaptersFrom(body(2397), (l) => new RegExp(`^CHAPTER ${roman}$`).test(l), {
      stopAt: /^II\. LETTERS/i,
      label: (h) => chapterLabel(h, null),
    }),
  "alices-adventures-in-wonderland": () =>
    chaptersFrom(body(11), (l) => new RegExp(`^CHAPTER ${roman}\\.`).test(l), { titleNext: true, label: (h, t) => chapterLabel(h, t ?? (h.replace(/^CHAPTER [IVXLC]+\.\s*/, "") || null)) }),
  "the-wind-in-the-willows": () =>
    chaptersFrom(body(289), (l) => new RegExp(`^${roman}\\.$`).test(l), { titleNext: true, label: chapterLabel }),
  "peter-pan": () =>
    chaptersFrom(body(16), (l) => new RegExp(`^Chapter ${roman}\\.$`).test(l), { titleNext: true, label: chapterLabel }),
  walden: () => {
    const heads = ["Economy", "Where I Lived, and What I Lived For", "Reading", "Sounds", "Solitude", "Visitors", "The Bean-Field", "The Village", "The Ponds", "Baker Farm", "Higher Laws", "Brute Neighbors", "House-Warming", "Former Inhabitants and Winter Visitors", "Winter Animals", "The Pond in Winter", "Spring", "Conclusion"];
    const set = new Set(heads.map((h) => h.toLowerCase()));
    return chaptersFrom(body(205), (l) => set.has(l.toLowerCase()), { stopAt: /^ON THE DUTY OF CIVIL DISOBEDIENCE$/, label: (h) => heads.find((x) => x.toLowerCase() === h.toLowerCase()) ?? h });
  },
};

for (const [id, build] of Object.entries(books)) {
  const chapters = build();
  const content = paginate(chapters);
  writeFileSync(join(out, `${id}.json`), JSON.stringify({ id, ...content }));
  console.log(`${id}: ${chapters.length} chapters, ${content.pages.length} pages; first: ${content.chapters[0]?.title}; last: ${content.chapters.at(-1)?.title}`);
}
