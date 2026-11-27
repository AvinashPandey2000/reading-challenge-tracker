import { COVER_VIEWBOX, MOTIF_PATHS, coverTitleLines, type CoverTheme } from "@rct/shared";

/** Original typographic cover drawn from shared cover data (same artwork as the Expo app). */
export function BookCover({ title, author, cover, className }: { title: string; author: string; cover: CoverTheme; className?: string }) {
  const lines = coverTitleLines(title);
  const surname = author.split(" ").at(-1) ?? author;
  return (
    <svg viewBox={COVER_VIEWBOX} className={className} role="img" aria-label={`Cover of ${title}`} focusable="false">
      <rect width="120" height="180" rx="6" fill={cover.background} />
      <rect x="0" y="0" width="7" height="180" fill="#000" opacity="0.14" />
      <rect x="14" y="14" width="92" height="152" rx="3" fill="none" stroke={cover.accent} strokeOpacity="0.55" strokeWidth="1" />
      <path d={MOTIF_PATHS[cover.motif]} fill="none" stroke={cover.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -4)" />
      {lines.map((line, i) => (
        <text key={i} x="60" y={124 + i * 13 - (lines.length - 1) * 6} textAnchor="middle" fill={cover.ink} fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="11.5">
          {line}
        </text>
      ))}
      <text x="60" y="156" textAnchor="middle" fill={cover.ink} opacity="0.85" fontFamily="Helvetica, Arial, sans-serif" fontSize="7" letterSpacing="1.2">
        {surname.toUpperCase()}
      </text>
    </svg>
  );
}
