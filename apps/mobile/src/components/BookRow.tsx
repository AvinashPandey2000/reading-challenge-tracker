import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Book, SaveError } from "@rct/shared";
import { colors } from "../theme/colors";
import { spacing, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";
import { Checkmark } from "./Checkmark";
import { Notice } from "./Notice";
import { StatusPill } from "./StatusPill";

interface Props {
  book: Book;
  saving: boolean;
  error?: SaveError;
  onToggle: (read: boolean) => void;
}

export function BookRow({ book, saving, error, onToggle }: Props) {
  const status = saving ? "saving" : book.read ? "read" : "unread";
  return (
    <View style={styles.row} testID={`book-${book.id}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${book.title} by ${book.author}`}
        accessibilityHint={saving ? "Saving" : book.read ? "Marks this book as unread" : "Marks this book as read"}
        accessibilityState={{ checked: book.read, busy: saving }}
        onPress={() => {
          if (!saving) onToggle(!book.read);
        }}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        testID={`toggle-${book.id}`}
      >
        <Checkmark checked={book.read} />
        <View style={styles.text}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
        </View>
        <StatusPill status={status} />
      </Pressable>
      {error && !saving && (
        <Notice
          message={error.message}
          actionLabel="Retry"
          actionAccessibilityLabel={`Retry saving ${book.title}`}
          onAction={() => onToggle(error.target)}
          testID={`error-${book.id}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: spacing.xs },
  main: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: touchTarget + 12, paddingVertical: spacing.sm },
  pressed: { opacity: 0.7 },
  text: { flex: 1 },
  title: { ...type.title, color: colors.ink },
  author: { ...type.caption, color: colors.inkMuted },
});
