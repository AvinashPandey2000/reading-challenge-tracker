"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { LIBRARY_NAME } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteHeader.module.css";

const SCROLL_THRESHOLD = 24;
/** Scroll distance over which the full-width bar morphs into the pill. */
const MORPH_DISTANCE = 72;
const subscribe = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};

/** Glass header shared by every page: full width at the top, morphing into a compact pill as the page scrolls. */
export function SiteHeader({ current }: { current: "challenge" | "library" }) {
  const scrolled = useSyncExternalStore(
    subscribe,
    () => window.scrollY > SCROLL_THRESHOLD,
    () => false,
  );
  const headerRef = useRef<HTMLElement>(null);

  // Fallback: drive the morph straight from the scroll position (scroll events already fire once per frame),
  // so it follows the user's scroll smoothly instead of snapping between two states.
  useEffect(() => {
    // Browsers with CSS scroll-driven animations do this in CSS (SiteHeader.module.css).
    const cssDriven =
      typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()") &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (cssDriven) return;
    const update = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / MORPH_DISTANCE));
      headerRef.current?.style.setProperty("--p", p.toFixed(3));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <>
      <div className="bubbles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <header ref={headerRef} className={styles.siteHeader} data-scrolled={scrolled || undefined} data-testid="site-header">
        <div className={`glass ${styles.headerBar}`}>
          <Link href="/" className={styles.brand} aria-label={`${LIBRARY_NAME} home`}>
            <svg className={styles.brandMark} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <rect x="3" y="3" width="26" height="26" rx="7" fill="currentColor" />
              <path d="M10 9h4v14h-4z" fill="#F4A422" />
              <path d="M16 9.5l4-.9 3.1 13.7-4 .9z" style={{ fill: "var(--bg)" }} />
            </svg>
            <span className={styles.brandName}>{LIBRARY_NAME}</span>
          </Link>
          <nav aria-label="Main" className={styles.nav} data-tour="nav">
            <Link href="/" aria-current={current === "challenge" ? "page" : undefined} className={styles.navLink}>
              Challenge
            </Link>
            <Link href="/library" aria-current={current === "library" ? "page" : undefined} className={styles.navLink}>
              My Library
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}
