import { StyleSheet, Text, View } from "react-native";
import { DEMO_READER_ID, computeRewards } from "@rct/shared";
import { useBooksContext } from "../lib/BooksProvider";
import { useOnboarding } from "../lib/OnboardingProvider";
import { OfferBanner } from "../components/OfferBanner";
import { RewardCard } from "../components/RewardCard";
import { SamplePdfLink } from "../components/SamplePdfLink";
import { AppearancePicker } from "../components/AppearancePicker";
import { GlassSurface } from "../components/GlassSurface";
import { Button } from "../components/Button";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

export function RewardsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { state } = useBooksContext();
  const { replay } = useOnboarding();
  const rewards = computeRewards(state.lists, DEMO_READER_ID);

  return (
    <ScreenShell testID="rewards-scroll">
      <Text style={styles.title} accessibilityRole="header">
        Rewards
      </Text>
      <OfferBanner />
      {state.status === "ready" ? (
        <View style={styles.list}>
          {rewards.map((r) => (
            <RewardCard key={r.id} reward={r} />
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>Rewards appear once your reading lists load.</Text>
      )}
      <SamplePdfLink />

      <GlassSurface style={styles.settings}>
        <Text style={styles.heading} accessibilityRole="header">
          Settings
        </Text>
        <Text style={styles.label}>Appearance</Text>
        <AppearancePicker />
        <Button label="Show the intro again" variant="outline" onPress={replay} />
      </GlassSurface>
    </ScreenShell>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    title: { ...type.display, color: colors.ink },
    list: { gap: spacing.md },
    muted: { ...type.body, color: colors.inkMuted },
    settings: { padding: spacing.lg, gap: spacing.md },
    heading: { ...type.heading, color: colors.ink },
    label: { ...type.label, color: colors.inkMuted },
  });
