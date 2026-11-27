import { useCallback, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { formatDuration, formatLastRead, pagesLabel, type Bookmark, type Highlight, type Note } from "@rct/shared";
import { useBookDetails } from "../lib/useBookDetails";
import { BookCover } from "../components/reading/BookCover";
import { ProgressMeter, StatusBadge } from "../components/reading/bits";
import { GlassSurface } from "../components/GlassSurface";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import type { Colors } from "../theme/colors";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

export function BookDetailsScreen({ bookId }: { bookId: string }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const d = useBookDetails(bookId);
  const [message, setMessage] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");

  // Coming back from the reader shows the latest page and status.
  useFocusEffect(
    useCallback(() => {
      void d.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on focus
    }, [bookId]),
  );

  const run = async (fn: () => Promise<string | null>, ok: string) => {
    const err = await fn();
    const text = err ?? ok;
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    if (!err) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  if (d.state.status === "loading") {
    return (
      <ScreenShell testID="details-scroll">
        <View style={styles.loading} testID="details-loading">
          <ActivityIndicator color={colors.mangoStrong} />
          <Text style={styles.muted}>Loading book…</Text>
        </View>
      </ScreenShell>
    );
  }
  if (d.state.status === "error") {
    return (
      <ScreenShell testID="details-scroll">
        <Notice message={d.state.message} actionLabel={d.state.notFound ? "Back" : "Try again"} onAction={() => (d.state.status === "error" && d.state.notFound ? router.back() : void d.reload())} />
      </ScreenShell>
    );
  }

  const { details, bookmarks, highlights, notes } = d.state;
  const { book, chapters } = details;
  const p = book.progress;
  const done = p.status === "completed";
  const primary = p.status === "not_started" ? "Start reading" : done && p.currentPage >= p.totalPages ? "Read again" : `Continue reading · page ${Math.max(1, p.currentPage)}`;
  const startPage = primary === "Read again" ? 1 : Math.max(1, p.currentPage);

  const confirmMarkRead = () =>
    Alert.alert(`Mark ${book.title} as read?`, "It will show as Completed and count toward your challenge and rewards. You can still open it and read again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Mark as read", onPress: () => void run(() => d.markRead(true), `${book.title} marked as read. 🎉`) },
    ]);
  const confirmReset = () =>
    Alert.alert("Reset reading progress?", "Your page, reading time and completed status for this book will be cleared. Bookmarks, highlights and notes are kept.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset progress", style: "destructive", onPress: () => void run(() => d.reset(), "Progress reset.") },
    ]);

  return (
    <ScreenShell testID="details-scroll" keyboardShouldPersistTaps="handled">
      <View style={styles.hero} testID="book-details">
        <BookCover title={book.title} author={book.author} cover={book.cover} width={128} />
        <View style={styles.heroInfo}>
          <Text style={styles.category}>
            {book.category.toUpperCase()}
            {book.year ? ` · ${book.year}` : ""}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {book.title}
          </Text>
          <Text style={styles.muted}>by {book.author}</Text>
          <StatusBadge status={p.status} />
        </View>
      </View>
      <ProgressMeter percent={p.percent} label={pagesLabel(book)} />
      <Text style={styles.meta}>
        {formatDuration(p.secondsRead)} read · Last read: {formatLastRead(p.lastReadAt)}
      </Text>
      {book.contentNote && <Notice tone="warning" message={book.contentNote} />}
      {message && <Notice tone="info" message={message} testID="details-message" />}

      <View style={styles.actions}>
        {book.readable ? (
          <Link href={{ pathname: "/read/[id]", params: { id: book.id, page: String(startPage) } }} asChild>
            <Pressable accessibilityRole="button" style={styles.primary} testID="start-reading">
              <Text style={styles.primaryText}>{primary}</Text>
            </Pressable>
          </Link>
        ) : (
          <View style={styles.pageForm}>
            <Text style={styles.label}>I&apos;m on page</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={pageInput}
              onChangeText={setPageInput}
              placeholder={String(p.currentPage || 1)}
              placeholderTextColor={colors.inkMuted}
              accessibilityLabel={`Current page, out of about ${p.totalPages}`}
              testID="page-input"
            />
            <Text style={styles.muted}>of ~{p.totalPages}</Text>
            <Button
              label="Update page"
              disabled={d.busy}
              onPress={() => {
                const n = Number(pageInput);
                if (!Number.isInteger(n) || n < 1 || n > p.totalPages) return setMessage(`Enter a page from 1 to ${p.totalPages}.`);
                setPageInput("");
                void run(() => d.setPage(n), `Saved: page ${n} of ~${p.totalPages}.`);
              }}
            />
          </View>
        )}
        {done ? (
          <Button label="Mark as unread" variant="outline" disabled={d.busy} onPress={() => void run(() => d.markRead(false), `${book.title} marked as unread.`)} />
        ) : (
          <Button label="Mark as read" variant="outline" disabled={d.busy} onPress={confirmMarkRead} testID="mark-read" />
        )}
        {(p.status !== "not_started" || p.secondsRead > 0) && <Button label="Reset progress" variant="danger" disabled={d.busy} onPress={confirmReset} testID="reset-progress" />}
      </View>
      {!book.readable && <Text style={styles.muted}>This book isn&apos;t available to read here. Borrow it from the library and track your page above.</Text>}

      <GlassSurface style={styles.card}>
        <Text style={styles.heading} accessibilityRole="header">About this book</Text>
        <Text style={styles.body}>{book.description}</Text>
      </GlassSurface>

      {chapters.length > 0 && (
        <GlassSurface style={styles.card}>
          <Text style={styles.heading} accessibilityRole="header">Chapters</Text>
          {chapters.slice(0, 60).map((c) => (
            <Link key={`${c.startPage}-${c.title}`} href={{ pathname: "/read/[id]", params: { id: book.id, page: String(c.startPage) } }} asChild>
              <Pressable accessibilityRole="link" style={styles.chapter}>
                <Text style={[styles.body, { flex: 1 }]}>{c.title}</Text>
                <Text style={styles.muted}>p. {c.startPage}</Text>
              </Pressable>
            </Link>
          ))}
        </GlassSurface>
      )}

      <Annotations
        bookId={book.id}
        readable={book.readable}
        bookmarks={bookmarks}
        highlights={highlights}
        notes={notes}
        busy={d.busy}
        onAddNote={(t) => run(() => d.addNote(t), "Note saved.")}
        onDeleteNote={(id) => run(() => d.deleteNote(id), "Note deleted.")}
        onDeleteBookmark={(id) => run(() => d.deleteBookmark(id), "Bookmark removed.")}
        onDeleteHighlight={(id) => run(() => d.deleteHighlight(id), "Highlight removed.")}
        onAddBookmark={!book.readable && p.currentPage > 0 ? () => run(() => d.addBookmark(p.currentPage), `Bookmarked page ${p.currentPage}.`) : undefined}
      />
    </ScreenShell>
  );
}

