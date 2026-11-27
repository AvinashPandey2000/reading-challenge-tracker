import { Pressable, StyleSheet } from "react-native";
import type { Colors } from "../../theme/colors";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { touchTarget } from "../../theme/spacing";
import { PlayerIcon, type PlayerIconName } from "./PlayerIcon";

interface Props {
  icon: PlayerIconName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  /** For toggles (mute): shown with the accent colour and reported as selected. */
  selected?: boolean;
  testID?: string;
}

/** Round 48pt icon-only control for the video player. */
export function IconButton({ icon, accessibilityLabel, onPress, disabled, selected, testID }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected: selected === undefined ? undefined : selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={2}
      testID={testID}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <PlayerIcon name={icon} color={selected ? colors.mangoStrong : colors.ink} />
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    base: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: "center", justifyContent: "center" },
    selected: { backgroundColor: colors.surfaceSunk },
    pressed: { backgroundColor: colors.surfaceSunk, transform: [{ scale: 0.92 }] },
    disabled: { opacity: 0.45 },
  });
