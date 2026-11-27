import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { formatTimestamp } from "@rct/shared";
import type { Colors } from "../../theme/colors";
import { useThemedStyles } from "../../theme/ThemeProvider";

interface Props {
  current: number;
  duration: number;
  buffered: number;
  playing: boolean;
  /** How often `current` updates while playing; the fill glides across each interval. */
  updateInterval: number;
  disabled?: boolean;
  /** Live position while the finger moves (for the time label). */
  onScrub?: (time: number | null) => void;
  onSeek: (time: number) => void;
}

const TRACK_HEIGHT = 6;
const THUMB = 18;
const ACCESSIBILITY_STEP = 10;

/**
 * Drag-or-tap seek bar: played (mango) · buffered (muted) · rest (sunk).
 * Between player time updates the fill animates linearly, so it moves smoothly instead of in steps.
 */
export function SeekBar({ current, duration, buffered, playing, updateInterval, disabled, onScrub, onSeek }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [position] = useState(() => new Animated.Value(0));
  const scrubRef = useRef({ startX: 0, time: 0 });
  const latest = useRef({ width, duration, disabled, onSeek, onScrub });
  useEffect(() => {
    latest.current = { width, duration, disabled, onSeek, onScrub };
  });

  useEffect(() => {
    if (scrubbing) return;
    const target = duration > 0 ? Math.min(current, duration) : 0;
    if (playing) {
      Animated.timing(position, { toValue: target, duration: updateInterval * 1000, easing: Easing.linear, useNativeDriver: false }).start();
    } else {
      position.stopAnimation();
      position.setValue(target);
    }
  }, [current, duration, playing, position, scrubbing, updateInterval]);

  const responder = useMemo(() => {
    const timeAt = (x: number) => {
      const { width: w, duration: d } = latest.current;
      return w > 0 && d > 0 ? Math.max(0, Math.min(d, (x / w) * d)) : 0;
    };
    const move = (time: number) => {
      scrubRef.current.time = time;
      position.stopAnimation();
      position.setValue(time);
      latest.current.onScrub?.(time);
    };
    // The callbacks read refs only while a gesture runs, never during render.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      // Keep the gesture even when the finger drifts vertically (the screen is a ScrollView).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        scrubRef.current.startX = e.nativeEvent.locationX;
        setScrubbing(true);
        move(timeAt(e.nativeEvent.locationX));
      },
      onPanResponderMove: (_e, g) => move(timeAt(scrubRef.current.startX + g.dx)),
      onPanResponderRelease: () => {
        latest.current.onSeek(scrubRef.current.time);
        latest.current.onScrub?.(null);
        setScrubbing(false);
      },
      onPanResponderTerminate: () => {
        latest.current.onScrub?.(null);
        setScrubbing(false);
      },
    });
  }, [position]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const span = duration > 0 ? duration : 1;
  const playedWidth = position.interpolate({ inputRange: [0, span], outputRange: [0, width], extrapolate: "clamp" });
  const thumbX = position.interpolate({ inputRange: [0, span], outputRange: [-THUMB / 2, width - THUMB / 2], extrapolate: "clamp" });
  const bufferedWidth = duration > 0 ? (Math.min(Math.max(buffered, current), duration) / duration) * width : 0;

  return (
    <View
      style={[styles.hit, disabled && styles.disabled]}
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Seek"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(current), text: `${formatTimestamp(current)} of ${formatTimestamp(duration)}` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        const delta = e.nativeEvent.actionName === "increment" ? ACCESSIBILITY_STEP : -ACCESSIBILITY_STEP;
        onSeek(Math.max(0, Math.min(duration, current + delta)));
      }}
      testID="seek-bar"
      {...responder.panHandlers}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.buffered, { width: bufferedWidth }]} />
        <Animated.View style={[styles.played, { width: playedWidth }]} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.thumb, scrubbing && styles.thumbActive, { transform: [{ translateX: thumbX }, { scale: scrubbing ? 1.25 : 1 }] }]} />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    hit: { flex: 1, height: 44, justifyContent: "center" },
    disabled: { opacity: 0.5 },
    track: { height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: colors.surfaceSunk, overflow: "hidden" },
    buffered: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.inkMuted, opacity: 0.35 },
    played: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.mangoBar },
    thumb: {
      position: "absolute",
      left: 0,
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: colors.mangoBar,
      borderWidth: 2,
      borderColor: colors.surface,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    thumbActive: { shadowOpacity: 0.45 },
  });
