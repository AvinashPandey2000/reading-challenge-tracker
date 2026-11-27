import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useTheme } from "../theme/ThemeProvider";
import { radius } from "../theme/spacing";

interface Props extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function useReduceTransparency() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled?.().then((v) => alive && setReduced(v));
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduced);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduced;
}

/**
 * Translucent "glass" card.
 * - iOS 26+: Apple's Liquid Glass via expo-glass-effect
 * - Earlier iOS: system blur (expo-blur)
 * - Android, or "Reduce transparency" on: a solid or lightly translucent surface
 */
export function GlassSurface({ style, children, ...rest }: Props) {
  const { colors, scheme } = useTheme();
  const reduce = useReduceTransparency();
  const shape: ViewStyle = { borderRadius: radius.lg, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder };

  if (reduce) {
    return (
      <View style={[shape, { backgroundColor: colors.surface }, style]} {...rest}>
        {children}
      </View>
    );
  }
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={scheme} style={[shape, style]} {...rest}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={60} tint={scheme === "dark" ? "systemThickMaterialDark" : "systemThickMaterialLight"} style={[shape, style]} {...rest}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[shape, { backgroundColor: colors.glassFill }, style]} {...rest}>
      {children}
    </View>
  );
}
