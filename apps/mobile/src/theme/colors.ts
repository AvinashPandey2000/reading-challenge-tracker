/**
 * Same palettes as the web app (apps/web/app/globals.css, light-dark() tokens).
 * Contrast for both is checked by scripts/check-contrast.mjs.
 */
export const lightColors = {
  background: "#FBF6EC",
  surface: "#FFFDF8",
  surfaceSunk: "#F4ECDC",
  ink: "#1D1B16",
  inkMuted: "#574F43",
  line: "#E4D8C2",
  mango: "#F4A422",
  mangoStrong: "#A35400",
  mangoBar: "#C46A00",
  savingBg: "#FDF0DA",
  green: "#2F6B3A",
  greenFill: "#2F6B3A",
  greenSoft: "#E3EFE2",
  danger: "#A3261B",
  dangerSoft: "#FBE9E4",
  onInk: "#FFFDF8",
  white: "#FFFFFF",
  videoBg: "#111111",
  /** Translucent fill used where real blur isn't available (Android, reduce transparency off). */
  glassFill: "rgba(255, 253, 248, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.8)",
  bubbleA: "#F4A422",
  bubbleB: "#4F9A5C",
  bubbleC: "#E07A62",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: "#15130F",
  surface: "#221E18",
  surfaceSunk: "#2C271F",
  ink: "#F3ECDF",
  inkMuted: "#C2B7A5",
  line: "#3A342A",
  mango: "#F4A422",
  mangoStrong: "#F2A541",
  mangoBar: "#E8932A",
  savingBg: "#3A2A12",
  green: "#8FCB98",
  greenFill: "#4F9A5C",
  greenSoft: "#1F3323",
  danger: "#FF9A8B",
  dangerSoft: "#3D1D18",
  onInk: "#15130F",
  white: "#FFFFFF",
  videoBg: "#111111",
  glassFill: "rgba(34, 30, 24, 0.82)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  bubbleA: "#C98318",
  bubbleB: "#3E7A49",
  bubbleC: "#A85844",
};

/** @deprecated static light palette; use useTheme().colors so dark mode works. */
export const colors = lightColors;
