import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOBILE_WALKTHROUGH, type WalkthroughStep } from "@rct/shared";
import type { Colors } from "../theme/colors";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";

/** The native view instance behind a <View> (has measureInWindow). */
export type ViewNode = React.ComponentRef<typeof View>;
type ViewType = ViewNode;
type Rect = { x: number; y: number; width: number; height: number };
type Measurer = () => Promise<Rect | null>;

interface Registry {
  register: (id: string, ref: React.RefObject<ViewType | null>) => void;
}
const TargetContext = createContext<Registry | null>(null);

/** Wrap a part of the screen so the walkthrough can highlight it. */
export function TourTarget({ id, children, style }: { id: string; children: React.ReactNode; style?: object }) {
  const ctx = useContext(TargetContext);
  const ref = useRef<ViewType>(null);
  useEffect(() => ctx?.register(id, ref), [ctx, id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

const PAD = 6;

/**
 * Coach-mark walkthrough for first-time users: dims the screen, highlights one part at a time and
 * explains it. Next / Back / Skip. `scrollTo` brings each target into view first.
 */
export function WalkthroughHost({
  visible,
  onDone,
  scrollTo,
  children,
  steps = MOBILE_WALKTHROUGH,
}: {
  visible: boolean;
  onDone: () => void;
  scrollTo?: (ref: React.RefObject<ViewType | null>) => Promise<void>;
  children: React.ReactNode;
  steps?: WalkthroughStep[];
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const targets = useRef(new Map<string, React.RefObject<ViewType | null>>());
  const [index, setIndex] = useState(0);
  const [measured, setMeasured] = useState<{ id: string; rect: Rect | null } | null>(null);
  const registry = useMemo<Registry>(() => ({ register: (id, ref) => void targets.current.set(id, ref) }), []);
  const step = steps[index]!;
  const last = index === steps.length - 1;
  const rect = measured?.id === step.id ? measured.rect : null;

  const measure: Measurer = useCallback(async () => {
    if (!step.target) return null;
    if (step.target === "tabs") {
      // The native tab bar can't be measured from JS; highlight the bottom strip where it sits.
      // Inside a tab screen the bottom inset already includes the tab bar, so use the bar's own size:
      // about 50 pt plus the home-indicator area on Face ID iPhones (34 pt).
      const h = 92;
      return { x: 12, y: H - h - 4, width: W - 24, height: h };
    }
    const ref = targets.current.get(step.target);
    if (!ref?.current) return null;
    await scrollTo?.(ref);
    return new Promise<Rect | null>((resolve) => {
      ref.current!.measureInWindow((x: number, y: number, width: number, height: number) => resolve(width && height ? { x, y, width, height } : null));
    });
  }, [step, scrollTo, H, W]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const id = step.id;
    void measure().then((r) => alive && setMeasured({ id, rect: r }));
    AccessibilityInfo.announceForAccessibility(`Step ${index + 1} of ${steps.length}. ${step.title}. ${step.body}`);
    return () => {
      alive = false;
    };
  }, [visible, index, measure, step, steps.length]);

  const finish = () => {
    setMeasured(null);
    setIndex(0); // a replay starts from the first step
    onDone();
  };

  // Card goes below the highlight if it fits, else above, else pinned to the bottom.
  const CARD_H = 250;
  let cardPos: object = { top: H / 2 - CARD_H / 2 };
  if (rect) {
    const below = rect.y + rect.height + PAD + 10;
    if (below + CARD_H < H - insets.bottom) cardPos = { top: below };
    else if (rect.y - PAD - 10 - CARD_H > insets.top) cardPos = { top: rect.y - PAD - 10 - CARD_H };
    else cardPos = { bottom: insets.bottom + 100 };
  }
  const dim = "rgba(20,18,14,0.62)";
  const hole = rect && { x: rect.x - PAD, y: rect.y - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 };

  return (
    <TargetContext.Provider value={registry}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={finish} statusBarTranslucent>
        <View style={StyleSheet.absoluteFill} testID="walkthrough">
          {hole ? (
            <>
              <View style={[styles.dim, { backgroundColor: dim, top: 0, left: 0, right: 0, height: Math.max(0, hole.y) }]} />
              <View style={[styles.dim, { backgroundColor: dim, top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} />
              <View style={[styles.dim, { backgroundColor: dim, top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.h }]} />
              <View style={[styles.dim, { backgroundColor: dim, top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} />
              <View pointerEvents="none" style={[styles.ring, { top: hole.y, left: hole.x, width: hole.w, height: hole.h, borderColor: colors.mango }]} />
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: dim }]} />
          )}
          <View style={[styles.card, cardPos]} accessibilityViewIsModal accessibilityRole="alert" testID={`walkthrough-step-${step.id}`}>
            <Text style={styles.count}>
              STEP {index + 1} OF {steps.length}
            </Text>
            <Text style={styles.title} accessibilityRole="header">
              {step.title}
            </Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.dots}>
              {steps.map((s, i) => (
                <View key={s.id} style={[styles.dot, i === index && styles.dotOn]} />
              ))}
            </View>
            <View style={styles.actions}>
              {!last && (
                <Pressable accessibilityRole="button" accessibilityLabel="Skip tour" onPress={finish} hitSlop={8} style={styles.skip}>
                  <Text style={styles.skipText}>Skip tour</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              {index > 0 && (
                <Pressable accessibilityRole="button" onPress={() => setIndex(index - 1)} style={[styles.btn, styles.btnOutline]}>
                  <Text style={styles.btnOutlineText}>Back</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={() => (last ? finish() : setIndex(index + 1))} style={[styles.btn, styles.btnPrimary]} testID="walkthrough-next">
                <Text style={styles.btnPrimaryText}>{last ? "Finish" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </TargetContext.Provider>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    dim: { position: "absolute" },
    ring: { position: "absolute", borderWidth: 3, borderRadius: radius.lg },
    card: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    count: { ...type.caption, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, color: c.mangoStrong },
    title: { ...type.heading, fontSize: 20, color: c.ink },
    body: { ...type.body, fontSize: 15, color: c.inkMuted },
    dots: { flexDirection: "row", gap: 5, marginVertical: 2 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.line },
    dotOn: { width: 18, backgroundColor: c.mangoStrong },
    actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    skip: { minHeight: touchTarget, justifyContent: "center" },
    skipText: { ...type.label, color: c.inkMuted, textDecorationLine: "underline" },
    btn: { minHeight: touchTarget, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
    btnPrimary: { backgroundColor: c.ink },
    btnPrimaryText: { ...type.label, color: c.onInk },
    btnOutline: { borderWidth: 2, borderColor: c.ink, backgroundColor: c.surface },
    btnOutlineText: { ...type.label, color: c.ink },
  });
