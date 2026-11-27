import { useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "../lib/OnboardingProvider";
import { BackgroundBubbles } from "../components/BackgroundBubbles";
import { GlassSurface } from "../components/GlassSurface";
import { Button } from "../components/Button";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { useReducedMotion } from "../theme/motion";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";

const SLIDES = [
  { key: "lists", emoji: "📚", title: "Track two reading lists", body: "Three fiction and three nonfiction books. Tick each one off as you finish it — progress is saved for you." },
  { key: "video", emoji: "▶️", title: "Pick up where you paused", body: "Watch the short welcome video. Pause any time and it resumes from the same spot, on the web or on your phone." },
  { key: "rewards", emoji: "🎁", title: "Unlock library rewards", body: "Finish a list for a bookmark. Finish both to collect a free tote bag at the front desk." },
] as const;

/** Three-slide intro shown once. Skip or Get started stores the flag and opens the tabs. */
export function OnboardingScreen() {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const { complete } = useOnboarding();
  const reduced = useReducedMotion();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (i !== index) setIndex(i);
  };
  const next = () => {
    if (last) return complete();
    const i = index + 1;
    setIndex(i);
    try {
      listRef.current?.scrollToIndex({ index: i, animated: !reduced });
    } catch {
      /* list not laid out yet; the index state still advances */
    }
  };

  return (
    <View style={styles.root} testID="onboarding">
      <BackgroundBubbles />
      <SafeAreaView style={styles.root}>
        <View style={styles.top}>
          <Text style={styles.brand}>Lantern Lane Library</Text>
          {!last && <Button label="Skip" variant="outline" accessibilityLabel="Skip the intro" onPress={complete} />}
        </View>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          keyExtractor={(s) => s.key}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index: i }) => (
            <View style={[styles.slide, { width }]} accessible accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}. ${item.title}. ${item.body}`}>
              <GlassSurface style={styles.card}>
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </GlassSurface>
            </View>
          )}
        />
        <View style={styles.bottom}>
          <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`} accessible>
            {SLIDES.map((s, i) => (
              <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button label={last ? "Get started" : "Next"} onPress={next} style={styles.cta} testID="onboarding-next" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    root: { flex: 1 },
    top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    brand: { ...type.label, color: colors.inkMuted },
    slide: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
    card: { padding: spacing.xl, gap: spacing.md, alignItems: "flex-start" },
    emojiWrap: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center" },
    emoji: { fontSize: 36 },
    title: { ...type.display, fontSize: 28, lineHeight: 34, color: colors.ink },
    body: { ...type.body, color: colors.inkMuted },
    bottom: { padding: spacing.lg, gap: spacing.lg, alignItems: "center" },
    dots: { flexDirection: "row", gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
    dotActive: { width: 24, backgroundColor: colors.mangoStrong },
    cta: { alignSelf: "stretch" },
  });
