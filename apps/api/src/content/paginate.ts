/**
 * Fixed, server-side pagination: the same page numbers on every client and font size.
 * A page holds about TARGET characters, breaks only between paragraphs (very long paragraphs
 * are split at sentence ends), and every chapter starts on a new page.
 */
export interface ChapterText {
  title: string;
  paragraphs: string[];
}
export interface BookContent {
  chapters: { title: string; startPage: number }[];
  pages: { chapter: number; paragraphs: string[] }[];
}

export const TARGET_CHARS = 1800;
const MAX_PARAGRAPH = 2400;

function splitLongParagraph(p: string): string[] {
  if (p.length <= MAX_PARAGRAPH) return [p];
  const sentences = p.match(/[^.!?]+[.!?]+["'’”)]*\s*|[^.!?]+$/g) ?? [p];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && cur.length + s.length > TARGET_CHARS) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function paginate(chapters: ChapterText[], target = TARGET_CHARS): BookContent {
  const pages: BookContent["pages"] = [];
  const toc: BookContent["chapters"] = [];
  chapters.forEach((chapter, ci) => {
    const paras = chapter.paragraphs.flatMap(splitLongParagraph).filter((p) => p.trim().length > 0);
    if (!paras.length) return;
    toc.push({ title: chapter.title, startPage: pages.length + 1 });
    let cur: string[] = [];
    let size = 0;
    for (const p of paras) {
      if (cur.length && size + p.length > target) {
        pages.push({ chapter: ci, paragraphs: cur });
        cur = [];
        size = 0;
      }
      cur.push(p);
      size += p.length;
    }
    if (cur.length) pages.push({ chapter: ci, paragraphs: cur });
  });
  // Re-index chapter numbers to the TOC (skipped empty chapters)
  const titleIndex = new Map(chapters.map((c, i) => [i, toc.findIndex((t) => t.title === c.title)]));
  return { chapters: toc, pages: pages.map((p) => ({ ...p, chapter: titleIndex.get(p.chapter) ?? 0 })) };
}

/** Plain text → paragraphs: blank-line separated, unwrapped, Gutenberg markup removed. */
export function toParagraphs(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/\[Illustration[^\]]*\]/gi, "")
        .replace(/_/g, "")
        .replace(/\s*\n\s*/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter((p) => p.length > 0 && !/^\*(\s*\*)+$/.test(p));
}
