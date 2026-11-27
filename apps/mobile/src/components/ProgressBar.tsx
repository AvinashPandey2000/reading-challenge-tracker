import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/spacing";
import { motion, useReducedMotion } from "../theme/motion";

/** Decorative bar; the count text next to it carries the information. */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const reduced = useReducedMotion();
  const [anim] = useState(() => new Animated.Value(ratio));

  useEffect(() => {
    if (reduced) {
      anim.setValue(ratio);
      return;
    }
    Animated.timing(anim, { toValue: ratio, duration: motion.medium, easing: motion.standard, useNativeDriver: false }).start();
  }, [anim, ratio, reduced]);

  const complete = max > 0 && value === max;
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: complete ? colors.green : colors.mangoBar },
          { width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
});
