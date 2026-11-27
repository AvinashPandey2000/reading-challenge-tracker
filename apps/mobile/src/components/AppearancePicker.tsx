import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles, type ThemePreference } from "../theme/ThemeProvider";
import type { Colors } from "../theme/colors";
import { radius, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Segmented System / Light / Dark control (radio semantics for screen readers). */
export function AppearancePicker() {
  const { preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
      {OPTIONS.map((o) => {
        const selected = preference === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={`${o.label} appearance`}
            onPress={() => setPreference(o.value)}
            style={[styles.option, selected && styles.selected]}
            testID={`appearance-${o.value}`}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    group: { flexDirection: "row", padding: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceSunk, gap: 2 },
    option: { flex: 1, minHeight: touchTarget - 4, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
    selected: { backgroundColor: colors.ink },
    label: { ...type.label, color: colors.inkMuted },
    labelSelected: { color: colors.onInk },
  });
