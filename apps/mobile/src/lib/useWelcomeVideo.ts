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
export function useWelcomeVideo(source: string = VIDEO_URL) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [problem, setProblem] = useState<null | "load" | "playback">(null);
  const [progressLoad, setProgressLoad] = useState<"loading" | "ready" | "error">("loading");
  const [savedPosition, setSavedPosition] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [hasStarted, setHasStarted] = useState(false);

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

  const loadProgress = useCallback(() => {
    setProgressLoad("loading");
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
    if (status === "readyToPlay") markReady();
    if (status === "error") {
      setProblem(hasStarted ? "playback" : "load");
      setPlaying(false);
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setPlaying(isPlaying);
    if (!isPlaying && wasPlaying.current && resumeApplied.current) void save(player.currentTime);
    wasPlaying.current = isPlaying;
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => setCurrent(currentTime));

  const play = useCallback(async () => {
    if (!resumeApplied.current && fetchPromise.current) await fetchPromise.current;
    if (player.status === "readyToPlay") ready.current = true;
    applyResume();
    try {
      player.play();
      setHasStarted(true);
    } catch {
      setProblem("playback");
    }
  }, [applyResume, player]);

  const pause = useCallback(() => player.pause(), [player]);

  const seekBy = useCallback(
    (delta: number) => {
      const max = player.duration || duration;
      const next = Math.max(0, Math.min(max > 0 ? max - 0.25 : Infinity, player.currentTime + delta));
      player.currentTime = next;
      setCurrent(next);
      // Seeking while paused is a deliberate new place: save it.
      if (!player.playing && resumeApplied.current) void save(next);
    },
    [duration, player, save],
  );

  const reload = useCallback(() => {
    setProblem(null);
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
    play,
    pause,
    seekBy,
    reload,
    retrySave,
    reloadProgress: loadProgress,
  };
}
