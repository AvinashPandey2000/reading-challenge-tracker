import { StyleSheet, Text } from "react-native";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";

export type BookStatus = "read" | "unread" | "saving";

const LABEL: Record<BookStatus, string> = { read: "✓ Read", unread: "Not read yet", saving: "Saving…" };

export function StatusPill({ status }: { status: BookStatus }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.pill, styles[status]]}>{LABEL[status]}</Text>;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  pill: {
    ...type.caption,
    fontWeight: "700",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  read: { color: colors.green, backgroundColor: colors.greenSoft },
  unread: { color: colors.inkMuted, backgroundColor: colors.surfaceSunk },
  saving: { color: colors.mangoStrong, backgroundColor: colors.savingBg },
});
