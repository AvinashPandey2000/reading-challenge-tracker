#!/usr/bin/env node
// WCAG 2.2 contrast check for both palettes shared by web (globals.css light-dark() tokens)
// and Expo (src/theme/colors.ts), plus text on glass cards over the background bubbles.
// Text needs 4.5:1 (AA, normal size); UI components / focus indicators / graphics need 3:1.
const hex = (h) => h.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
const toHex = (rgb) => "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
const lum = (h) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/** `top` at `alpha` composited over `bottom`. */
const blend = (top, alpha, bottom) => toHex(hex(top).map((c, i) => c * alpha + hex(bottom)[i] * (1 - alpha)));

const PALETTES = {
  light: {
    bg: "#FBF6EC", surface: "#FFFDF8", sunk: "#F4ECDC", ink: "#1D1B16", muted: "#574F43", line: "#E4D8C2",
    mangoStrong: "#A35400", mangoBar: "#C46A00", savingBg: "#FDF0DA", green: "#2F6B3A", greenFill: "#2F6B3A",
    greenSoft: "#E3EFE2", danger: "#A3261B", dangerSoft: "#FBE9E4", onInk: "#FFFDF8", focus: "#1D1B16",
    bubbleOpacity: 0.5,
  },
  dark: {
    bg: "#15130F", surface: "#221E18", sunk: "#2C271F", ink: "#F3ECDF", muted: "#C2B7A5", line: "#3A342A",
    mangoStrong: "#F2A541", mangoBar: "#E8932A", savingBg: "#3A2A12", green: "#8FCB98", greenFill: "#4F9A5C",
    greenSoft: "#1F3323", danger: "#FF9A8B", dangerSoft: "#3D1D18", onInk: "#15130F", focus: "#F3ECDF",
    bubbleOpacity: 0.32,
  },
};
// Brightest stops of the decorative bubbles (globals.css .bubbles, mobile BackgroundBubbles).
const BUBBLES = ["#FFC766", "#F4A422", "#A9D8A8", "#4F9A5C", "#F6B7A8", "#E07A62"];
const GLASS_ALPHA = 0.74; // --glass-bg: surface at 74%

let failed = 0;
for (const [name, C] of Object.entries(PALETTES)) {
  console.log(`\n${name.toUpperCase()} palette`);
  const checks = [
    ["Body text on page", C.ink, C.bg, 4.5],
    ["Body text on card", C.ink, C.surface, 4.5],
    ["Muted text on page", C.muted, C.bg, 4.5],
    ["Muted text on card", C.muted, C.surface, 4.5],
    ["Muted text on sunk / 'Not read yet' pill", C.muted, C.sunk, 4.5],
    ["Mango text (counts, days left) on card", C.mangoStrong, C.surface, 4.5],
    ["'Saving…' pill text", C.mangoStrong, C.savingBg, 4.5],
    ["'✓ Read' / 'Unlocked' pill text", C.green, C.greenSoft, 4.5],
    ["'Complete' text on card", C.green, C.surface, 4.5],
    ["Error text on error background", C.danger, C.dangerSoft, 4.5],
    ["Ink button label", C.onInk, C.ink, 4.5],
    ["White tick on checked box", "#FFFFFF", C.greenFill, 3],
    ["Unchecked box border on card", C.muted, C.surface, 3],
    ["Focus ring on page", C.focus, C.bg, 3],
    ["Focus ring on card", C.focus, C.surface, 3],
    ["Progress fill vs track", C.mangoBar, C.sunk, 3],
    ["Completed progress fill vs track", C.greenFill, C.sunk, 3],
  ];
  // Text on glass: glass tint over the worst-case bubble colour showing through.
  for (const b of BUBBLES) {
    const under = blend(b, C.bubbleOpacity, C.bg);
    const glass = blend(C.surface, GLASS_ALPHA, under);
    checks.push([`Body text on glass over ${b}`, C.ink, glass, 4.5]);
    checks.push([`Muted text on glass over ${b}`, C.muted, glass, 4.5]);
    checks.push([`Mango text on glass over ${b}`, C.mangoStrong, glass, 4.5]);
  }
  for (const [label, fg, bgc, min] of checks) {
    const r = ratio(fg, bgc);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${label}`);
  }
}
if (failed) {
  console.error(`\n${failed} contrast check(s) failed`);
  process.exit(1);
}
console.log("\nAll contrast checks passed.");
