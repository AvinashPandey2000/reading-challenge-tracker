/**
 * Imports a PDF you own as a LOCAL reader text. While it exists, every book opens this text in the
 * reader (web and mobile). The output is git-ignored and docker-ignored: it is never committed,
 * published or baked into the image, so copyrighted books stay on your machine.
 *
 *   npx tsx scripts/import-local-book.mts "<file.pdf>" --title "Book title" --author "Author"
 *   rm -r apps/api/content/local     # back to the public-domain texts
 *
 * Only counts are printed — never the book's text.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { paginate, type ChapterText } from "../apps/api/src/content/paginate.ts";

const args = process.argv.slice(2);
const file = args[0];
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!file) throw new Error('usage: import-local-book.mts <file.pdf> --title "…" --author "…"');

interface Line {
  text: string;
  y: number;
  x: number;
  right: number;
  height: number;
}

const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true, verbosity: 0 }).promise;
const info = (await doc.getMetadata().catch(() => null))?.info as { Title?: string; Author?: string } | undefined;
const title = flag("title") ?? info?.Title ?? "Local book";
const author = flag("author") ?? info?.Author ?? "Unknown author";

// 1. Text lines per PDF page
const pagesLines: Line[][] = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  const lines: Line[] = [];
  let cur: Line | null = null;
  for (const item of content.items as { str: string; transform: number[]; height: number; width: number; hasEOL: boolean }[]) {
    if (!("str" in item)) continue;
    const y = Math.round(item.transform[5]!);
    const x = item.transform[4]!;
    if (!cur || Math.abs(cur.y - y) > 2) {
      if (cur && cur.text.trim()) lines.push(cur);
      cur = { text: "", y, x, right: x, height: item.height || 10 };
    }
    cur.text += item.str;
    if (item.str.trim()) cur.right = Math.max(cur.right, x + (item.width || 0));
    if (item.hasEOL) {
      if (cur.text.trim()) lines.push(cur);
      cur = null;
    }
  }
  if (cur && cur.text.trim()) lines.push(cur);
  pagesLines.push(lines);
}

// 2. Drop running headers/footers: page numbers and lines repeated on many pages
const norm = (s: string) => s.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
const freq = new Map<string, number>();
for (const lines of pagesLines) for (const l of new Set(lines.map((x) => norm(x.text)))) freq.set(l, (freq.get(l) ?? 0) + 1);
const isFurniture = (l: Line) => /^\s*\d{1,4}\s*$/.test(l.text) || (freq.get(norm(l.text)) ?? 0) > Math.max(5, doc.numPages * 0.25);

// 3. Chapters from the PDF outline (bookmarks), if any
const outline = (await doc.getOutline().catch(() => null)) ?? [];
const starts: { title: string; pdfPage: number }[] = [];
for (const item of outline) {
  try {
    const dest = typeof item.dest === "string" ? await doc.getDestination(item.dest) : item.dest;
    if (!dest) continue;
    const index = await doc.getPageIndex(dest[0] as never);
    starts.push({ title: item.title.trim(), pdfPage: index + 1 });
  } catch {
    /* unresolvable entry */
  }
}
starts.sort((a, b) => a.pdfPage - b.pdfPage);

// 4. Paragraphs: break on a vertical gap larger than the usual line spacing
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};
const bodyLines = pagesLines.flat().filter((l) => l.text.length > 40);
const LEFT = median(bodyLines.map((l) => l.x));
const RIGHT = median(bodyLines.map((l) => l.right));

function paragraphsOf(lines: Line[]): string[] {
  const kept = lines.filter((l) => !isFurniture(l));
  const out: string[] = [];
  let buf = "";
  kept.forEach((l, i) => {
    const prev = kept[i - 1];
    const gap = prev ? prev.y - l.y : 0;
    const prevEndsSentence = !!prev && /[.!?:"”’)]$/.test(prev.text.trim());
    const prevShort = !!prev && prev.right < RIGHT - Math.max(24, (RIGHT - LEFT) * 0.12);
    const indented = l.x > LEFT + 6 && l.x < LEFT + (RIGHT - LEFT) * 0.3;
    const newPara =
      !prev || gap < 0 || gap > Math.max(prev.height, l.height) * 1.6 || (prevEndsSentence && (prevShort || indented));
    if (newPara && buf.trim()) {
      out.push(buf.trim());
      buf = "";
    }
    const t = l.text.replace(/\s+/g, " ").trim();
    buf = buf.endsWith("-") ? buf.slice(0, -1) + t : buf ? `${buf} ${t}` : t;
  });
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const chapters: ChapterText[] = [];
if (starts.length) {
  const firstStart = starts[0]!.pdfPage;
  if (firstStart > 1) chapters.push({ title: "Front matter", paragraphs: pagesLines.slice(0, firstStart - 1).flatMap(paragraphsOf) });
  starts.forEach((s, i) => {
    const end = (starts[i + 1]?.pdfPage ?? doc.numPages + 1) - 1;
    chapters.push({ title: s.title, paragraphs: pagesLines.slice(s.pdfPage - 1, Math.max(end, s.pdfPage)).flatMap(paragraphsOf) });
  });
} else {
  chapters.push({ title: title, paragraphs: pagesLines.flatMap(paragraphsOf) });
}

const content = paginate(chapters);
const outDir = resolve(import.meta.dirname, "../apps/api/content/local");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "override.json"), JSON.stringify({ id: "local", title, author, ...content }));
console.log(
  `Imported "${title}" by ${author}: ${doc.numPages} PDF pages → ${content.pages.length} reader pages, ${content.chapters.length} chapters (${starts.length} from the PDF outline).`,
);
console.log(`Saved to ${outDir}/override.json (git-ignored, not in the Docker image).`);
