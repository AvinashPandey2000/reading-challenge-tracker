import { useCallback, useRef } from "react";
import { AccessibilityInfo, ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useBooksContext } from "../lib/BooksProvider";
import { ListCard } from "../components/ListCard";
import { Notice } from "../components/Notice";
import { OfferBanner } from "../components/OfferBanner";
import { TourTarget, WalkthroughHost, type ViewNode } from "../components/Walkthrough";
import { useOnboarding } from "../lib/OnboardingProvider";
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
  const { onboarded, complete } = useOnboarding();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);

  /** Scrolls so the walkthrough target sits near the top third of the screen. */
  const scrollTo = useCallback(async (ref: React.RefObject<ViewNode | null>) => {
    const node = ref.current;
    if (!node || !scrollRef.current) return;
    const y = await new Promise<number>((r) => node.measureInWindow((_x: number, wy: number) => r(wy)));
    const reduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    scrollRef.current.scrollTo({ y: Math.max(0, offset.current + y - 160), animated: !reduce });
    await new Promise((r) => setTimeout(r, reduce ? 50 : 380));
  }, []);

  return (
    <WalkthroughHost visible={onboarded === false && state.status === "ready"} onDone={complete} scrollTo={scrollTo}>
    <ScreenShell
      testID="challenge-scroll"
      scrollRef={scrollRef}
      scrollEventThrottle={16}
      onScroll={(e) => {
        offset.current = e.nativeEvent.contentOffset.y;
      }}
    >
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
          <TourTarget id="lists" style={styles.lists}>
            {state.lists.map((list, i) => (
              <ListCard key={list.id} list={list} pending={state.pending} errors={state.errors} onToggle={(id, read) => void setRead(id, read)} tourFirstBook={i === 0} />
            ))}
          </TourTarget>
        </View>
      )}

      <TourTarget id="offer">
        <OfferBanner compact />
      </TourTarget>
    </ScreenShell>
    </WalkthroughHost>
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
