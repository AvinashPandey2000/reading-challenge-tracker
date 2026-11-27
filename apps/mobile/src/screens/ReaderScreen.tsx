import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ALIGNMENTS,
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  LINE_SPACINGS,
  READER_BACKGROUNDS,
  READER_THEMES,
  readerColors,
  type HighlightColor,
  type ReaderBackground,
} from "@rct/shared";
import { useReader } from "../lib/useReader";
import { Annotations, HIGHLIGHT_EDGE } from "./BookDetailsScreen";
import { Button } from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/spacing";

const FONT = {
  serif: Platform.select({ ios: "Georgia", default: "serif" }),
  sans: Platform.select({ ios: "System", default: "sans-serif" }),
  mono: Platform.select({ ios: "Menlo", default: "monospace" }),
} as const;
const FONT_LABEL = { serif: "Serif", sans: "Sans", mono: "Mono" } as const;
const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: "rgba(250, 204, 21, 0.38)",
  green: "rgba(74, 222, 128, 0.32)",
  blue: "rgba(96, 165, 250, 0.32)",
  pink: "rgba(244, 114, 182, 0.30)",
};

export function ReaderScreen({ bookId, initialPage }: { bookId: string; initialPage: number | null }) {
  const r = useReader(bookId, initialPage);
  const { colors: ui } = useTheme();
  const [sheet, setSheet] = useState<null | "settings" | "notes">(null);
  const [selection, setSelection] = useState<{ page: number; index: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const total = r.details?.book.progress.totalPages ?? r.page?.totalPages ?? 0;
  const current = r.page?.page ?? 0;
  const c = readerColors(r.prefs);
  const selected = selection?.page === current ? selection.index : null;

  // Horizontal swipe turns pages; vertical scrolling is left to the ScrollView.
  const goRef = useRef(r.goTo);
  const pageRef = useRef(current);
  useEffect(() => {
    goRef.current = r.goTo;
    pageRef.current = current;
  });
  const pan = useMemo(
    () =>
      // The refs are only read inside the gesture callbacks, never during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) < 70) return;
          void goRef.current(g.dx < 0 ? pageRef.current + 1 : pageRef.current - 1);
        },
      }),
    [],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (current) AccessibilityInfo.announceForAccessibility(`Page ${current} of ${total}`);
  }, [current, total]);

  useEffect(() => {
    if (r.finished) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [r.finished]);

  const turn = (n: number) => {
    r.touch();
    if (n >= 1 && n <= total) void Haptics.selectionAsync().catch(() => undefined);
    void r.goTo(n);
  };

  if (r.load.status === "loading") {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: ui.background }]} testID="reader-loading">
        <ActivityIndicator color={ui.mangoStrong} />
        <Text style={{ color: ui.inkMuted, marginTop: spacing.sm }}>Opening book…</Text>
      </SafeAreaView>
    );
  }
  if (r.load.status === "error" || !r.details || !r.page) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: ui.background, padding: spacing.xl }]}>
        <Text style={{ color: ui.danger, fontWeight: "700", textAlign: "center" }} accessibilityRole="alert">
          {r.load.status === "error" ? r.load.message : "Couldn't open this book."}
        </Text>
        <Button label="Back" variant="outline" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </SafeAreaView>
    );
  }

  const { book } = r.details;
  const percent = total ? Math.round((current / total) * 100) : 0;
  const selectedHighlight = selected !== null ? r.highlightFor(current, selected) : undefined;
  const isChapterStart = r.details.chapters.some((ch) => ch.startPage === current);
  const textStyle = {
    color: c.text,
    fontSize: r.prefs.fontSize,
    lineHeight: Math.round(r.prefs.fontSize * r.prefs.lineSpacing),
    textAlign: r.prefs.align,
    fontFamily: FONT[r.prefs.fontFamily],
  } as const;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={["top", "left", "right"]} testID="reader">
      <View style={[styles.topBar, { borderBottomColor: `${c.text}22` }]}>
        <IconButton label={`Back to ${book.title} details`} color={c.text} onPress={() => router.back()} text="←" />
        <View style={styles.titleBlock}>
          <Text style={[styles.bookTitle, { color: c.text }]} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={[styles.chapter, { color: c.muted }]} numberOfLines={1}>
            {r.page.chapterTitle ?? ""}
          </Text>
        </View>
        <IconButton
          label={r.isBookmarked ? `Remove bookmark on page ${current}` : `Bookmark page ${current}`}
          selected={r.isBookmarked}
          color={r.isBookmarked ? c.accent : c.text}
          onPress={() => void r.toggleBookmark()}
          text={r.isBookmarked ? "★" : "☆"}
          testID="bookmark-toggle"
        />
        <IconButton label="Reading settings" color={c.text} onPress={() => setSheet("settings")} text="Aa" testID="settings-toggle" />
        <IconButton label="Bookmarks, highlights and notes" color={c.text} onPress={() => setSheet("notes")} text="≡" testID="notes-toggle" />
      </View>
      {book.contentNote && <Text style={[styles.contentNote, { color: c.muted }]}>{book.contentNote}</Text>}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.page} onTouchStart={r.touch} onScrollBeginDrag={r.touch} {...pan.panHandlers} testID="page-text" accessibilityLabel={`Page ${current} of ${total}`}>
        {isChapterStart && r.page.chapterTitle && (
          <Text style={[styles.chapterHeading, { color: c.text, fontFamily: FONT.serif }]} accessibilityRole="header">
            {r.page.chapterTitle}
          </Text>
        )}
        {r.page.paragraphs.map((text, i) => {
          const h = r.highlightFor(current, i);
          return (
            <Pressable
              key={`${current}-${i}`}
              onLongPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                setSelection({ page: current, index: i });
                setNoteDraft(h?.note ?? "");
              }}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityHint="Long press to highlight or add a note"
              accessibilityActions={[{ name: "longpress", label: "Highlight or add a note" }]}
              onAccessibilityAction={() => {
                setSelection({ page: current, index: i });
                setNoteDraft(h?.note ?? "");
              }}
              style={[styles.paragraph, h && { backgroundColor: HIGHLIGHT_BG[h.color] }, selected === i && { borderLeftWidth: 3, borderLeftColor: c.accent }]}
              testID={`paragraph-${i}`}
            >
              <Text style={textStyle}>
                {text}
                {h?.note ? <Text style={{ color: c.accent, fontWeight: "700" }}> ✎</Text> : null}
              </Text>
            </Pressable>
          );
        })}
        {r.pageError && (
          <View style={styles.errorBox}>
            <Text style={{ color: ui.danger, fontWeight: "700" }}>{r.pageError}</Text>
            <Button label="Try again" variant="outline" onPress={() => void r.retryPage()} />
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={[styles.bottomBar, { backgroundColor: c.background, borderTopColor: `${c.text}22` }]}>
        <View style={[styles.track, { backgroundColor: `${c.text}1F` }]}>
          <View style={[styles.trackFill, { width: `${percent}%`, backgroundColor: c.accent }]} />
        </View>
        <View style={styles.nav}>
          <NavButton label="← Previous" color={c.text} disabled={current <= 1} onPress={() => turn(current - 1)} testID="prev-page" />
          <Text style={[styles.pageLabel, { color: c.muted }]} testID="page-label">
            Page {current} of {total} · {percent}%
          </Text>
          <NavButton label="Next →" color={c.text} disabled={current >= total} onPress={() => turn(current + 1)} testID="next-page" />
        </View>
      </SafeAreaView>

      {/* Highlight + note sheet */}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelection(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelection(null)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: ui.surface }]} testID="highlight-sheet">
          <Text style={[styles.sheetTitle, { color: ui.ink }]}>Highlight</Text>
          <View style={styles.colorRow}>
            {HIGHLIGHT_COLORS.map((col) => (
              <Pressable
                key={col}
                accessibilityRole="button"
                accessibilityLabel={`Highlight ${col}`}
                accessibilityState={{ selected: selectedHighlight?.color === col }}
                onPress={() => selected !== null && void r.setHighlight(selected, col)}
                style={[styles.colorDot, { backgroundColor: HIGHLIGHT_BG[col], borderColor: selectedHighlight?.color === col ? ui.ink : HIGHLIGHT_EDGE[col] }]}
                testID={`highlight-${col}`}
              />
            ))}
          </View>
          <TextInput
            style={[styles.input, { color: ui.ink, borderColor: ui.line, backgroundColor: ui.background }]}
            placeholder="Add a note…"
            placeholderTextColor={ui.inkMuted}
            value={noteDraft}
            onChangeText={setNoteDraft}
            maxLength={2000}
            multiline
            accessibilityLabel="Note for this paragraph"
            testID="highlight-note-input"
          />
          <View style={styles.sheetActions}>
            {selectedHighlight && (
              <Button
                label="Remove"
                variant="danger"
                onPress={() => {
                  void r.removeHighlight(selectedHighlight.id);
                  setSelection(null);
                }}
              />
            )}
            <Button
              label="Save"
              onPress={() => {
                if (selected === null) return;
                if (selectedHighlight) void r.saveHighlightNote(selectedHighlight.id, noteDraft.trim() || null);
                else void r.setHighlight(selected, "yellow", noteDraft.trim() || null);
                setSelection(null);
              }}
              testID="save-highlight"
            />
          </View>
        </View>
      </Modal>

      {/* Settings sheet */}
      <Modal visible={sheet === "settings"} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} accessibilityLabel="Close settings" />
        <ScrollView style={[styles.sheet, { backgroundColor: ui.surface, maxHeight: "75%" }]} contentContainerStyle={{ gap: spacing.md }} testID="reader-settings">
          <Text style={[styles.sheetTitle, { color: ui.ink }]}>Reading settings</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: ui.inkMuted }]}>Font size</Text>
            <View style={styles.stepper}>
              <Button label="A−" variant="outline" accessibilityLabel="Decrease font size" disabled={r.prefs.fontSize <= FONT_SIZES.min} onPress={() => void r.updatePrefs({ fontSize: r.prefs.fontSize - FONT_SIZES.step })} />
              <Text style={{ color: ui.ink, fontWeight: "700", minWidth: 48, textAlign: "center" }} testID="font-size">
                {r.prefs.fontSize}px
              </Text>
              <Button label="A+" variant="outline" accessibilityLabel="Increase font size" disabled={r.prefs.fontSize >= FONT_SIZES.max} onPress={() => void r.updatePrefs({ fontSize: r.prefs.fontSize + FONT_SIZES.step })} />
            </View>
          </View>
          <Segmented label="Font style" value={r.prefs.fontFamily} options={FONT_FAMILIES.map((f) => [f, FONT_LABEL[f]])} onChange={(v) => void r.updatePrefs({ fontFamily: v })} />
          <Segmented label="Theme" value={r.prefs.theme} options={READER_THEMES.map((t) => [t, t[0]!.toUpperCase() + t.slice(1)])} onChange={(v) => void r.updatePrefs({ theme: v })} />
          <Segmented label="Line spacing" value={String(r.prefs.lineSpacing)} options={LINE_SPACINGS.map((l) => [String(l), `${l}×`])} onChange={(v) => void r.updatePrefs({ lineSpacing: Number(v) as 1.3 | 1.5 | 1.7 | 2 })} />
          <Segmented label="Alignment" value={r.prefs.align} options={ALIGNMENTS.map((a) => [a, a === "left" ? "Left" : "Justify"])} onChange={(v) => void r.updatePrefs({ align: v })} />
          <View accessibilityRole="radiogroup" accessibilityLabel="Background">
            <Text style={[styles.settingLabel, { color: ui.inkMuted, marginBottom: spacing.xs }]}>Background</Text>
            <View style={styles.colorRow}>
              {(Object.keys(READER_BACKGROUNDS) as ReaderBackground[]).map((key) => {
                const swatch = READER_BACKGROUNDS[key][r.prefs.theme] ?? readerColors({ theme: r.prefs.theme, background: "theme" }).background;
                const on = r.prefs.background === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityLabel={READER_BACKGROUNDS[key].label}
                    accessibilityState={{ checked: on }}
                    onPress={() => void r.updatePrefs({ background: key })}
                    style={[styles.colorDot, { backgroundColor: swatch, borderColor: on ? ui.ink : ui.line, borderWidth: on ? 3 : 2 }]}
                  />
                );
              })}
            </View>
          </View>
          <Button label="Done" onPress={() => setSheet(null)} />
        </ScrollView>
      </Modal>

      {/* Notes sheet */}
      <Modal visible={sheet === "notes"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}>
        <SafeAreaView style={[styles.fill, { backgroundColor: ui.background }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: ui.ink }]}>Your notes</Text>
            <Button label="Close" variant="outline" onPress={() => setSheet(null)} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
            <Annotations
              bookId={book.id}
              readable
              bookmarks={r.bookmarks}
              highlights={r.highlights}
              notes={r.notes}
              busy={false}
              onAddNote={r.addNote}
              onDeleteNote={r.deleteNote}
              onDeleteBookmark={r.deleteBookmark}
              onDeleteHighlight={r.removeHighlight}
              onJump={(n) => {
                setSheet(null);
                void r.goTo(n);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Finished */}
      <Modal visible={r.finished} transparent animationType="fade" onRequestClose={r.dismissFinished}>
        <View style={[styles.backdrop, styles.center]}>
          <View style={[styles.finish, { backgroundColor: ui.surface }]} testID="finished-dialog" accessibilityViewIsModal>
            <View style={[styles.finishBadge, { backgroundColor: ui.greenFill, borderColor: ui.greenSoft }]}>
              <Text style={styles.finishTick}>✓</Text>
            </View>
            <Text style={[styles.sheetTitle, { color: ui.ink, textAlign: "center" }]} accessibilityRole="header">
              You finished {book.title}!
            </Text>
            <Text style={{ color: ui.inkMuted, textAlign: "center" }}>
              It&apos;s marked as Completed{book.listId ? " and counts toward your reading challenge" : ""}.
            </Text>
            <View style={styles.sheetActions}>
              <Button label="My Library" variant="outline" onPress={() => { r.dismissFinished(); router.navigate("/library"); }} />
              <Button label="Keep reading" onPress={r.dismissFinished} />
            </View>
          </View>
        </View>
      </Modal>

      {r.message && (
        <Pressable style={[styles.toast, { backgroundColor: ui.ink }]} onPress={() => r.setMessage(null)} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text style={{ color: ui.onInk, fontWeight: "700" }}>{r.message}</Text>
        </Pressable>
      )}
      <ToastTimer message={r.message} clear={() => r.setMessage(null)} />
    </SafeAreaView>
  );
}

