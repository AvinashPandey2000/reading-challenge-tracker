import { StyleSheet, Text, View } from "react-native";
import { formatCount, type ReadingList, type SaveError } from "@rct/shared";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { BookRow } from "./BookRow";
import { ProgressBar } from "./ProgressBar";

interface Props {
  list: ReadingList;
  pending: Record<string, boolean>;
  errors: Record<string, SaveError>;
  onToggle: (bookId: string, read: boolean) => void;
}

export function ListCard({ list, pending, errors, onToggle }: Props) {
  const complete = list.total > 0 && list.readCount === list.total;
  return (
    <View style={styles.card} testID={`list-${list.id}`}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
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
