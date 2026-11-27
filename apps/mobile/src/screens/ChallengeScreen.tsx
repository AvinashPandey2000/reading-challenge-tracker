import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useBooksContext } from "../lib/BooksProvider";
import { ListCard } from "../components/ListCard";
import { Notice } from "../components/Notice";
import { OfferBanner } from "../components/OfferBanner";
import type { Colors } from "../theme/colors";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

/** Challenge tab: both lists on one scrollable screen. */
export function ChallengeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { state, load, setRead } = useBooksContext();

  return (
    <ScreenShell testID="challenge-scroll">
      <Text style={styles.brand}>Lantern Lane Library</Text>
      <Text style={styles.title} accessibilityRole="header">
        Your reading challenge
      </Text>
      <Text style={styles.lede}>Read three fiction and three nonfiction books. Tick each one off when you finish it.</Text>

      {state.status === "loading" && (
        <View style={styles.loading} accessibilityLiveRegion="polite" testID="lists-loading">
          <ActivityIndicator color={colors.mangoStrong} />
          <Text style={styles.loadingText}>Loading your reading lists…</Text>
        </View>
      )}

      {state.status === "error" && (
        <Notice message={state.loadError ?? ""} actionLabel="Try again" onAction={() => void load()} testID="lists-error" />
      )}

      {state.status === "ready" && (
        <View style={styles.lists}>
          {state.loadError && <Notice message={state.loadError} actionLabel="Try again" onAction={() => void load()} />}
          {state.lists.map((list) => (
            <ListCard key={list.id} list={list} pending={state.pending} errors={state.errors} onToggle={(id, read) => void setRead(id, read)} />
          ))}
        </View>
      )}

      <OfferBanner compact />
    </ScreenShell>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    brand: { ...type.label, color: colors.inkMuted },
    title: { ...type.display, color: colors.ink, marginTop: -spacing.sm },
    lede: { ...type.body, color: colors.inkMuted, marginTop: -spacing.sm },
    lists: { gap: spacing.lg },
    loading: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
    loadingText: { ...type.body, color: colors.inkMuted, fontWeight: "600" },
  });
