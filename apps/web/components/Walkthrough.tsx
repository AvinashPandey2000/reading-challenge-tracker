"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { WALKTHROUGH_STORAGE_KEY, WEB_WALKTHROUGH, type WalkthroughStep } from "@rct/shared";
import styles from "./Walkthrough.module.css";

export const START_WALKTHROUGH_EVENT = "rct:start-walkthrough";

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;

function seen() {
  try {
    return localStorage.getItem(WALKTHROUGH_STORAGE_KEY) === "1";
  } catch {
    return true; // storage blocked: don't trap people in a tour every visit
  }
}

/**
 * First-visit walkthrough: highlights one part of the page at a time with a short explanation.
 * Next / Back / Skip, arrow keys and Esc. Shown once; replay with "Take the tour".
 */
export function Walkthrough({ steps = WEB_WALKTHROUGH }: { steps?: WalkthroughStep[] }) {
  const [index, setIndex] = useState<number | null>(null);
  // The measured highlight belongs to one step; a stale one from the previous step is ignored.
  const [measured, setMeasured] = useState<{ id: string; rect: Rect | null } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const step = index === null ? null : steps[index]!;
  const last = index === steps.length - 1;
  const rect = step && step.target && measured?.id === step.id ? measured.rect : null;

  const open = useCallback(() => {
    returnFocus.current = document.activeElement;
    setIndex(0);
  }, []);
  const close = useCallback(() => {
    try {
      localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setIndex(null);
    (returnFocus.current as HTMLElement | null)?.focus?.();
  }, []);

  // First visit, and the "Take the tour" button.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!seen()) open();
    }, 600);
    window.addEventListener(START_WALKTHROUGH_EVENT, open);
    return () => {
      clearTimeout(t);
      window.removeEventListener(START_WALKTHROUGH_EVENT, open);
    };
  }, [open]);

  // Find, scroll to and measure the highlighted element (it may still be loading, so retry briefly).
  useLayoutEffect(() => {
    if (!step || !step.target) return;
    let tries = 0;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) {
        if (tries++ < 15) timer = setTimeout(measure, 100);
        else setMeasured({ id: step.id, rect: null }); // not on screen: show the card centred instead
        return;
      }
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      const update = () => {
        const r = el.getBoundingClientRect();
        setMeasured({ id: step.id, rect: { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } });
      };
      update();
      const follow = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
      };
      window.addEventListener("scroll", follow, true);
      window.addEventListener("resize", follow);
      cleanup = () => {
        window.removeEventListener("scroll", follow, true);
        window.removeEventListener("resize", follow);
      };
    };
    let cleanup = () => {};
    measure();
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [step]);

  // Keyboard + focus.
  useEffect(() => {
    if (index === null) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setIndex((i) => (i !== null && i < steps.length - 1 ? i + 1 : i));
      else if (e.key === "ArrowLeft") setIndex((i) => (i ? i - 1 : i));
      else if (e.key === "Tab" && cardRef.current) {
        // Keep focus inside the card while the tour is open.
        const f = [...cardRef.current.querySelectorAll<HTMLElement>("button")];
        if (!f.length) return;
        const first = f[0]!;
        const lastEl = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, steps.length]);

  if (!step || index === null) return null;

  // Card below the highlight when there's room, otherwise above; centred when there's no highlight.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cardW = Math.min(360, vw - 24);
  let cardStyle: React.CSSProperties = { width: cardW };
  if (rect) {
    const CARD_H = 240; // generous estimate of the card's height
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 12);
    const spaceBelow = vh - (rect.top + rect.height) - 12;
    const spaceAbove = rect.top - 12;
    if (spaceBelow >= CARD_H) cardStyle = { ...cardStyle, top: rect.top + rect.height + 12, left };
    else if (spaceAbove >= CARD_H) cardStyle = { ...cardStyle, bottom: vh - rect.top + 12, left };
    // Tall targets: keep the card fully on screen, pinned to the bottom edge over the highlight.
    else cardStyle = { ...cardStyle, bottom: 12, left: Math.max(12, (vw - cardW) / 2) };
  }

  return (
    <div className={styles.root} data-testid="walkthrough">
      {rect ? (
        <div className={styles.spotlight} style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden="true" />
      ) : (
        <div className={styles.dim} aria-hidden="true" />
      )}
      <div
        ref={cardRef}
        className={`${styles.card} ${rect ? "" : styles.centered}`}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        aria-describedby="walkthrough-body"
        tabIndex={-1}
        key={step.id}
      >
        <p className={styles.count} aria-live="polite">
          Step {index + 1} of {steps.length}
        </p>
        <h2 id="walkthrough-title" className={styles.title}>
          {step.title}
        </h2>
        <p id="walkthrough-body" className={styles.body}>
          {step.body}
        </p>
        <div className={styles.dots} aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.id} data-active={i === index || undefined} />
          ))}
        </div>
        <div className={styles.actions}>
          {!last && (
            <button type="button" className={styles.skip} onClick={close}>
              Skip tour
            </button>
          )}
          <span className={styles.spacer} />
          {index > 0 && (
            <button type="button" className={styles.secondary} onClick={() => setIndex(index - 1)}>
              Back
            </button>
          )}
          <button type="button" className={styles.primary} onClick={() => (last ? close() : setIndex(index + 1))} data-testid="walkthrough-next">
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Replays the walkthrough (footer button). */
export function TakeTourButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(START_WALKTHROUGH_EVENT))}>
      Take the tour
    </button>
  );
}
