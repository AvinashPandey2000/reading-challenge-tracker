"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimestamp } from "@rct/shared";
import { VIDEO } from "@/lib/site";
import { useVideoProgress } from "@/lib/useVideoProgress";
import styles from "./WelcomeVideo.module.css";

type MediaProblem = null | "load" | "playback";
const SKIP_SECONDS = 10;
const ARROW_SECONDS = 5;

/** iOS Safari on iPhone has no element fullscreen, only the native video player. */
type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean };

/** End of the buffered range that contains `time` (what the seek bar shows as "loaded"). */
function bufferedEnd(video: HTMLVideoElement) {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime + 0.5 && buffered.end(i) >= currentTime) return buffered.end(i);
  }
  return buffered.length ? buffered.end(buffered.length - 1) : 0;
}

export function WelcomeVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const progress = useVideoProgress(videoRef);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [problem, setProblem] = useState<MediaProblem>(null);
  const [starting, setStarting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const dragging = useRef(false);

  const handleMetadata = useCallback(
    (video: HTMLVideoElement) => {
      setDuration(video.duration);
      setProblem((p) => (p === "load" ? null : p));
      progress.onLoadedMetadata();
    },
    [progress],
  );

  // Media events can fire before React hydrates and attaches listeners (the page is static HTML
  // and the browser starts fetching metadata immediately). Catch up with the element's state once.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.duration > 0) handleMetadata(video);
    else if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) setProblem("load");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after hydration
  }, []);

  // `timeupdate` only fires ~4 times a second, which makes the seek bar step. While playing,
  // follow the playhead every frame instead so it glides.
  useEffect(() => {
    if (!playing) return;
    let frame = requestAnimationFrame(function tick() {
      const video = videoRef.current;
      if (video && !dragging.current) setCurrent(video.currentTime);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video || starting) return;
    setStarting(true);
    try {
      await progress.prepareForPlay();
      await video.play();
      setHasStarted(true);
      setProblem(null);
    } catch (err) {
      // AbortError happens when a pause interrupts play(); not a failure.
      if (!(err instanceof DOMException && err.name === "AbortError")) setProblem("playback");
    } finally {
      setStarting(false);
    }
  }, [progress, starting]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || problem === "load") return;
    if (video.paused) void play();
    else video.pause();
  }, [play, problem]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const next = Math.max(0, Math.min(video.duration, time));
    video.currentTime = next;
    setCurrent(next);
    if (next < video.duration) setEnded(false);
  }, []);

  const skip = useCallback((delta: number) => seekTo((videoRef.current?.currentTime ?? 0) + delta), [seekTo]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const toggleCaptions = useCallback(() => {
    const track = videoRef.current?.textTracks[0];
    if (!track) return;
    track.mode = track.mode === "showing" ? "hidden" : "showing";
    setCaptions(track.mode === "showing");
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const player = playerRef.current;
    const video = videoRef.current as WebkitVideo | null;
    if (!player || !video) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (player.requestFullscreen) await player.requestFullscreen();
      else video.webkitEnterFullscreen?.();
    } catch {
      video.webkitEnterFullscreen?.();
    }
  }, []);

  const onSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => seekTo(Number(e.target.value));
  const startDrag = () => {
    dragging.current = true;
  };
  const endDrag = () => {
    dragging.current = false;
  };

  /** YouTube-style shortcuts while focus is inside the player (not while typing in the seek bar). */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const onControl = (e.target as HTMLElement).closest("button, input");
    const key = e.key.toLowerCase();
    if ((key === " " && !onControl) || key === "k") togglePlay();
    else if (key === "arrowleft" && !onControl) skip(-ARROW_SECONDS);
    else if (key === "arrowright" && !onControl) skip(ARROW_SECONDS);
    else if (key === "j") skip(-SKIP_SECONDS);
    else if (key === "l") skip(SKIP_SECONDS);
    else if (key === "m") toggleMute();
    else if (key === "c") toggleCaptions();
    else if (key === "f") void toggleFullscreen();
    else return;
    e.preventDefault();
  };

  const keyHandler = useRef(onKeyDown);
  useEffect(() => {
    keyHandler.current = onKeyDown;
  });
  useEffect(() => {
    const player = playerRef.current;
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    player?.addEventListener("keydown", listener);
    return () => player?.removeEventListener("keydown", listener);
  }, []);

  const reloadVideo = () => {
    const video = videoRef.current;
    setProblem(null);
    setWaiting(false);
    video?.load();
  };

  const onError = () => {
    // Before metadata = the file couldn't be loaded; after = playback broke part-way.
    setProblem(duration > 0 || hasStarted ? "playback" : "load");
    setPlaying(false);
    setWaiting(false);
  };

  const resumeHint =
    progress.progressLoad === "ready" && progress.savedPosition > 0 && !hasStarted
      ? `Press Play to pick up at ${formatTimestamp(progress.savedPosition)}.`
      : null;

  const { saveState } = progress;
  const shown = Math.min(current, duration || 0);
  const pct = (n: number) => (duration > 0 ? `${Math.min(100, (n / duration) * 100)}%` : "0%");
  const busy = (starting || waiting) && problem === null;

  return (
    <section className={`glass ${styles.card}`} aria-labelledby="video-heading" data-testid="welcome-video" data-tour="video">
      <div className={styles.headerRow}>
        <h2 id="video-heading" className={styles.heading}>
          Welcome video
        </h2>
        <p className={styles.sub}>A short clip to start the challenge. We remember where you pause.</p>
      </div>

      <div
        ref={playerRef}
        className={styles.player}
        data-playing={playing || undefined}
        data-fullscreen={fullscreen || undefined}
        role="group"
        aria-label="Video player. Shortcuts: K play or pause, J and L skip 10 seconds, M mute, C captions, F full screen."
      >
        <div className={styles.frame}>
          <video
            ref={videoRef}
            className={styles.video}
            preload="metadata"
            playsInline
            poster={VIDEO.poster}
            aria-label={VIDEO.title}
            data-testid="video-element"
            onClick={togglePlay}
            onDoubleClick={() => void toggleFullscreen()}
            onLoadedMetadata={(e) => handleMetadata(e.currentTarget)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => {
              if (!dragging.current) setCurrent(e.currentTarget.currentTime);
            }}
            onProgress={(e) => setBuffered(bufferedEnd(e.currentTarget))}
            onWaiting={() => setWaiting(true)}
            onPlaying={() => setWaiting(false)}
            onCanPlay={() => setWaiting(false)}
            onPlay={() => {
              setPlaying(true);
              setEnded(false);
            }}
            onPause={() => {
              setPlaying(false);
              setWaiting(false);
              progress.onPause();
            }}
            onEnded={() => setEnded(true)}
            onSeeked={(e) => {
              setCurrent(e.currentTarget.currentTime);
              setBuffered(bufferedEnd(e.currentTarget));
              progress.onSeeked();
            }}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onError={onError}
          >
            {VIDEO.sources.map((s) => (
              <source key={s.src} src={s.src} type={s.type} onError={s === VIDEO.sources.at(-1) ? onError : undefined} />
            ))}
            <track kind="captions" src="/media/welcome.en.vtt" srcLang="en" label="English" />
          </video>

          {/* Visual cue only: the video itself is the click target, the Play button below is the control. */}
          {!playing && !busy && problem !== "load" && (
            <span className={styles.bigPlay} aria-hidden="true">
              {ended ? (
                <svg viewBox="0 0 24 24" focusable="false"><path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2v3z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" focusable="false"><path d="M8 5.3v13.4a1 1 0 0 0 1.5.9l10.6-6.7a1 1 0 0 0 0-1.8L9.5 4.4A1 1 0 0 0 8 5.3z" /></svg>
              )}
            </span>
          )}
          {busy && <span className={styles.spinner} role="status" aria-label="Loading video" data-testid="video-buffering" />}
        </div>

        <div className={styles.controls}>
          <div className={styles.seekRow}>
            <label className={styles.seekLabel}>
              <span className={styles.srOnly}>Seek</span>
              <input
                type="range"
                className={styles.seek}
                style={{ "--played": pct(shown), "--buffered": pct(Math.max(buffered, shown)) } as React.CSSProperties}
                min={0}
                max={duration || 0}
                step="any"
                value={shown}
                onChange={onSeekInput}
                onPointerDown={startDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onBlur={endDrag}
                disabled={!duration}
                aria-valuetext={`${formatTimestamp(current)} of ${formatTimestamp(duration)}`}
                data-testid="seek"
              />
            </label>
            <span className={styles.time} aria-hidden="true" data-testid="video-time">
              {formatTimestamp(current)} / {formatTimestamp(duration)}
            </span>
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.playButton}
              onClick={togglePlay}
              aria-label={playing ? "Pause welcome video" : "Play welcome video"}
              disabled={problem === "load"}
              data-testid="play-toggle"
            >
              <span aria-hidden="true" className={styles.icon}>
                {playing ? (
                  <svg viewBox="0 0 20 20" focusable="false"><rect x="5" y="4" width="3.5" height="12" rx="1" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 20 20" focusable="false"><path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L7.2 3.5A.8.8 0 0 0 6 4.2z" /></svg>
                )}
              </span>
              <span className={styles.playText}>{playing ? "Pause" : starting ? "Starting…" : ended ? "Replay" : "Play"}</span>
            </button>
            <button type="button" className={styles.iconButton} onClick={() => skip(-SKIP_SECONDS)} disabled={!duration} aria-label="Rewind 10 seconds" title="Rewind 10 s (J)">
              <svg className={styles.filled} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" /><text x="12" y="16.2" textAnchor="middle">10</text></svg>
            </button>
            <button type="button" className={styles.iconButton} onClick={() => skip(SKIP_SECONDS)} disabled={!duration} aria-label="Forward 10 seconds" title="Forward 10 s (L)">
              <svg className={styles.filled} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" /><text x="12" y="16.2" textAnchor="middle">10</text></svg>
            </button>
            <span className={styles.spacer} />
            <button type="button" className={styles.iconButton} onClick={toggleMute} aria-pressed={muted} aria-label="Mute" title="Mute (M)">
              {muted ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5m0-5-5 5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /></svg>
              )}
            </button>
            <button type="button" className={styles.iconButton} onClick={toggleCaptions} aria-pressed={captions} aria-label="Captions" title="Captions (C)">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M10.5 10.5a2 2 0 1 0 0 3M16.5 10.5a2 2 0 1 0 0 3" /></svg>
            </button>
            <button type="button" className={styles.iconButton} onClick={() => void toggleFullscreen()} aria-pressed={fullscreen} aria-label="Full screen" title="Full screen (F)">
              {fullscreen ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.messages} aria-live="polite">
        {problem === "load" && (
          <p className={styles.error} role="alert">
            The welcome video couldn&apos;t load. Check your connection, then{" "}
            <button type="button" className={styles.linkButton} onClick={reloadVideo}>reload the video</button>.
            Your reading lists still work.
          </p>
        )}
        {problem === "playback" && (
          <p className={styles.error} role="alert">
            Playback stopped unexpectedly.{" "}
            <button type="button" className={styles.linkButton} onClick={reloadVideo}>Reload the video</button>{" "}
            and press Play to continue from your saved place.
          </p>
        )}
        {progress.progressLoad === "error" && (
          <p className={styles.warning}>
            Couldn&apos;t load where you stopped, so the video starts from the beginning.{" "}
            <button type="button" className={styles.linkButton} onClick={() => void progress.reloadProgress()}>Try again</button>
          </p>
        )}
        {saveState.kind === "error" && (
          <p className={styles.error} role="alert" data-testid="video-save-error">
            Couldn&apos;t save your place at {formatTimestamp(saveState.position)}.{" "}
            <button type="button" className={styles.linkButton} onClick={progress.retrySave}>Try again</button>
          </p>
        )}
        {saveState.kind === "saving" && <p className={styles.note}>Saving your place…</p>}
        {saveState.kind === "saved" && (
          <p className={styles.note} data-testid="video-saved">Saved your place at {formatTimestamp(saveState.position)}.</p>
        )}
        {saveState.kind === "idle" && resumeHint && <p className={styles.note} data-testid="resume-hint">{resumeHint}</p>}
        {saveState.kind === "idle" && progress.progressLoad === "loading" && <p className={styles.note}>Checking where you left off…</p>}
      </div>
      <p className={styles.credit}>{VIDEO.credit}</p>
    </section>
  );
}
