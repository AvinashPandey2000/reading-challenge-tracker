import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";

/** Soft static colour bubbles behind the glass cards (decorative, hidden from screen readers). */
export function BackgroundBubbles() {
  const { colors, scheme } = useTheme();
  const alpha = scheme === "dark" ? "55" : "70";
  const bubble = (color: string, style: object) => (
    <LinearGradient colors={[`${color}${alpha}`, `${color}00`]} start={{ x: 0.3, y: 0.2 }} end={{ x: 0.8, y: 1 }} style={[styles.bubble, style]} />
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bubble(colors.bubbleA, { width: 360, height: 360, top: -120, left: -140 })}
      {bubble(colors.bubbleB, { width: 300, height: 300, top: 260, right: -150 })}
      {bubble(colors.bubbleC, { width: 280, height: 280, bottom: -60, left: 40 })}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { position: "absolute", borderRadius: 999 },
});
