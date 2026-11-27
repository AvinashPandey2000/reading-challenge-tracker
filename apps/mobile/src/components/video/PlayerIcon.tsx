import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

export type PlayerIconName = "play" | "pause" | "replay" | "rewind10" | "forward10" | "volume" | "muted" | "fullscreen";

/** Video player glyphs, drawn on a 24×24 grid (same shapes as the web player). */
export function PlayerIcon({ name, size = 22, color }: { name: PlayerIconName; size?: number; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === "play" && <Path d="M8 5.3v13.4a1 1 0 0 0 1.5.9l10.6-6.7a1 1 0 0 0 0-1.8L9.5 4.4A1 1 0 0 0 8 5.3z" fill={color} />}
      {name === "pause" && (
        <>
          <Rect x={6} y={4.5} width={4} height={15} rx={1.2} fill={color} />
          <Rect x={14} y={4.5} width={4} height={15} rx={1.2} fill={color} />
        </>
      )}
      {name === "replay" && <Path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2v3z" fill={color} />}
      {(name === "rewind10" || name === "forward10") && (
        <>
          <Path
            d={name === "rewind10" ? "M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" : "M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"}
            fill={color}
          />
          <SvgText x={12} y={16.2} fontSize={7} fontWeight="700" fill={color} textAnchor="middle">
            10
          </SvgText>
        </>
      )}
      {name === "volume" && <Path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" {...stroke} />}
      {name === "muted" && <Path d="M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5m0-5-5 5" {...stroke} />}
      {name === "fullscreen" && <Path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...stroke} />}
    </Svg>
  );
}
