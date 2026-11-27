import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { pagesLabel, type LibraryBook } from "@rct/shared";
import type { Colors } from "../../theme/colors";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/spacing";
import { type } from "../../theme/typography";
import { GlassSurface } from "../GlassSurface";
import { BookCover } from "./BookCover";
import { ProgressMeter, StatusBadge } from "./bits";

export function BookCard({ book }: { book: LibraryBook }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Link href={{ pathname: "/book/[id]", params: { id: book.id } }} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${book.title} by ${book.author}. ${book.progress.status === "completed" ? "Completed" : `${book.progress.percent}%`}`} testID={`library-book-${book.id}`}>
        {({ pressed }) => (
          <GlassSurface style={[styles.card, pressed && styles.pressed]}>
            <BookCover title={book.title} author={book.author} cover={book.cover} width={84} />
            <View style={styles.body}>
              <Text style={styles.category}>
                {book.category.toUpperCase()}
                {book.year ? ` · ${book.year}` : ""}
              </Text>
              <Text style={styles.title}>{book.title}</Text>
              <Text style={styles.author}>{book.author}</Text>
              <Text style={styles.summary} numberOfLines={2}>
                {book.summary}
              </Text>
              <StatusBadge status={book.progress.status} />
              <ProgressMeter percent={book.progress.percent} label={pagesLabel(book)} />
            </View>
          </GlassSurface>
        )}
      </Pressable>
    </Link>
  );
}

export function BookTile({ book, caption, href }: { book: LibraryBook; caption: string; href: Parameters<typeof Link>[0]["href"] }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${book.title}. ${caption}`} style={styles.tile}>
        <BookCover title={book.title} author={book.author} cover={book.cover} width={104} />
        <Text style={styles.tileTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.tileCaption}>{caption}</Text>
        <View style={styles.tileBar}>
          <View style={[styles.tileFill, { width: `${book.progress.percent}%` }]} />
        </View>
      </Pressable>
    </Link>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { flexDirection: "row", gap: spacing.md, padding: spacing.md },
    pressed: { opacity: 0.85 },
    body: { flex: 1, gap: 4 },
    category: { ...type.caption, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, color: c.mangoStrong },
    title: { ...type.title, fontSize: 17, color: c.ink },
    author: { ...type.caption, color: c.inkMuted },
    summary: { ...type.caption, color: c.ink },
    tile: { width: 112, gap: 4 },
    tileTitle: { ...type.caption, fontWeight: "700", color: c.ink },
    tileCaption: { ...type.caption, fontSize: 12, color: c.inkMuted },
    tileBar: { height: 4, borderRadius: 2, backgroundColor: c.surfaceSunk, overflow: "hidden" },
    tileFill: { height: "100%", backgroundColor: c.mangoBar },
  });
