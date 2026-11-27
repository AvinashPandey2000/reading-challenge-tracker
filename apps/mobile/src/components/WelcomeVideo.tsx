import { StyleSheet, Text, View } from "react-native";
import { VideoView } from "expo-video";
import { formatTimestamp } from "@rct/shared";
import { useWelcomeVideo } from "../lib/useWelcomeVideo";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { GlassSurface } from "./GlassSurface";

/** Compact player: fixed 16:9 at the card width, capped so the lists stay the focus. */
export function WelcomeVideo() {
  const styles = useThemedStyles(makeStyles);
  const v = useWelcomeVideo();
  const resumeHint =
    v.progressLoad === "ready" && v.savedPosition > 0 && !v.hasStarted && v.saveState.kind === "idle"
      ? `Press Play to pick up at ${formatTimestamp(v.savedPosition)}.`
      : null;

  return (
    <GlassSurface style={styles.card} testID="welcome-video">
      <Text style={styles.heading} accessibilityRole="header">
        Welcome video
      </Text>
      <Text style={styles.sub}>A short clip to start the challenge. We remember where you pause.</Text>

      <View style={styles.frame}>
        <VideoView player={v.player} style={styles.video} nativeControls={false} contentFit="contain" accessibilityLabel="Welcome to the reading challenge video" />
      </View>

      <View style={styles.controls}>
        <Button
          label={v.playing ? "Pause" : "Play"}
          accessibilityLabel={v.playing ? "Pause welcome video" : "Play welcome video"}
          onPress={() => (v.playing ? v.pause() : void v.play())}
          disabled={v.problem === "load"}
          testID="play-toggle"
        />
        <Button label="−10 s" variant="outline" accessibilityLabel="Rewind 10 seconds" onPress={() => v.seekBy(-10)} disabled={!v.duration} />
        <Button label="+10 s" variant="outline" accessibilityLabel="Forward 10 seconds" onPress={() => v.seekBy(10)} disabled={!v.duration} />
        <Text style={styles.time} accessibilityLabel={`${formatTimestamp(v.current)} of ${formatTimestamp(v.duration)}`} testID="video-time">
          {formatTimestamp(v.current)} / {formatTimestamp(v.duration)}
        </Text>
      </View>

      <View style={styles.messages}>
        {v.problem === "load" && (
          <Notice message="The welcome video couldn't load. Check your connection and try again. Your reading lists still work." actionLabel="Reload" actionAccessibilityLabel="Reload the video" onAction={v.reload} />
        )}
        {v.problem === "playback" && (
          <Notice message="Playback stopped unexpectedly. Reload the video and press Play to continue from your saved place." actionLabel="Reload" actionAccessibilityLabel="Reload the video" onAction={v.reload} />
        )}
        {v.progressLoad === "error" && (
          <Notice tone="warning" message="Couldn't load where you stopped, so the video starts from the beginning." actionLabel="Try again" onAction={() => void v.reloadProgress()} />
        )}
        {v.saveState.kind === "error" && (
          <Notice
            message={`Couldn't save your place at ${formatTimestamp(v.saveState.position)}.`}
            actionLabel="Try again"
            actionAccessibilityLabel="Try saving your place again"
            onAction={v.retrySave}
            testID="video-save-error"
          />
        )}
        {v.saveState.kind === "saving" && <Notice tone="info" message="Saving your place…" />}
        {v.saveState.kind === "saved" && <Notice tone="info" message={`Saved your place at ${formatTimestamp(v.saveState.position)}.`} testID="video-saved" />}
        {resumeHint && <Notice tone="info" message={resumeHint} testID="resume-hint" />}
      </View>
      <Text style={styles.credit}>Clip from Big Buck Bunny © Blender Foundation, CC BY 3.0</Text>
    </GlassSurface>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heading: { ...type.heading, color: colors.ink },
  sub: { ...type.caption, color: colors.inkMuted },
  frame: { width: "100%", aspectRatio: 16 / 9, maxHeight: 200, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.videoBg },
  video: { flex: 1 },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  time: { ...type.caption, color: colors.inkMuted, fontVariant: ["tabular-nums"], marginLeft: "auto" },
  messages: { gap: spacing.xs },
  credit: { ...type.caption, fontSize: 11, color: colors.inkMuted },
});
