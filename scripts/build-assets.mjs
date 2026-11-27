#!/usr/bin/env node
/**
 * One-off asset pipeline. The outputs are committed, so reviewers never need to run this.
 *
 *   node scripts/build-assets.mjs <BigBuckBunny_640x360.m4v> <arundel-library.jpg> <gutenberg-113.txt>
 *
 * Sources (licenses recorded in ASSETS.md):
 *   - Big Buck Bunny (c) Blender Foundation, CC BY 3.0
 *     https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v.zip
 *   - "Library, Arundel Castle 2026-05-14.jpg" by Andy Li, CC0, Wikimedia Commons
 *   - The Secret Garden (1911) by Frances Hodgson Burnett, public domain; text from Project Gutenberg #113
 *
 * Generated:
 *   apps/web/public/media/welcome.mp4  (H.264/AAC, 45 s, faststart)  - iOS/Android/Safari
 *   apps/web/public/media/welcome.webm (VP9/Opus)                    - Chromium builds without H.264
 *   apps/web/public/media/welcome-poster.jpg
 *   apps/web/public/images/reading-room.webp (960x640) + apps/mobile/assets/reading-room.webp
 *   apps/web/public/downloads/the-secret-garden-chapter-1.pdf
 *   apps/web/public/og-image.png (1200x630), apps/web/public/apple-icon.png, apps/web/public/icon.svg
 *   e2e/fixtures/test-clip.webm (deterministic 20 s test asset)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "apps/web/public");
const [videoSrc, imageSrc, textSrc] = process.argv.slice(2);
if (!videoSrc || !imageSrc || !textSrc) {
  console.error("usage: build-assets.mjs <bbb.m4v> <library.jpg> <pg113.txt>");
  process.exit(1);
}
for (const d of ["media", "images", "downloads"]) mkdirSync(join(pub, d), { recursive: true });
mkdirSync(join(root, "apps/mobile/assets"), { recursive: true });
mkdirSync(join(root, "e2e/fixtures"), { recursive: true });

const ff = (args) => execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;

// ---------- Video: 45 s from 0:20, 640x360 ----------
const START = "20";
const DURATION = "45";
const mp4 = join(pub, "media/welcome.mp4");
const webm = join(pub, "media/welcome.webm");
ff(["-ss", START, "-i", videoSrc, "-t", DURATION, "-vf", "scale=640:-2", "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
  "-crf", "27", "-preset", "slow", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", mp4]);
ff(["-ss", START, "-i", videoSrc, "-t", DURATION, "-vf", "scale=640:-2", "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0",
  "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-c:a", "libopus", "-b:a", "64k", webm]);
ff(["-ss", "3", "-i", mp4, "-frames:v", "1", "-q:v", "4", join(pub, "media/welcome-poster.jpg")]);
// Deterministic E2E fixture: synthetic test pattern + tone, no third-party media host involved.
ff(["-f", "lavfi", "-i", "testsrc2=size=320x180:rate=25", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
  "-t", "20", "-c:v", "libvpx-vp9", "-crf", "45", "-b:v", "0", "-deadline", "realtime", "-cpu-used", "8", "-c:a", "libopus", "-b:a", "32k",
  join(root, "e2e/fixtures/test-clip.webm")]);
console.log("video:", kb(mp4), kb(webm));

// ---------- Hero image ----------
const heroOut = join(pub, "images/reading-room.webp");
await sharp(imageSrc).resize(960, 640, { fit: "cover", position: "centre" }).webp({ quality: 72 }).toFile(heroOut);
copyFileSync(heroOut, join(root, "apps/mobile/assets/reading-room.webp"));
console.log("hero:", kb(heroOut));

// ---------- Sample PDF: The Secret Garden, Chapter I ----------
const raw = readFileSync(textSrc, "utf8").replace(/\r\n/g, "\n");
const start = raw.indexOf("CHAPTER I.\nTHERE IS NO ONE LEFT");
const end = raw.indexOf("CHAPTER II.", start + 10);
if (start < 0 || end < 0) throw new Error("Chapter I not found in source text");
const chapter = raw
  .slice(start, end)
  .replace("CHAPTER I.\nTHERE IS NO ONE LEFT", "")
  .trim()
  .split(/\n{2,}/)
  .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/_/g, "").trim())
  .filter(Boolean);

const pdf = await PDFDocument.create();
pdf.setTitle("The Secret Garden — Chapter I: There Is No One Left");
pdf.setAuthor("Frances Hodgson Burnett");
pdf.setSubject("Public-domain sample chapter for the Lantern Lane Library reading challenge (fictional library demo)");
pdf.setKeywords(["The Secret Garden", "public domain", "sample chapter"]);
pdf.setProducer("Reading Challenge Tracker asset script (pdf-lib)");
pdf.setCreator("Reading Challenge Tracker");
const serif = await pdf.embedFont(StandardFonts.TimesRoman);
const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
const W = 420, H = 595, M = 48; // A5 portrait
const ink = rgb(0.11, 0.1, 0.09);
const mango = rgb(0.64, 0.33, 0);
const muted = rgb(0.34, 0.31, 0.26);
const winAnsiSafe = (s) => s.replace(/[^\x20-\x7E -ÿ‘’“”—–…]/g, "");

function wrap(text, font, size, width) {
  const words = winAnsiSafe(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

let page = pdf.addPage([W, H]);
let y = H - M;
let pageNo = 1;
const footer = () => {
  page.drawText(`The Secret Garden · Chapter I · ${pageNo}`, { x: M, y: 28, size: 8, font: serifItalic, color: muted });
};
page.drawRectangle({ x: M, y: y - 4, width: 36, height: 4, color: mango });
y -= 30;
page.drawText("The Secret Garden", { x: M, y, size: 26, font: serifBold, color: ink });
y -= 22;
page.drawText("by Frances Hodgson Burnett (1911)", { x: M, y, size: 12, font: serifItalic, color: muted });
y -= 34;
page.drawText("CHAPTER I", { x: M, y, size: 11, font: serifBold, color: mango });
y -= 18;
page.drawText("There Is No One Left", { x: M, y, size: 16, font: serifBold, color: ink });
y -= 26;
const SIZE = 10.5, LEAD = 14.5;
for (const para of chapter) {
  const lines = wrap(para, serif, SIZE, W - 2 * M);
  for (const [i, ln] of lines.entries()) {
    if (y < M + 10) {
      footer();
      page = pdf.addPage([W, H]);
      pageNo += 1;
      y = H - M;
    }
    page.drawText(ln, { x: M + (i === 0 ? 12 : 0), y, size: SIZE, font: serif, color: ink });
    y -= LEAD;
  }
  y -= 4;
}
footer();
// Colophon
page = pdf.addPage([W, H]);
pageNo += 1;
y = H - M - 10;
for (const [text, font, size] of [
  ["About this sample", serifBold, 14],
  ["", serif, 6],
  ["The Secret Garden by Frances Hodgson Burnett was first published in 1911. The author died in 1924, and the text is in the public domain.", serif, 10.5],
  ["", serif, 6],
  ["This PDF was typeset from the public-domain text (source: Project Gutenberg eBook #113, used only as a text source) for the Lantern Lane Library reading challenge, a fictional library in a coding exercise. It may be freely copied and shared.", serif, 10.5],
  ["", serif, 6],
  ["Borrow the full book from your local library to keep reading.", serifItalic, 10.5],
]) {
  for (const ln of text ? wrap(text, font, size, W - 2 * M) : [""]) {
    page.drawText(ln, { x: M, y, size, font, color: ink });
    y -= size * 1.4;
  }
}
footer();
const pdfPath = join(pub, "downloads/the-secret-garden-chapter-1.pdf");
writeFileSync(pdfPath, await pdf.save());
console.log("pdf:", kb(pdfPath), `${pdf.getPageCount()} pages`);

// ---------- Icon + social preview (original artwork) ----------
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1D1B16"/>
  <rect x="18" y="16" width="9" height="32" rx="2" fill="#F4A422"/>
  <rect x="32" y="17" width="9" height="32" rx="2" transform="rotate(-12 36.5 33)" fill="#FBF6EC"/>
  <rect x="14" y="48" width="36" height="3" rx="1.5" fill="#F4A422"/>
</svg>`;
writeFileSync(join(pub, "icon.svg"), iconSvg);
await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(join(pub, "apple-icon.png"));
await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(join(root, "apps/mobile/assets/icon.png"));

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FBF6EC"/>
  <rect x="0" y="0" width="1200" height="14" fill="#F4A422"/>
  <g transform="translate(80 92)">
    <rect width="56" height="56" rx="13" fill="#1D1B16"/>
    <rect x="15" y="14" width="8" height="28" rx="2" fill="#F4A422"/>
    <rect x="28" y="15" width="8" height="28" rx="2" transform="rotate(-12 32 29)" fill="#FBF6EC"/>
    <text x="76" y="38" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" fill="#1D1B16">Lantern Lane Library</text>
  </g>
  <text x="80" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" fill="#1D1B16" letter-spacing="-2">Your reading</text>
  <text x="80" y="400" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" fill="#1D1B16" letter-spacing="-2">challenge</text>
  <text x="80" y="470" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#574F43">Three fiction and three nonfiction books. Tick them off as you go.</text>
  <g font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#1D1B16">
    <text x="80" y="548">Fiction</text>
    <rect x="200" y="530" width="300" height="20" rx="10" fill="#F4ECDC" stroke="#E4D8C2"/>
    <text x="580" y="548">Nonfiction</text>
    <rect x="730" y="530" width="300" height="20" rx="10" fill="#F4ECDC" stroke="#E4D8C2"/>
  </g>
  <g transform="translate(905 150)">
    <rect x="0" y="40" width="54" height="200" rx="6" fill="#2F6B3A"/>
    <rect x="62" y="20" width="60" height="220" rx="6" fill="#D97A06"/>
    <rect x="130" y="60" width="46" height="180" rx="6" fill="#1D1B16"/>
    <rect x="186" y="34" width="52" height="206" rx="6" transform="rotate(8 212 240)" fill="#F4A422"/>
    <rect x="-20" y="240" width="290" height="10" rx="5" fill="#1D1B16"/>
  </g>
</svg>`;
await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(join(pub, "og-image.png"));
console.log("og:", kb(join(pub, "og-image.png")));
