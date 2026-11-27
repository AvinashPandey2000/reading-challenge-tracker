import { StyleSheet, Text, View } from "react-native";
import type { Reward } from "@rct/shared";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { GlassSurface } from "./GlassSurface";

const ICON: Record<Reward["id"], string> = {
  "fiction-bookmark": "🔖",
  "nonfiction-bookmark": "🔖",
  "challenge-tote": "👜",
};

export function RewardCard({ reward }: { reward: Reward }) {
  const styles = useThemedStyles(makeStyles);
  const state = reward.unlocked ? "✓ Unlocked" : "🔒 Locked";
  return (
    <GlassSurface style={styles.card} testID={`reward-${reward.id}`}>
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${reward.title}. ${reward.unlocked ? "Unlocked" : "Locked"}. ${reward.current} of ${reward.total} read. ${reward.description}${reward.claimCode ? ` Show code ${reward.claimCode.split("").join(" ")} at the front desk.` : ""}`}
      >
        <View style={[styles.icon, reward.unlocked && styles.iconUnlocked]}>
          <Text style={styles.emoji}>{ICON[reward.id]}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{reward.title}</Text>
          <Text style={styles.description}>{reward.description}</Text>
          <Text style={styles.progress}>
            {reward.current} of {reward.total} read
          </Text>
          {reward.claimCode && (
            <Text style={styles.claim} testID="claim-code">
              Show code <Text style={styles.code}>{reward.claimCode}</Text> at the front desk.
            </Text>
          )}
          <Text style={[styles.state, reward.unlocked && styles.stateUnlocked]}>{state}</Text>
        </View>
      </View>
    </GlassSurface>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: { padding: spacing.md },
    row: { flexDirection: "row", gap: spacing.md },
    icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center", opacity: 0.7 },
    iconUnlocked: { backgroundColor: colors.mango, opacity: 1 },
    emoji: { fontSize: 20 },
    body: { flex: 1, gap: 2 },
    title: { ...type.title, color: colors.ink },
    description: { ...type.caption, color: colors.inkMuted },
    progress: { ...type.caption, fontWeight: "700", color: colors.ink },
    claim: { ...type.caption, color: colors.green, backgroundColor: colors.greenSoft, padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.xs, overflow: "hidden" },
    code: { fontWeight: "800" },
    state: {
      ...type.caption,
      fontWeight: "700",
      alignSelf: "flex-start",
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: "hidden",
      color: colors.inkMuted,
      backgroundColor: colors.surfaceSunk,
    },
    stateUnlocked: { color: colors.green, backgroundColor: colors.greenSoft },
  });
