"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimestamp } from "@rct/shared";
import { VIDEO } from "@/lib/site";
import { useVideoProgress } from "@/lib/useVideoProgress";
import styles from "./WelcomeVideo.module.css";

type MediaProblem = null | "load" | "playback";

export function WelcomeVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progress = useVideoProgress(videoRef);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [problem, setProblem] = useState<MediaProblem>(null);
  const [starting, setStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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
    if (!video) return;
    if (video.paused) void play();
    else video.pause();
  }, [play]);

  const onSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const value = Number(e.target.value);
    video.currentTime = value;
    setCurrent(value);
  };

  const reloadVideo = () => {
    const video = videoRef.current;
    setProblem(null);
    video?.load();
  };

  const onError = () => {
    // Before metadata = the file couldn't be loaded; after = playback broke part-way.
    setProblem(duration > 0 || hasStarted ? "playback" : "load");
    setPlaying(false);
  };

  const resumeHint =
    progress.progressLoad === "ready" && progress.savedPosition > 0 && !hasStarted
      ? `Press Play to pick up at ${formatTimestamp(progress.savedPosition)}.`
      : null;

  const { saveState } = progress;

  return (
    <section className={`glass ${styles.card}`} aria-labelledby="video-heading" data-testid="welcome-video">
      <div className={styles.headerRow}>
        <h2 id="video-heading" className={styles.heading}>
          Welcome video
        </h2>
        <p className={styles.sub}>A short clip to start the challenge. We remember where you pause.</p>
      </div>

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
          onLoadedMetadata={(e) => handleMetadata(e.currentTarget)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            progress.onPause();
          }}
          onSeeked={(e) => {
            setCurrent(e.currentTarget.currentTime);
            progress.onSeeked();
          }}
          onError={onError}
        >
          {VIDEO.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} onError={s === VIDEO.sources.at(-1) ? onError : undefined} />
          ))}
          <track kind="captions" src="/media/welcome.en.vtt" srcLang="en" label="English" />
        </video>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.playButton}
          onClick={togglePlay}
          aria-label={playing ? "Pause welcome video" : "Play welcome video"}
          disabled={problem === "load"}
          data-testid="play-toggle"
        >
          <span aria-hidden="true" className={styles.playIcon}>
            {playing ? (
              <svg viewBox="0 0 20 20" focusable="false"><rect x="5" y="4" width="3.5" height="12" rx="1" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" focusable="false"><path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L7.2 3.5A.8.8 0 0 0 6 4.2z" /></svg>
            )}
          </span>
          <span className={styles.playText}>{playing ? "Pause" : starting ? "Starting…" : "Play"}</span>
        </button>
        <label className={styles.seekLabel}>
          <span className={styles.srOnly}>Seek</span>
          <input
            type="range"
            className={styles.seek}
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            onChange={onSeekInput}
            disabled={!duration}
            aria-valuetext={`${formatTimestamp(current)} of ${formatTimestamp(duration)}`}
            data-testid="seek"
          />
        </label>
        <span className={styles.time} aria-hidden="true">
          {formatTimestamp(current)} / {formatTimestamp(duration)}
        </span>
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
