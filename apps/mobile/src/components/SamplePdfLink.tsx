import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { SAMPLE_PDF_URL } from "../lib/config";
import { GlassSurface } from "./GlassSurface";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget } from "../theme/spacing";
import { type } from "../theme/typography";

export function SamplePdfLink() {
  const styles = useThemedStyles(makeStyles);
  return (
    <GlassSurface style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        Free sample to read
      </Text>
      <Text style={styles.text}>
        Start The Secret Garden with its first chapter. It&apos;s the only book in the challenge with a downloadable sample.
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Download sample PDF: The Secret Garden, Chapter One. PDF, 6 pages, 12 kilobytes"
        onPress={() => void Linking.openURL(SAMPLE_PDF_URL)}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.linkText}>↓ Download sample PDF</Text>
        <Text style={styles.meta}>The Secret Garden — Chapter I · PDF · 6 pages · 12 KB</Text>
      </Pressable>
    </GlassSurface>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
  heading: { ...type.heading, color: colors.ink },
  text: { ...type.caption, color: colors.inkMuted },
  link: {
    minHeight: touchTarget,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  linkText: { ...type.label, color: colors.ink },
  meta: { ...type.caption, color: colors.inkMuted },
});
