import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";

type Variant = "primary" | "outline" | "danger";

interface Props extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, variant = "primary", style, disabled, accessibilityLabel, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}
      {...rest}
    >
      <Text style={[styles.label, variant === "primary" ? styles.labelPrimary : variant === "danger" ? styles.labelDanger : styles.labelOutline]}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  base: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.ink },
  outline: { borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.surface },
  danger: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  label: type.label,
  labelPrimary: { color: colors.onInk },
  labelOutline: { color: colors.ink },
  labelDanger: { color: colors.danger },
});
