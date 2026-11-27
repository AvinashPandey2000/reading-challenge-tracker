import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { motion, useReducedMotion } from "../theme/motion";

/** Checkbox visual with a brief (180 ms) scale-in when a save confirms "read". */
export function Checkmark({ checked }: { checked: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(checked ? 1 : 0));
  useEffect(() => {
    const to = checked ? 1 : 0;
    if (reduced) scale.setValue(to);
    else Animated.timing(scale, { toValue: to, duration: motion.short, easing: motion.standard, useNativeDriver: true }).start();
  }, [checked, reduced, scale]);

  return (
    <View style={[styles.box, checked && styles.boxChecked]}>
      <Animated.View style={{ opacity: scale, transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
        <Text style={styles.tick}>✓</Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.inkMuted,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: colors.greenFill, borderColor: colors.greenFill },
  tick: { color: colors.white, fontSize: 17, fontWeight: "800", lineHeight: 20 },
});
