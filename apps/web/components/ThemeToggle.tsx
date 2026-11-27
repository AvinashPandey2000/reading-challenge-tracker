"use client";

import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  {
    value: "system",
    label: "System",
    icon: <path d="M3 4.5h14v9H3zM7 16.5h6M10 13.5v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    value: "light",
    label: "Light",
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="10" r="3.4" />
        <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
      </g>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: <path d="M15.8 12.6A6.5 6.5 0 0 1 7.4 4.2a6.5 6.5 0 1 0 8.4 8.4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  },
];

/** Segmented System / Light / Dark control built from native radio buttons (arrow keys work). */
export function ThemeToggle() {
  const pref = useThemePreference();
  return (
    <fieldset className={styles.group} data-testid="theme-toggle">
      <legend className={styles.srOnly}>Colour theme</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className={styles.option} title={`${o.label} theme`}>
          <input
            type="radio"
            name="theme"
            value={o.value}
            checked={pref === o.value}
            onChange={() => setThemePreference(o.value)}
            className={styles.input}
          />
          <span className={styles.face}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={styles.icon}>
              {o.icon}
            </svg>
            <span className={styles.srOnly}>{o.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
