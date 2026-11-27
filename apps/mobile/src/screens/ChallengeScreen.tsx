import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBooks } from "../lib/useBooks";
import { ListCard } from "../components/ListCard";
import { Notice } from "../components/Notice";
import { WelcomeVideo } from "../components/WelcomeVideo";
import { SamplePdfLink } from "../components/SamplePdfLink";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { type } from "../theme/typography";

/** One scrollable screen: heading, both lists, compact video, sample PDF. */
export function ChallengeScreen() {
  const { state, load, setRead } = useBooks();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} testID="challenge-scroll">
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

        <WelcomeVideo />
        <SamplePdfLink />
        <Text style={styles.footer}>A fictional library made for a coding exercise. One demo reader; no sign-in.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  brand: { ...type.label, color: colors.inkMuted },
  title: { ...type.display, color: colors.ink, marginTop: -spacing.sm },
  lede: { ...type.body, color: colors.inkMuted, marginTop: -spacing.sm },
  lists: { gap: spacing.lg },
  loading: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  loadingText: { ...type.body, color: colors.inkMuted, fontWeight: "600" },
  footer: { ...type.caption, color: colors.inkMuted },
});
