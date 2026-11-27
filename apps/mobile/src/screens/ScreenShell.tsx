import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundBubbles } from "../components/BackgroundBubbles";
import { spacing } from "../theme/spacing";

/** Common tab screen: bubble backdrop + safe area + scroll that clears the floating tab bar. */
export function ScreenShell({ children, testID, ...rest }: ScrollViewProps & { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <BackgroundBubbles />
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" testID={testID} {...rest}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
});
