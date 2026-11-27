import { StyleSheet, Text, View } from "react-native";
import { formatCount, type ReadingList, type SaveError } from "@rct/shared";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { BookRow } from "./BookRow";
import { ProgressBar } from "./ProgressBar";
import { GlassSurface } from "./GlassSurface";

interface Props {
  list: ReadingList;
  pending: Record<string, boolean>;
  errors: Record<string, SaveError>;
  onToggle: (bookId: string, read: boolean) => void;
}

export function ListCard({ list, pending, errors, onToggle }: Props) {
  const styles = useThemedStyles(makeStyles);
  const complete = list.total > 0 && list.readCount === list.total;
  return (
    <GlassSurface style={styles.card} testID={`list-${list.id}`}>
      <View style={styles.header} accessible accessibilityRole="header" accessibilityLabel={`${list.title}, ${formatCount(list.readCount, list.total)}`}>
        <Text style={styles.title}>{list.title}</Text>
        <Text style={styles.count} testID={`count-${list.id}`}>
          <Text style={styles.countNumber}>{list.readCount}</Text> of {list.total} read
          {complete ? <Text style={styles.complete}> · Complete</Text> : null}
        </Text>
      </View>
      <View style={styles.bar}>
        <ProgressBar value={list.readCount} max={list.total} />
      </View>
      {list.books.map((book) => (
        <BookRow key={book.id} book={book} saving={book.id in pending} error={errors[book.id]} onToggle={(read) => onToggle(book.id, read)} />
      ))}
    </GlassSurface>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" },
  title: { ...type.heading, color: colors.ink },
  count: { ...type.body, fontWeight: "600", color: colors.ink },
  countNumber: { fontSize: 24, fontWeight: "700", color: colors.mangoStrong },
  complete: { color: colors.green },
  bar: { marginTop: spacing.md, marginBottom: spacing.sm },
});
