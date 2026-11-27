import type { CoverTheme } from "./reading.js";

/**
 * Original typographic book covers. Both clients draw the same SVG from this data
 * (web: inline <svg>, Expo: react-native-svg), so covers look identical everywhere.
 * viewBox is 0 0 120 180.
 */
export const COVER_VIEWBOX = "0 0 120 180";

export const MOTIF_PATHS: Record<CoverTheme["motif"], string> = {
  key: "M60 54a14 14 0 1 0 0.01 0zM60 68v34m0-10h9m-9 8h7",
  leaf: "M40 104C40 70 70 52 88 50c-2 22-18 50-48 54zM40 104l34-36",
  wave: "M26 84c10-10 20 10 30 0s20 10 30 0 M26 96c10-10 20 10 30 0s20 10 30 0 M26 72c10-10 20 10 30 0s20 10 30 0",
  star: "M60 50l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z",
  sun: "M60 66a14 14 0 1 0 0.01 0zM60 46v8M60 94v8M36 80h8M76 80h8M43 63l6 6M71 91l6 6M43 97l6-6M71 69l6-6",
  rabbit: "M52 62c-4-14 0-24 4-24s4 12 2 24M66 62c0-14 4-24 8-22s0 14-4 24M60 104c-14 0-20-10-20-20 0-12 10-20 20-20s20 8 20 20c0 10-6 20-20 20z",
  boat: "M34 92h52l-8 12H42zM58 92V50l20 34H58zM56 92V58L40 84h16",
  moon: "M72 52a26 26 0 1 0 8 42 20 20 0 1 1-8-42z",
  orbit: "M60 70a10 10 0 1 0 0.01 0zM30 80c0-10 13-18 30-18s30 8 30 18-13 18-30 18-30-8-30-18z",
  page: "M40 52h32l10 10v42H40zM72 52v10h10M48 72h26M48 80h26M48 88h18",
};

/** Splits a title into at most 3 short lines for the cover. */
export function coverTitleLines(title: string, maxChars = 12): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > 3) return [...lines.slice(0, 2), `${lines.slice(2).join(" ").slice(0, maxChars - 1)}…`];
  return lines;
}
