import Link from "next/link";
import { LIBRARY_NAME } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteHeader.module.css";

/** Floating glass header shared by every page. */
export function SiteHeader({ current }: { current: "challenge" | "library" }) {
  return (
    <>
      <div className="bubbles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <header className={styles.siteHeader}>
        <div className={`glass ${styles.headerBar}`}>
          <Link href="/" className={styles.brand} aria-label={`${LIBRARY_NAME} home`}>
            <svg className={styles.brandMark} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <rect x="3" y="3" width="26" height="26" rx="7" fill="currentColor" />
              <path d="M10 9h4v14h-4z" fill="#F4A422" />
              <path d="M16 9.5l4-.9 3.1 13.7-4 .9z" style={{ fill: "var(--bg)" }} />
            </svg>
            <span className={styles.brandName}>{LIBRARY_NAME}</span>
          </Link>
          <nav aria-label="Main" className={styles.nav}>
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
