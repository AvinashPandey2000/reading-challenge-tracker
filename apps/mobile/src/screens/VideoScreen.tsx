import { StyleSheet, Text } from "react-native";
import { WelcomeVideo } from "../components/WelcomeVideo";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { type } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

export function VideoScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScreenShell testID="video-scroll">
      <Text style={styles.title} accessibilityRole="header">
        Welcome
      </Text>
      <WelcomeVideo />
    </ScreenShell>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({ title: { ...type.display, color: colors.ink } });