/** Bookmarks, highlights and notes (also used inside the reader's notes sheet). */
export function Annotations({
  bookId,
  readable,
  bookmarks,
  highlights,
  notes,
  busy,
  onAddNote,
  onDeleteNote,
  onDeleteBookmark,
  onDeleteHighlight,
  onAddBookmark,
  onJump,
}: {
  bookId: string;
  readable: boolean;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  notes: Note[];
  busy: boolean;
  onAddNote: (text: string) => unknown;
  onDeleteNote: (id: number) => unknown;
  onDeleteBookmark: (id: number) => unknown;
  onDeleteHighlight: (id: number) => unknown;
  onAddBookmark?: () => unknown;
  onJump?: (page: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const jump = (page: number, label: string) =>
    onJump ? (
      <Pressable accessibilityRole="link" onPress={() => onJump(page)}>
        <Text style={styles.link}>{label}</Text>
      </Pressable>
    ) : readable ? (
      <Link href={{ pathname: "/read/[id]", params: { id: bookId, page: String(page) } }} asChild>
        <Pressable accessibilityRole="link">
          <Text style={styles.link}>{label}</Text>
        </Pressable>
      </Link>
    ) : (
      <Text style={styles.body}>{label}</Text>
    );
  const del = (label: string, onPress: () => unknown) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={busy} hitSlop={8} style={styles.del}>
      <Text style={styles.muted}>✕</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.lg }} testID="annotations">
      <GlassSurface style={styles.card}>
        <Text style={styles.heading} accessibilityRole="header">
          Bookmarks · {bookmarks.length}
        </Text>
        {onAddBookmark && <Button label="Bookmark my page" variant="outline" onPress={() => void onAddBookmark()} disabled={busy} />}
        {bookmarks.length ? (
          bookmarks.map((b) => (
            <View key={b.id} style={styles.item} testID="bookmark-item">
              <View style={{ flex: 1 }}>{jump(b.page, b.label)}</View>
              {del(`Remove bookmark: ${b.label}`, () => onDeleteBookmark(b.id))}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No bookmarks yet.{readable ? " Use the bookmark button while reading." : ""}</Text>
        )}
      </GlassSurface>

      {readable && (
        <GlassSurface style={styles.card}>
          <Text style={styles.heading} accessibilityRole="header">
            Highlights · {highlights.length}
          </Text>
          {highlights.length ? (
            highlights.map((h) => (
              <View key={h.id} style={[styles.item, { borderLeftWidth: 5, borderLeftColor: HIGHLIGHT_EDGE[h.color], paddingLeft: spacing.sm }]} testID="highlight-item">
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.body, { fontStyle: "italic" }]}>“{h.excerpt}”</Text>
                  {h.note && <Text style={styles.muted}>Note: {h.note}</Text>}
                  {jump(h.page, `Page ${h.page}`)}
                </View>
                {del(`Remove highlight on page ${h.page}`, () => onDeleteHighlight(h.id))}
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No highlights yet. While reading, long-press a paragraph to highlight it.</Text>
          )}
        </GlassSurface>
      )}

      <GlassSurface style={styles.card}>
        <Text style={styles.heading} accessibilityRole="header">
          Notes · {notes.length}
        </Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          multiline
          maxLength={2000}
          placeholder="Write a note about this book…"
          placeholderTextColor={colors.inkMuted}
          value={text}
          onChangeText={setText}
          accessibilityLabel="New note"
          testID="note-input"
        />
        <Button
          label="Add note"
          disabled={busy || !text.trim()}
          onPress={async () => {
            await onAddNote(text);
            setText("");
          }}
          testID="add-note"
        />
        {notes.map((n) => (
          <View key={n.id} style={styles.item} testID="note-item">
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.body}>{n.text}</Text>
              {n.page ? jump(n.page, `Page ${n.page}`) : null}
            </View>
            {del("Delete note", () => onDeleteNote(n.id))}
          </View>
        ))}
      </GlassSurface>
    </View>
  );
}

