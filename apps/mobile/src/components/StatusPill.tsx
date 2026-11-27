import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";

export type BookStatus = "read" | "unread" | "saving";

const LABEL: Record<BookStatus, string> = { read: "✓ Read", unread: "Not read yet", saving: "Saving…" };

export function StatusPill({ status }: { status: BookStatus }) {
  return <Text style={[styles.pill, styles[status]]}>{LABEL[status]}</Text>;
}

const styles = StyleSheet.create({
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
