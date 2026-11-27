import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  LIBRARY_FILTERS,
  filterAndSearch,
  filterCounts,
  formatDuration,
  formatLastRead,
  type LibraryBook,
  type LibraryFilter,
  type ReaderPrefs,
  type Stats,
} from "@rct/shared";
import { useLibrary } from "../lib/useLibrary";
import { BookCard, BookTile } from "../components/reading/BookCard";
import { GlassSurface } from "../components/GlassSurface";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import type { Colors } from "../theme/colors";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

/** My Library: stats, goal + streak, Continue / Recently Read, search, filters and the book list. */
export function LibraryScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { state, retry, refresh, saveGoal } = useLibrary();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");

  // Refresh when the tab comes back into focus (e.g. after reading).
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const books = useMemo(() => (state.status === "ready" ? state.books : []), [state]);
  const visible = useMemo(() => filterAndSearch(books, filter, query), [books, filter, query]);
  const counts = useMemo(() => filterCounts(books), [books]);

  if (state.status === "loading") {
    return (
      <ScreenShell testID="library-scroll">
        <Text style={styles.title} accessibilityRole="header">My Library</Text>
        <View style={styles.loading} testID="library-loading">
          <ActivityIndicator color={colors.mangoStrong} />
          <Text style={styles.muted}>Loading your library…</Text>
        </View>
      </ScreenShell>
    );
  }
  if (state.status === "error") {
    return (
      <ScreenShell testID="library-scroll">
        <Text style={styles.title} accessibilityRole="header">My Library</Text>
        <Notice message={state.message} actionLabel="Try again" onAction={retry} testID="library-error" />
      </ScreenShell>
    );
  }

  const byId = new Map(books.map((b) => [b.id, b]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((b): b is LibraryBook => !!b);
  const continueReading = pick(state.stats.continueReading);
  const recent = pick(state.stats.recentlyRead);
  const note = books[0]?.contentNote;

  return (
    <ScreenShell testID="library-scroll" keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">My Library</Text>
      {note && <Notice tone="warning" message={note} testID="content-note" />}
      <StatsGrid stats={state.stats} />
      <GoalCard stats={state.stats} prefs={state.prefs} onSave={saveGoal} />

      {continueReading.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">Continue reading</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} testID="continue-reading">
            {continueReading.map((b) => (
              <BookTile
                key={b.id}
                book={b}
                caption={`Page ${b.progress.currentPage} of ${b.progress.totalPages}`}
                href={b.readable ? { pathname: "/read/[id]", params: { id: b.id } } : { pathname: "/book/[id]", params: { id: b.id } }}
              />
            ))}
          </ScrollView>
        </View>
      )}
      {recent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">Recently read</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} testID="recently-read">
            {recent.map((b) => (
              <BookTile key={b.id} book={b} caption={formatLastRead(b.progress.lastReadAt)} href={{ pathname: "/book/[id]", params: { id: b.id } }} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">My books</Text>
        <TextInput
          style={styles.search}
          placeholder="Search title, author or category"
          placeholderTextColor={colors.inkMuted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search books"
          clearButtonMode="while-editing"
          returnKeyType="search"
          testID="library-search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Filter by status">
          {LIBRARY_FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <Pressable key={f.id} accessibilityRole="radio" accessibilityState={{ checked: on, selected: on }} accessibilityLabel={`${f.label}, ${counts[f.id]}`} onPress={() => setFilter(f.id)} style={[styles.chip, on && styles.chipOn]} testID={`filter-${f.id}`}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {f.label} {counts[f.id]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {visible.length ? (
          <View style={styles.list} testID="library-grid">
            {visible.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </View>
        ) : (
          <View style={styles.empty} testID="library-empty">
            <Text style={styles.emptyTitle}>No books match.</Text>
            <Text style={styles.muted}>Try another search or filter.</Text>
            <Button
              label="Clear search and filter"
              variant="outline"
              onPress={() => {
                setQuery("");
                setFilter("all");
              }}
            />
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

function StatsGrid({ stats }: { stats: Stats }) {
  const styles = useThemedStyles(makeStyles);
  const items: [string, string][] = [
    ["Total books", String(stats.totalBooks)],
    ["Reading", String(stats.reading)],
    ["Completed", String(stats.completed)],
    ["Pages read", String(stats.pagesRead)],
    ["Reading time", formatDuration(stats.secondsRead)],
  ];
  return (
    <View style={styles.stats} testID="reading-stats">
      {items.map(([label, value]) => (
        <GlassSurface key={label} style={styles.stat}>
          <View accessible accessibilityLabel={`${label}: ${value}`}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        </GlassSurface>
      ))}
    </View>
  );
}

function GoalCard({ stats, prefs, onSave }: { stats: Stats; prefs: ReaderPrefs; onSave: (g: ReaderPrefs["goal"]) => Promise<boolean> }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState(prefs.goal.period);
  const [minutes, setMinutes] = useState(String(prefs.goal.minutes));
  const [error, setError] = useState<string | null>(null);
  const { goal, streak } = stats;
  return (
    <GlassSurface style={styles.goal} testID="goal-card">
      <View style={styles.goalTop}>
        <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.ringFill, { height: `${goal.percent}%` }]} />
          <Text style={styles.ringText}>{goal.percent}%</Text>
        </View>
        <View style={{ flex: 1 }} accessible accessibilityLabel={`${goal.period === "daily" ? "Today's goal" : "This week's goal"}: ${goal.minutesDone} of ${goal.targetMinutes} minutes. ${streak} day streak.`}>
          <Text style={styles.heading}>{goal.period === "daily" ? "Today's goal" : "This week's goal"}</Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: "700" }}>
              {goal.minutesDone} of {goal.targetMinutes} min
            </Text>
            {goal.met ? " · Goal reached ✓" : " read"}
          </Text>
          <Text style={styles.streak} testID="streak">
            🔥 {streak} day{streak === 1 ? "" : "s"} streak
          </Text>
        </View>
      </View>
      {editing ? (
        <View style={styles.goalForm}>
          <View style={styles.segments}>
            {(["daily", "weekly"] as const).map((p) => (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: period === p }} onPress={() => setPeriod(p)} style={[styles.segment, period === p && styles.segmentOn]}>
                <Text style={[styles.segmentText, period === p && styles.segmentTextOn]}>{p === "daily" ? "Daily" : "Weekly"}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.search} keyboardType="number-pad" value={minutes} onChangeText={setMinutes} accessibilityLabel="Goal in minutes" placeholderTextColor={colors.inkMuted} />
          <Button
            label="Save goal"
            onPress={async () => {
              const n = Number(minutes);
              if (!Number.isInteger(n) || n < 5 || n > 1000) return setError("Choose between 5 and 1000 minutes.");
              const ok = await onSave({ period, minutes: n });
              if (ok) {
                setEditing(false);
                setError(null);
              } else setError("Couldn't save your goal. Try again.");
            }}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      ) : (
        <Button label="Change goal" variant="outline" onPress={() => setEditing(true)} />
      )}
    </GlassSurface>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    title: { ...type.display, color: c.ink },
    heading: { ...type.heading, fontSize: 20, color: c.ink },
    body: { ...type.body, color: c.ink },
    muted: { ...type.body, color: c.inkMuted },
    loading: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: spacing.xl },
    section: { gap: spacing.md },
    row: { gap: spacing.md, paddingRight: spacing.lg },
    stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    stat: { flexGrow: 1, minWidth: "30%", padding: spacing.md },
    statLabel: { ...type.caption, color: c.inkMuted, fontWeight: "600" },
    statValue: { fontFamily: type.display.fontFamily, fontSize: 24, fontWeight: "700", color: c.ink },
    goal: { padding: spacing.lg, gap: spacing.md },
    goalTop: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
    ring: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceSunk, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    ringFill: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.mangoBar, opacity: 0.85 },
    ringText: { ...type.label, color: c.ink },
    streak: { ...type.label, color: c.mangoStrong, marginTop: 2 },
    goalForm: { gap: spacing.sm },
    segments: { flexDirection: "row", padding: 3, gap: 2, borderRadius: radius.pill, backgroundColor: c.surfaceSunk },
    segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
    segmentOn: { backgroundColor: c.ink },
    segmentText: { ...type.label, color: c.inkMuted },
    segmentTextOn: { color: c.onInk },
    error: { ...type.caption, color: c.danger, fontWeight: "700" },
    search: { minHeight: touchTarget, borderRadius: radius.pill, paddingHorizontal: spacing.lg, backgroundColor: c.glassFill, borderWidth: 1, borderColor: c.line, color: c.ink, fontSize: 16 },
    chips: { gap: spacing.sm, paddingRight: spacing.lg },
    chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, backgroundColor: c.glassFill, justifyContent: "center" },
    chipOn: { backgroundColor: c.ink, borderColor: c.ink },
    chipText: { ...type.label, color: c.ink },
    chipTextOn: { color: c.onInk },
    list: { gap: spacing.md },
    empty: { gap: spacing.sm, padding: spacing.xl, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: c.line, alignItems: "flex-start" },
    emptyTitle: { ...type.title, color: c.ink },
  });