export const HIGHLIGHT_EDGE = { yellow: "#E8B400", green: "#2F9E57", blue: "#3A7BD5", pink: "#D64F8F" } as const;

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    loading: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: spacing.xl },
    hero: { flexDirection: "row", gap: spacing.lg, alignItems: "flex-start" },
    heroInfo: { flex: 1, gap: 6 },
    category: { ...type.caption, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, color: c.mangoStrong },
    title: { ...type.display, fontSize: 28, lineHeight: 34, color: c.ink },
    heading: { ...type.heading, fontSize: 19, color: c.ink },
    body: { ...type.body, color: c.ink },
    muted: { ...type.body, fontSize: 15, color: c.inkMuted },
    meta: { ...type.caption, color: c.inkMuted },
    label: { ...type.label, color: c.ink },
    link: { ...type.body, color: c.mangoStrong, fontWeight: "600", textDecorationLine: "underline" },
    actions: { gap: spacing.sm },
    primary: { minHeight: touchTarget, borderRadius: radius.pill, backgroundColor: c.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
    primaryText: { ...type.label, fontSize: 16, color: c.onInk },
    pageForm: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
    input: { minHeight: touchTarget, minWidth: 80, borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.ink, paddingHorizontal: spacing.md, fontSize: 16 },
    noteInput: { minHeight: 72, paddingTop: spacing.sm, textAlignVertical: "top" },
    card: { padding: spacing.lg, gap: spacing.sm },
    chapter: { flexDirection: "row", gap: spacing.md, minHeight: 44, alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    item: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    del: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  });
