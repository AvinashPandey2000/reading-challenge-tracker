import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { VideoView } from "expo-video";
import { formatTimestamp } from "@rct/shared";
import { BASE_URL } from "../lib/config";
import { TIME_UPDATE_INTERVAL, useWelcomeVideo } from "../lib/useWelcomeVideo";
import type { Colors } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/spacing";
import { type } from "../theme/typography";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { GlassSurface } from "./GlassSurface";
import { IconButton } from "./video/IconButton";
import { PlayerIcon } from "./video/PlayerIcon";
import { SeekBar } from "./video/SeekBar";

const POSTER = { uri: `${BASE_URL}/media/welcome-poster.jpg` };

/**
 * Compact player: fixed 16:9 at the card width, capped so the lists stay the focus.
 * Same controls as the web player: tap the video or Play, drag to seek, ±10 s, mute, full screen.
 */
export function WelcomeVideo({ active = true }: { active?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const v = useWelcomeVideo(undefined, active);
  const viewRef = useRef<VideoView>(null);
  const [firstFrame, setFirstFrame] = useState(false);
  // Inline we draw our own controls; in full screen the system controls (Done, scrubber) take over.
  const [fullscreen, setFullscreen] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const shownTime = scrubTime ?? v.current;
  const resumeHint =
    v.progressLoad === "ready" && v.savedPosition > 0 && !v.hasStarted && v.saveState.kind === "idle"
      ? `Press Play to pick up at ${formatTimestamp(v.savedPosition)}.`
      : null;
  const togglePlay = () => (v.playing ? v.pause() : void v.play());
  const canPlay = v.problem !== "load";

  return (
    <GlassSurface style={styles.card} testID="welcome-video">
      <Text style={styles.heading} accessibilityRole="header">
        Welcome video
      </Text>
      <Text style={styles.sub}>A short clip to start the challenge. We remember where you pause.</Text>

      <View style={styles.frame}>
        <VideoView
          ref={viewRef}
          player={v.player}
          style={styles.video}
          nativeControls={fullscreen}
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
          onFirstFrameRender={() => setFirstFrame(true)}
          onFullscreenEnter={() => setFullscreen(true)}
          onFullscreenExit={() => setFullscreen(false)}
          accessibilityLabel="Welcome to the reading challenge video"
        />
        {/* Poster until the first frame is on screen, so the card never shows an empty black box. */}
        {!firstFrame && <Image source={POSTER} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors testID="video-poster" />}
        {/* Tap anywhere on the video to play / pause. Hidden from screen readers: the Play button below does the same. */}
        <Pressable
          style={styles.overlay}
          onPress={canPlay ? togglePlay : undefined}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="video-tap-area"
        >
          {v.buffering ? (
            <ActivityIndicator size="large" color="#FFFFFF" testID="video-buffering" />
          ) : (
            !v.playing &&
            canPlay && (
              <View style={styles.bigPlay}>
                <PlayerIcon name={v.ended ? "replay" : "play"} size={30} color="#FFFFFF" />
              </View>
            )
          )}
        </Pressable>
      </View>

      <View style={styles.seekRow}>
        <SeekBar
          current={v.current}
          duration={v.duration}
          buffered={v.buffered}
          playing={v.playing}
          updateInterval={TIME_UPDATE_INTERVAL}
          disabled={!v.duration}
          onScrub={setScrubTime}
          onSeek={v.seekTo}
        />
        <Text style={styles.time} accessibilityLabel={`${formatTimestamp(shownTime)} of ${formatTimestamp(v.duration)}`} testID="video-time">
          {formatTimestamp(shownTime)} / {formatTimestamp(v.duration)}
        </Text>
      </View>

      <View style={styles.controls}>
        <Button
          label={v.playing ? "Pause" : v.ended ? "Replay" : "Play"}
          accessibilityLabel={v.playing ? "Pause welcome video" : "Play welcome video"}
          onPress={togglePlay}
          disabled={!canPlay}
          style={styles.playButton}
          testID="play-toggle"
        />
        <IconButton icon="rewind10" accessibilityLabel="Rewind 10 seconds" onPress={() => v.seekBy(-10)} disabled={!v.duration} />
        <IconButton icon="forward10" accessibilityLabel="Forward 10 seconds" onPress={() => v.seekBy(10)} disabled={!v.duration} />
        <View style={styles.spacer} />
        <IconButton icon={v.muted ? "muted" : "volume"} accessibilityLabel="Mute" selected={v.muted} onPress={v.toggleMute} testID="mute-toggle" />
        <IconButton
          icon="fullscreen"
          accessibilityLabel="Full screen"
          onPress={() => {
            // Turn the system controls on first, then present, so full screen opens with Done / scrubber.
            setFullscreen(true);
            setTimeout(() => void viewRef.current?.enterFullscreen(), 60);
          }}
          disabled={!v.duration}
          testID="fullscreen"
        />
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
    frame: { width: "100%", aspectRatio: 16 / 9, maxHeight: 220, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.videoBg },
    video: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    bigPlay: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(17, 17, 17, 0.55)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.35)",
    },
    seekRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    time: { ...type.caption, color: colors.inkMuted, fontVariant: ["tabular-nums"], minWidth: 76, textAlign: "right" },
    controls: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    playButton: { minWidth: 104, marginRight: spacing.xs },
    spacer: { flex: 1 },
    messages: { gap: spacing.xs },
    credit: { ...type.caption, fontSize: 11, color: colors.inkMuted },
  });
