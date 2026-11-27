import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { Button } from "./Button";

interface Props {
  tone?: "error" | "warning" | "info";
  message: string;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Inline message with an optional action. Errors are announced as alerts. */
export function Notice({ tone = "error", message, actionLabel, actionAccessibilityLabel, onAction, testID }: Props) {
  const toneStyle = tone === "error" ? styles.error : tone === "warning" ? styles.warning : styles.info;
  const textStyle = tone === "error" ? styles.errorText : tone === "warning" ? styles.warningText : styles.infoText;
  return (
    <View
      style={[styles.box, toneStyle]}
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Text style={[styles.text, textStyle]}>{message}</Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} accessibilityLabel={actionAccessibilityLabel} variant={tone === "error" ? "danger" : "outline"} onPress={onAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  text: { ...type.caption, fontWeight: "600", flex: 1 },
  error: { backgroundColor: colors.dangerSoft },
  errorText: { color: colors.danger },
  warning: { backgroundColor: colors.savingBg },
  warningText: { color: colors.mangoStrong },
  info: { backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: spacing.xs },
  infoText: { color: colors.inkMuted, fontWeight: "400" },
});
