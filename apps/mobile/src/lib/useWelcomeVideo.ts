/* eslint-disable react-hooks/immutability --
   expo-video's VideoPlayer is an imperative native object: seeking means assigning
   player.currentTime, which the React Compiler rule can't distinguish from mutating React state. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useEventListener } from "expo";
import { useVideoPlayer, type VideoPlayer } from "expo-video";
import { resumePosition } from "@rct/shared";
import { api } from "./api";
import { VIDEO_URL } from "./config";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving"; position: number }
  | { kind: "saved"; position: number }
  | { kind: "error"; position: number };

/**
 * Mirrors the web logic (apps/web/lib/useVideoProgress.ts):
 * the saved position is applied once, after BOTH the fetch resolved and the player reported
 * `readyToPlay`; pauses before that are ignored, so start-up never overwrites the saved time with 0.
 * No autoplay: the reader presses Play.
 */
/** Seconds between player time updates; the seek bar animates across each interval. */
export const TIME_UPDATE_INTERVAL = 0.25;

/**
 * `active` is false while the Video tab isn't on screen: playback pauses so audio doesn't keep
 * running behind another tab.
 */
export function useWelcomeVideo(source: string = VIDEO_URL, active = true) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = TIME_UPDATE_INTERVAL;
  });

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [problem, setProblem] = useState<null | "load" | "playback">(null);
  const [progressLoad, setProgressLoad] = useState<"loading" | "ready" | "error">("loading");
  const [savedPosition, setSavedPosition] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [hasStarted, setHasStarted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [loadingMedia, setLoadingMedia] = useState(player.status === "loading");
  const [wantsPlay, setWantsPlay] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);

  const savedRef = useRef<number | null>(null);
  const ready = useRef(false);
  const resumeApplied = useRef(false);
  const wasPlaying = useRef(false);
  const fetchPromise = useRef<Promise<void> | null>(null);
  const saveSeq = useRef(0);

  const applyResume = useCallback(
    (p: VideoPlayer = player) => {
      if (resumeApplied.current || !ready.current || savedRef.current === null) return;
      const target = resumePosition(savedRef.current, p.duration);
      if (target > 0) {
        p.currentTime = target;
        setCurrent(target);
      }
      resumeApplied.current = true;
    },
    [player],
  );

  // Initial state is already "loading"; retries flip it back first (see reloadProgress).
  const loadProgress = useCallback(() => {
    const promise = api
      .getVideoProgress()
      .then((p) => {
        savedRef.current = p.positionSeconds;
        setSavedPosition(p.positionSeconds);
        setProgressLoad("ready");
      })
      .catch(() => {
        savedRef.current = 0;
        setProgressLoad("error");
      })
      .finally(() => applyResume());
    fetchPromise.current = promise;
    return promise;
  }, [applyResume]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const markReady = useCallback(() => {
    ready.current = true;
    setDuration(player.duration || 0);
    setProblem(null);
    applyResume();
  }, [applyResume, player]);

  // The player may already be ready before listeners attach.
  useEffect(() => {
    // Syncs with an external system (the native player may already be ready).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (player.status === "readyToPlay") markReady();
  }, [markReady, player]);

  const save = useCallback(async (position: number) => {
    const seq = ++saveSeq.current;
    setSaveState({ kind: "saving", position });
    try {
      const result = await api.saveVideoProgress(position);
      savedRef.current = result.positionSeconds;
      setSavedPosition(result.positionSeconds);
      if (seq === saveSeq.current) setSaveState({ kind: "saved", position: result.positionSeconds });
    } catch {
      if (seq === saveSeq.current) setSaveState({ kind: "error", position });
    }
  }, []);

  useEventListener(player, "statusChange", ({ status }) => {
    setLoadingMedia(status === "loading");
    if (status === "readyToPlay") markReady();
    if (status === "error") {
      setProblem(hasStarted ? "playback" : "load");
      setPlaying(false);
      setWantsPlay(false);
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setPlaying(isPlaying);
    if (isPlaying) setEnded(false);
    else if (player.status !== "loading") setWantsPlay(false);
    if (!isPlaying && wasPlaying.current && resumeApplied.current) void save(player.currentTime);
    wasPlaying.current = isPlaying;
  });

  useEventListener(player, "timeUpdate", ({ currentTime, bufferedPosition }) => {
    setCurrent(currentTime);
    if (bufferedPosition > 0) setBuffered(bufferedPosition);
  });

  useEventListener(player, "playToEnd", () => {
    setEnded(true);
    setWantsPlay(false);
    setCurrent(player.duration || duration);
  });

  useEventListener(player, "mutedChange", ({ muted: m }) => setMuted(m));

  const play = useCallback(async () => {
    if (!resumeApplied.current && fetchPromise.current) await fetchPromise.current;
    if (player.status === "readyToPlay") ready.current = true;
    applyResume();
    // Play after the end starts over.
    const max = player.duration || duration;
    if (max > 0 && player.currentTime >= max - 0.3) {
      player.currentTime = 0;
      setCurrent(0);
    }
    setEnded(false);
    setWantsPlay(true);
    try {
      player.play();
      setHasStarted(true);
    } catch {
      setProblem("playback");
    }
  }, [applyResume, duration, player]);

  const pause = useCallback(() => {
    setWantsPlay(false);
    player.pause();
  }, [player]);

  const seekTo = useCallback(
    (time: number) => {
      const max = player.duration || duration;
      const next = Math.max(0, Math.min(max > 0 ? max - 0.25 : Infinity, time));
      player.currentTime = next;
      setCurrent(next);
      setEnded(false);
      // Seeking while paused is a deliberate new place: save it.
      if (!player.playing && resumeApplied.current) void save(next);
    },
    [duration, player, save],
  );

  const seekBy = useCallback((delta: number) => seekTo(player.currentTime + delta), [player, seekTo]);

  const toggleMute = useCallback(() => {
    const next = !player.muted;
    player.muted = next;
    setMuted(next);
  }, [player]);

  // Leaving the Video tab pauses (and so saves the place).
  useEffect(() => {
    if (!active && player.playing) player.pause();
  }, [active, player]);

  const reload = useCallback(() => {
    setProblem(null);
    setWantsPlay(false);
    ready.current = false;
    resumeApplied.current = false;
    player.replace(source);
    void loadProgress();
  }, [loadProgress, player, source]);

  const retrySave = useCallback(() => {
    if (saveState.kind === "error") void save(saveState.position);
  }, [save, saveState]);

  return {
    player,
    playing,
    current,
    duration,
    problem,
    progressLoad,
    savedPosition,
    saveState,
    hasStarted,
    buffered,
    /** Waiting for media while the reader asked to play. */
    buffering: wantsPlay && loadingMedia && problem === null,
    ended,
    muted,
    play,
    pause,
    seekTo,
    seekBy,
    toggleMute,
    reload,
    retrySave,
    reloadProgress: () => {
      setProgressLoad("loading");
      return loadProgress();
    },
  };
}
