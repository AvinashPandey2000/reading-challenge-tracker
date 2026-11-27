import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { COVER_VIEWBOX, MOTIF_PATHS, coverTitleLines, type CoverTheme } from "@rct/shared";

/** Same original cover artwork as the web app, from the shared cover data. */
export function BookCover({ title, author, cover, width = 96 }: { title: string; author: string; cover: CoverTheme; width?: number }) {
  const lines = coverTitleLines(title);
  const surname = author.split(" ").at(-1) ?? author;
  return (
    <Svg width={width} height={width * 1.5} viewBox={COVER_VIEWBOX} accessible accessibilityLabel={`Cover of ${title}`}>
      <Rect width="120" height="180" rx="6" fill={cover.background} />
      <Rect x="0" y="0" width="7" height="180" fill="#000" opacity={0.14} />
      <Rect x="14" y="14" width="92" height="152" rx="3" fill="none" stroke={cover.accent} strokeOpacity={0.55} strokeWidth="1" />
      <Path d={MOTIF_PATHS[cover.motif]} fill="none" stroke={cover.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -4)" />
      {lines.map((line, i) => (
        <SvgText key={i} x="60" y={124 + i * 13 - (lines.length - 1) * 6} textAnchor="middle" fill={cover.ink} fontFamily="Georgia" fontWeight="700" fontSize="11.5">
          {line}
        </SvgText>
      ))}
      <SvgText x="60" y="156" textAnchor="middle" fill={cover.ink} opacity={0.85} fontSize="7" letterSpacing="1.2">
        {surname.toUpperCase()}
      </SvgText>
    </Svg>
  );
}
