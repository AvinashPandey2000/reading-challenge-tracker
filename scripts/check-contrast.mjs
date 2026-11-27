#!/usr/bin/env node
// WCAG 2.2 contrast check for the palette shared by web (globals.css) and Expo (theme/colors.ts).
// Text needs 4.5:1 (AA, normal size); UI components / focus indicators / graphics need 3:1.
const hex = (h) => h.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
const lum = (h) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const C = {
  bg: "#FBF6EC", surface: "#FFFDF8", sunk: "#F4ECDC", ink: "#1D1B16", muted: "#574F43",
  mangoStrong: "#A35400", mangoBar: "#C46A00", savingBg: "#FDF0DA", green: "#2F6B3A", greenSoft: "#E3EFE2",
  danger: "#A3261B", dangerSoft: "#FBE9E4", white: "#FFFFFF",
};

const checks = [
  ["Body text on ivory", C.ink, C.bg, 4.5],
  ["Body text on card", C.ink, C.surface, 4.5],
  ["Muted text on ivory", C.muted, C.bg, 4.5],
  ["Muted text on card", C.muted, C.surface, 4.5],
  ["Muted text on sunk panel / 'Not read yet' pill", C.muted, C.sunk, 4.5],
  ["Count number (mango) on card", C.mangoStrong, C.surface, 4.5],
  ["'Saving…' pill text", C.mangoStrong, C.savingBg, 4.5],
  ["'✓ Read' pill text", C.green, C.greenSoft, 4.5],
  ["'Complete' text on card", C.green, C.surface, 4.5],
  ["Error text on error background", C.danger, C.dangerSoft, 4.5],
  ["Primary button label (ivory on ink)", C.surface, C.ink, 4.5],
  ["Checkmark (white on green)", C.white, C.green, 3],
  ["Unchecked box border on card", C.muted, C.surface, 3],
  ["Focus ring (ink) on ivory", C.ink, C.bg, 3],
  ["Focus ring (ink) on card", C.ink, C.surface, 3],
  ["Progress fill vs track", C.mangoBar, C.sunk, 3],
  ["Completed progress fill vs track", C.green, C.sunk, 3],
];

let failed = 0;
for (const [name, fg, bg, min] of checks) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${name}`);
}
if (failed) {
  console.error(`${failed} contrast check(s) failed`);
  process.exit(1);
}