function ToastTimer({ message, clear }: { message: string | null; clear: () => void }) {
  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
    const t = setTimeout(clear, 3000);
    return () => clearTimeout(t);
  }, [message, clear]);
  return null;
}

function IconButton({ label, text, color, onPress, selected, testID }: { label: string; text: string; color: string; onPress: () => void; selected?: boolean; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress} style={styles.iconButton} hitSlop={4} testID={testID}>
      <Text style={{ color, fontSize: 20, fontWeight: "700" }}>{text}</Text>
    </Pressable>
  );
}

function NavButton({ label, color, disabled, onPress, testID }: { label: string; color: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.navButton, { borderColor: `${color}40`, opacity: disabled ? 0.4 : 1 }]} testID={testID}>
      <Text style={{ color, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: string; options: [T, string][]; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: spacing.xs }}>
      <Text style={[styles.settingLabel, { color: colors.inkMuted }]}>{label}</Text>
      <View style={[styles.segments, { backgroundColor: colors.surfaceSunk }]}>
        {options.map(([v, text]) => {
          const on = v === value;
          return (
            <Pressable key={v} accessibilityRole="radio" accessibilityLabel={`${label}: ${text}`} accessibilityState={{ checked: on }} onPress={() => onChange(v)} style={[styles.segment, on && { backgroundColor: colors.ink }]} testID={`${label}-${v}`}>
              <Text style={{ fontWeight: "700", color: on ? colors.onInk : colors.inkMuted }}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  titleBlock: { flex: 1, alignItems: "center" },
  bookTitle: { fontWeight: "700", fontSize: 15 },
  chapter: { fontSize: 12 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  contentNote: { textAlign: "center", fontSize: 12, paddingTop: spacing.xs },
  page: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chapterHeading: { fontSize: 26, lineHeight: 32, fontWeight: "700", marginBottom: spacing.lg },
  paragraph: { marginBottom: spacing.md, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
  errorBox: { gap: spacing.sm, padding: spacing.md },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth },
  track: { height: 3 },
  trackFill: { height: "100%" },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  navButton: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center" },
  pageLabel: { flex: 1, textAlign: "center", fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: "rgba(20,18,14,0.45)" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  sheetTitle: { fontSize: 20, fontWeight: "700" },
  sheetActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end", flexWrap: "wrap" },
  colorRow: { flexDirection: "row", gap: spacing.md },
  colorDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  input: { minHeight: 64, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, fontSize: 16, textAlignVertical: "top" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLabel: { fontSize: 13, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  segments: { flexDirection: "row", padding: 3, gap: 2, borderRadius: radius.pill },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  finish: { margin: spacing.xl, padding: spacing.xl, borderRadius: 22, gap: spacing.md, alignItems: "center", maxWidth: 380 },
  finishBadge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", borderWidth: 6 },
  finishTick: { color: "#fff", fontSize: 30, fontWeight: "800" },
  toast: { position: "absolute", alignSelf: "center", bottom: 110, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
});
