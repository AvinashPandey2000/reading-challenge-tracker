"use client";

import { useMemo, useState } from "react";
import {
  LIBRARY_FILTERS,
  filterAndSearch,
  filterCounts,
  formatDuration,
  formatLastRead,
  type LibraryBook,
  type LibraryFilter,
  type ReaderPrefs,
} from "@rct/shared";
import { useLibrary } from "@/lib/useLibrary";
import { BookCard, BookTile } from "./BookCard";
import styles from "./reading.module.css";

export function Library() {
  const { state, retry, saveGoal } = useLibrary();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");

  const books = useMemo(() => (state.status === "ready" ? state.books : []), [state]);
  const visible = useMemo(() => filterAndSearch(books, filter, query), [books, filter, query]);
  const counts = useMemo(() => filterCounts(books), [books]);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" data-testid="library-loading">
        <p className={styles.muted}>Loading your library…</p>
        <ul className={styles.grid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className={`glass ${styles.card} ${styles.skeleton}`} />
          ))}
        </ul>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className={styles.errorBox} role="alert" data-testid="library-error">
        <p>{state.message}</p>
        <button type="button" className={styles.primaryButton} onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  const byId = new Map(books.map((b) => [b.id, b]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((b): b is LibraryBook => !!b);
  const continueReading = pick(state.stats.continueReading);
  const recent = pick(state.stats.recentlyRead);
  const note = books[0]?.contentNote;

  return (
    <div className={styles.library}>
      {note && (
        <p className={styles.contentNote} data-testid="content-note">
          {note}
        </p>
      )}
      <StatsStrip stats={state.stats} />
      <GoalCard stats={state.stats} prefs={state.prefs} onSave={saveGoal} />

      {continueReading.length > 0 && (
        <section aria-labelledby="continue-heading" className={styles.section}>
          <h2 id="continue-heading" className={styles.sectionTitle}>
            Continue reading
          </h2>
          <ul className={styles.row} data-testid="continue-reading">
            {continueReading.map((b) => (
              <BookTile
                key={b.id}
                book={b}
                href={b.readable ? `/books/${b.id}/read` : `/books/${b.id}`}
                caption={`Page ${b.progress.currentPage} of ${b.progress.totalPages}`}
              />
            ))}
          </ul>
        </section>
      )}
      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" className={styles.section}>
          <h2 id="recent-heading" className={styles.sectionTitle}>
            Recently read
          </h2>
          <ul className={styles.row} data-testid="recently-read">
            {recent.map((b) => (
              <BookTile key={b.id} book={b} href={`/books/${b.id}`} caption={formatLastRead(b.progress.lastReadAt)} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="books-heading" className={styles.section}>
        <div className={styles.toolbar}>
          <h2 id="books-heading" className={styles.sectionTitle}>
            My books
          </h2>
          <label className={styles.search}>
            <span className={styles.srOnly}>Search books</span>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input type="search" placeholder="Search title, author or category" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="library-search" />
          </label>
        </div>
        <div className={styles.chips} role="radiogroup" aria-label="Filter by status">
          {LIBRARY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              className={styles.chip}
              onClick={() => setFilter(f.id)}
              data-testid={`filter-${f.id}`}
            >
              {f.label} <span className={styles.chipCount}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <p className={styles.srOnly} role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? "book" : "books"} shown
        </p>
        {visible.length ? (
          <ul className={styles.grid} data-testid="library-grid">
            {visible.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </ul>
        ) : (
          <div className={styles.empty} data-testid="library-empty">
            <p className={styles.emptyTitle}>No books match.</p>
            <p className={styles.muted}>Try another search or filter.</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear search and filter
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function StatsStrip({ stats }: { stats: import("@rct/shared").Stats }) {
  const items = [
    ["Total books", String(stats.totalBooks)],
    ["Reading", String(stats.reading)],
    ["Completed", String(stats.completed)],
    ["Pages read", String(stats.pagesRead)],
    ["Reading time", formatDuration(stats.secondsRead)],
  ];
  return (
    <section aria-label="Reading statistics">
      <dl className={styles.stats} data-testid="reading-stats">
        {items.map(([label, value]) => (
          <div key={label} className={`glass ${styles.stat}`}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function GoalCard({ stats, prefs, onSave }: { stats: import("@rct/shared").Stats; prefs: ReaderPrefs; onSave: (g: ReaderPrefs["goal"]) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState(prefs.goal.period);
  const [minutes, setMinutes] = useState(prefs.goal.minutes);
  const [error, setError] = useState<string | null>(null);
  const { goal, streak } = stats;
  return (
    <section className={`glass ${styles.goal}`} aria-labelledby="goal-heading" data-testid="goal-card">
      <div className={styles.goalRing} style={{ ["--pct" as string]: `${goal.percent}%` }} aria-hidden="true">
        <span>{goal.percent}%</span>
      </div>
      <div className={styles.goalText}>
        <h2 id="goal-heading" className={styles.sectionTitle}>
          {goal.period === "daily" ? "Today's goal" : "This week's goal"}
        </h2>
        <p>
          <strong>
            {goal.minutesDone} of {goal.targetMinutes} min
          </strong>{" "}
          {goal.met ? "· Goal reached ✓" : "read"}
        </p>
        <p className={styles.streak} data-testid="streak">
          🔥 {streak} day{streak === 1 ? "" : "s"} streak
        </p>
      </div>
      {editing ? (
        <form
          className={styles.goalForm}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await onSave({ period, minutes });
            if (ok) {
              setEditing(false);
              setError(null);
            } else setError("Couldn't save your goal. Try again.");
          }}
        >
          <label>
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value as "daily" | "weekly")}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label>
            Minutes
            <input type="number" min={5} max={1000} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </label>
          <button type="submit" className={styles.primaryButton}>
            Save goal
          </button>
          {error && <p role="alert" className={styles.errorText}>{error}</p>}
        </form>
      ) : (
        <button type="button" className={styles.secondaryButton} onClick={() => setEditing(true)}>
          Change goal
        </button>
      )}
    </section>
  );
}
