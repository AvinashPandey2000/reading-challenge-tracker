import { StyleSheet, Text, View } from "react-native";
import { STATUS_LABEL, type ReadingStatus } from "@rct/shared";
import type { Colors } from "../../theme/colors";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/spacing";
import { type } from "../../theme/typography";

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const styles = useThemedStyles(makeStyles);
  const icon = status === "completed" ? "✓ " : status === "reading" ? "◐ " : "";
  return (
    <Text style={[styles.badge, status === "reading" && styles.badgeReading, status === "completed" && styles.badgeDone]} testID={`status-${status}`}>
      {icon}
      {STATUS_LABEL[status]}
    </Text>
  );
}

export function ProgressMeter({ percent, label }: { percent: number; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.meter} accessible accessibilityRole="progressbar" accessibilityLabel="Reading progress" accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}% · ${label}` }}>
      <View style={styles.track}>
        <View style={[styles.fill, percent === 100 && styles.fillDone, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.meterText}>
        <Text style={styles.meterStrong}>{percent}%</Text> · {label}
      </Text>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    badge: { ...type.caption, fontWeight: "700", alignSelf: "flex-start", paddingHorizontal: spacing.sm + 2, paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden", color: c.inkMuted, backgroundColor: c.surfaceSunk },
    badgeReading: { color: c.mangoStrong, backgroundColor: c.savingBg },
    badgeDone: { color: c.green, backgroundColor: c.greenSoft },
    meter: { gap: 4 },
    track: { height: 6, borderRadius: radius.pill, backgroundColor: c.surfaceSunk, borderWidth: 1, borderColor: c.line, overflow: "hidden" },
    fill: { height: "100%", backgroundColor: c.mangoBar, borderRadius: radius.pill },
    fillDone: { backgroundColor: c.greenFill },
    meterText: { ...type.caption, color: c.inkMuted },
    meterStrong: { fontWeight: "700", color: c.ink },
  });
