"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resumePosition } from "@rct/shared";
import { api } from "./api";

export type ProgressLoad = "loading" | "ready" | "error";
export type SaveState = { kind: "idle" } | { kind: "saving"; position: number } | { kind: "saved"; position: number } | { kind: "error"; position: number };

/**
 * Coordinates the saved playback position with the <video> element.
 *
 * - The saved position is fetched once, independently of the reading lists.
 * - It is applied exactly once, only after BOTH the fetch resolved and the media
 *   reported `loadedmetadata`. Until then, pause/seek events are ignored so player
 *   initialisation can never overwrite a saved timestamp with 0.
 * - On every reader-initiated pause (and a seek while paused) the actual
 *   `currentTime` is saved, so seeking backward then pausing stores the earlier time.
 */
export function useVideoProgress(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [progressLoad, setProgressLoad] = useState<ProgressLoad>("loading");
  const [savedPosition, setSavedPosition] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  const savedRef = useRef<number | null>(null); // null until fetch settles
  const metadataReady = useRef(false);
  const resumeApplied = useRef(false);
  const programmaticSeek = useRef(false);
  const fetchPromise = useRef<Promise<void> | null>(null);
  const saveSeq = useRef(0);

  const applyResume = useCallback(() => {
    const video = videoRef.current;
    if (!video || resumeApplied.current || !metadataReady.current || savedRef.current === null) return;
    const target = resumePosition(savedRef.current, video.duration);
    if (target > 0 && Math.abs(video.currentTime - target) > 0.25) {
      programmaticSeek.current = true;
      video.currentTime = target;
    }
    resumeApplied.current = true;
  }, [videoRef]);

  // Initial state is already "loading"; retries flip it back first (see reloadProgress).
  const loadProgress = useCallback(() => {
    const p = api
      .getVideoProgress()
      .then((progress) => {
        savedRef.current = progress.positionSeconds;
        setSavedPosition(progress.positionSeconds);
        setProgressLoad("ready");
      })
      .catch(() => {
        // Start from the beginning, but still allow saving new pauses.
        savedRef.current = 0;
        setProgressLoad("error");
      })
      .finally(applyResume);
    fetchPromise.current = p;
    return p;
  }, [applyResume]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const save = useCallback(async (position: number, opts?: { keepalive?: boolean }) => {
    const seq = ++saveSeq.current;
    setSaveState({ kind: "saving", position });
    try {
      const result = await api.saveVideoProgress(position, opts);
      savedRef.current = result.positionSeconds;
      setSavedPosition(result.positionSeconds);
      if (seq === saveSeq.current) setSaveState({ kind: "saved", position: result.positionSeconds });
    } catch {
      if (seq === saveSeq.current) setSaveState({ kind: "error", position });
    }
  }, []);

  /** Call before the first play: waits for the saved position and seeks to it. */
  const prepareForPlay = useCallback(async () => {
    if (!resumeApplied.current && fetchPromise.current) await fetchPromise.current;
    const video = videoRef.current;
    if (video && !metadataReady.current && video.readyState >= 1) metadataReady.current = true;
    applyResume();
  }, [applyResume, videoRef]);

  const onLoadedMetadata = useCallback(() => {
    metadataReady.current = true;
    applyResume();
  }, [applyResume]);

  const onPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || !resumeApplied.current) return; // initialisation, not a reader pause
    void save(video.currentTime);
  }, [save, videoRef]);

  const onSeeked = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (programmaticSeek.current) {
      programmaticSeek.current = false;
      return;
    }
    if (resumeApplied.current && video.paused) void save(video.currentTime);
  }, [save, videoRef]);

  // If the reader leaves mid-playback, keep their place.
  useEffect(() => {
    const onHide = () => {
      const video = videoRef.current;
      if (video && !video.paused && resumeApplied.current) void save(video.currentTime, { keepalive: true });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [save, videoRef]);

  const retrySave = useCallback(() => {
    if (saveState.kind === "error") void save(saveState.position);
  }, [save, saveState]);

  return {
    progressLoad,
    savedPosition,
    saveState,
    prepareForPlay,
    onLoadedMetadata,
    onPause,
    onSeeked,
    retrySave,
    reloadProgress: () => {
      setProgressLoad("loading");
      return loadProgress();
    },
  };
}
