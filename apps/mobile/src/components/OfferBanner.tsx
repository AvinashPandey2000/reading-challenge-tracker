import { StyleSheet, Text, View } from "react-native";
import { DEMO_OFFER_NOTE, offerMessage, offerState } from "@rct/shared";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { GlassSurface } from "./GlassSurface";

export function OfferBanner({ compact = false }: { compact?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const message = offerMessage(offerState());
  return (
    <GlassSurface style={styles.card} testID="offer-banner">
      <View style={styles.row} accessible accessibilityLabel={`${message.headline} ${message.detail}. ${DEMO_OFFER_NOTE}`}>
        <View style={styles.badge}>
          <Text style={styles.star}>★</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.headline}>{message.headline}</Text>
          <Text style={styles.detail}>
            <Text style={styles.days}>{message.detail}</Text>
            {compact ? "" : " · Rewards unlock as you finish each list."}
          </Text>
          {!compact && <Text style={styles.note}>{DEMO_OFFER_NOTE}</Text>}
        </View>
      </View>
    </GlassSurface>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: { padding: spacing.md },
    row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
    badge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.mango,
      alignItems: "center",
      justifyContent: "center",
    },
    star: { fontSize: 20, color: "#1D1B16" },
    text: { flex: 1, gap: 2 },
    headline: { ...type.title, color: colors.ink },
    detail: { ...type.caption, color: colors.ink },
    days: { fontWeight: "700", color: colors.mangoStrong },
    note: { ...type.caption, fontSize: 12, color: colors.inkMuted },
  });
