import { StyleSheet, Text } from "react-native";
import { WelcomeVideo } from "../components/WelcomeVideo";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { type } from "../theme/typography";
import { ScreenShell } from "./ScreenShell";

/** `active` is false while another tab is showing (see app/(tabs)/video.tsx). */
export function VideoScreen({ active = true }: { active?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScreenShell testID="video-scroll">
      <Text style={styles.title} accessibilityRole="header">
        Welcome
      </Text>
      <WelcomeVideo active={active} />
    </ScreenShell>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({ title: { ...type.display, color: colors.ink } });
