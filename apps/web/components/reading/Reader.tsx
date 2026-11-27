"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ALIGNMENTS,
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  LINE_SPACINGS,
  READER_BACKGROUNDS,
  READER_THEMES,
  readerColors,
  type HighlightColor,
  type ReaderBackground,
} from "@rct/shared";
import { useReader } from "@/lib/useReader";
import { AnnotationsPanel } from "./AnnotationsPanel";
import { Toast } from "./bits";
import styles from "./reader.module.css";

const FONT_STACK = {
  serif: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
  sans: "var(--font-body), system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const;
const FONT_LABEL = { serif: "Serif", sans: "Sans", mono: "Mono" } as const;
const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: "rgba(250, 204, 21, 0.38)",
  green: "rgba(74, 222, 128, 0.32)",
  blue: "rgba(96, 165, 250, 0.32)",
  pink: "rgba(244, 114, 182, 0.30)",
};

export function Reader({ bookId, initialPage }: { bookId: string; initialPage: number | null }) {
  const r = useReader(bookId, initialPage);
  const [panel, setPanel] = useState<null | "settings" | "notes">(null);
  // Selection is remembered per page, so turning the page clears it without an effect.
  const [selection, setSelection] = useState<{ page: number; index: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const touchStart = useRef<number | null>(null);
  const finishRef = useRef<HTMLDialogElement>(null);

  const total = r.details?.book.progress.totalPages ?? r.page?.totalPages ?? 0;
  const current = r.page?.page ?? 0;
  const selected = selection?.page === current ? selection.index : null;
  const setSelected = (index: number | null) => setSelection(index === null ? null : { page: current, index });
  const colors = readerColors(r.prefs);

  // Keyboard: ← / → turn pages (not while typing), Esc closes panels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") void r.goTo(current + 1);
      else if (e.key === "ArrowLeft") void r.goTo(current - 1);
      else if (e.key === "Escape") {
        setPanel(null);
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, r]);

  useEffect(() => {
    const d = finishRef.current;
    if (!d) return;
    if (r.finished && !d.open) d.showModal?.();
    if (!r.finished && d.open) d.close();
  }, [r.finished]);


  if (r.load.status === "loading") {
    return <p className={styles.loading} data-testid="reader-loading">Opening book…</p>;
  }
  if (r.load.status === "error" || !r.details || !r.page) {
    return (
      <div className={styles.errorBox} role="alert">
        <p>{r.load.status === "error" ? r.load.message : "Couldn't open this book."}</p>
        <Link href={`/books/${bookId}`}>Back to book details</Link>
      </div>
    );
  }

  const { book } = r.details;
  const percent = total ? Math.round((current / total) * 100) : 0;

  return (
    <div
      className={styles.reader}
      style={{ ["--reader-bg" as string]: colors.background, ["--reader-text" as string]: colors.text, ["--reader-muted" as string]: colors.muted, ["--reader-accent" as string]: colors.accent }}
      data-reader-theme={r.prefs.theme}
      data-testid="reader"
      onTouchStart={(e) => (touchStart.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start == null || end == null || Math.abs(end - start) < 70) return;
        void r.goTo(end < start ? current + 1 : current - 1);
      }}
    >
      <header className={styles.topBar}>
        <Link href={`/books/${book.id}`} className={styles.iconLink} aria-label={`Back to ${book.title} details`}>
          ←
        </Link>
        <div className={styles.titleBlock}>
          <p className={styles.bookTitle}>{book.title}</p>
          <p className={styles.chapter}>{r.page.chapterTitle ?? ""}</p>
        </div>
        <button type="button" className={styles.iconButton} aria-pressed={r.isBookmarked} aria-label={r.isBookmarked ? `Remove bookmark on page ${current}` : `Bookmark page ${current}`} onClick={() => void r.toggleBookmark()} data-testid="bookmark-toggle">
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M5.5 3h9v14l-4.5-3.5L5.5 17z" fill={r.isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={styles.iconButton} aria-expanded={panel === "settings"} aria-controls="reader-settings" aria-label="Reading settings" onClick={() => setPanel(panel === "settings" ? null : "settings")} data-testid="settings-toggle">
          Aa
        </button>
        <button type="button" className={styles.iconButton} aria-expanded={panel === "notes"} aria-controls="reader-notes" aria-label="Bookmarks, highlights and notes" onClick={() => setPanel(panel === "notes" ? null : "notes")} data-testid="notes-toggle">
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M4 4h12M4 8h12M4 12h8M4 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {book.contentNote && <p className={styles.contentNote}>{book.contentNote}</p>}

      {panel === "settings" && (
        <section id="reader-settings" className={styles.panel} aria-label="Reading settings" data-testid="reader-settings">
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Font size</span>
            <div className={styles.stepper}>
              <button type="button" aria-label="Decrease font size" disabled={r.prefs.fontSize <= FONT_SIZES.min} onClick={() => void r.updatePrefs({ fontSize: r.prefs.fontSize - FONT_SIZES.step })}>
                A−
              </button>
              <output aria-live="polite" data-testid="font-size">{r.prefs.fontSize}px</output>
              <button type="button" aria-label="Increase font size" disabled={r.prefs.fontSize >= FONT_SIZES.max} onClick={() => void r.updatePrefs({ fontSize: r.prefs.fontSize + FONT_SIZES.step })}>
                A+
              </button>
            </div>
          </div>
          <Segmented label="Font style" value={r.prefs.fontFamily} options={FONT_FAMILIES.map((f) => [f, FONT_LABEL[f]])} onChange={(v) => void r.updatePrefs({ fontFamily: v })} />
          <Segmented label="Theme" value={r.prefs.theme} options={READER_THEMES.map((t) => [t, t[0]!.toUpperCase() + t.slice(1)])} onChange={(v) => void r.updatePrefs({ theme: v })} />
          <Segmented label="Line spacing" value={String(r.prefs.lineSpacing)} options={LINE_SPACINGS.map((l) => [String(l), `${l}×`])} onChange={(v) => void r.updatePrefs({ lineSpacing: Number(v) as 1.3 | 1.5 | 1.7 | 2 })} />
          <Segmented label="Alignment" value={r.prefs.align} options={ALIGNMENTS.map((a) => [a, a === "left" ? "Left" : "Justify"])} onChange={(v) => void r.updatePrefs({ align: v })} />
          <fieldset className={styles.swatches}>
            <legend className={styles.settingLabel}>Background</legend>
            {(Object.keys(READER_BACKGROUNDS) as ReaderBackground[]).map((key) => {
              const swatch = READER_BACKGROUNDS[key][r.prefs.theme] ?? readerColors({ theme: r.prefs.theme, background: "theme" }).background;
              return (
                <label key={key} className={styles.swatch} title={READER_BACKGROUNDS[key].label}>
                  <input type="radio" name="reader-bg" checked={r.prefs.background === key} onChange={() => void r.updatePrefs({ background: key })} />
                  <span style={{ background: swatch }} />
                  <span className={styles.srOnly}>{READER_BACKGROUNDS[key].label}</span>
                </label>
              );
            })}
          </fieldset>
        </section>
      )}

      {panel === "notes" && (
        <section id="reader-notes" className={styles.panel} aria-label="Bookmarks, highlights and notes">
          <AnnotationsPanel
            bookId={book.id}
            readable
            bookmarks={r.bookmarks}
            highlights={r.highlights}
            notes={r.notes}
            busy={false}
            onAddNote={r.addNote}
            onDeleteNote={r.deleteNote}
            onDeleteBookmark={r.deleteBookmark}
            onDeleteHighlight={r.removeHighlight}
            onJump={(n) => {
              setPanel(null);
              void r.goTo(n);
            }}
          />
        </section>
      )}

      <main className={styles.page}>
        <article
          className={styles.text}
          style={{
            fontSize: `${r.prefs.fontSize}px`,
            lineHeight: r.prefs.lineSpacing,
            textAlign: r.prefs.align,
            fontFamily: FONT_STACK[r.prefs.fontFamily],
          }}
          aria-label={`Page ${current} of ${total}`}
          data-testid="page-text"
        >
          {r.page.chapterTitle && r.details.chapters.some((c) => c.startPage === current) && <h1 className={styles.chapterHeading}>{r.page.chapterTitle}</h1>}
          {r.page.paragraphs.map((text, i) => {
            const h = r.highlightFor(current, i);
            return (
              <div key={`${current}-${i}`} className={styles.paragraphWrap}>
                <div
                  className={styles.paragraph}
                  role="button"
                  aria-expanded={selected === i}
                  data-selected={selected === i || undefined}
                  data-highlight={h?.color}
                  style={h ? { background: HIGHLIGHT_BG[h.color] } : undefined}
                  tabIndex={0}
                  aria-describedby="paragraph-hint"
                  onClick={() => {
                    setSelected(selected === i ? null : i);
                    setNoteDraft(h?.note ?? "");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(selected === i ? null : i);
                      setNoteDraft(h?.note ?? "");
                    }
                  }}
                  data-testid={`paragraph-${i}`}
                >
                  {text}
                  {h?.note && <span className={styles.noteMark} aria-label="Has a note"> ✎</span>}
                </div>
                {selected === i && (
                  <div className={styles.popover} role="group" aria-label="Highlight and note" data-testid="highlight-popover">
                    <div className={styles.colors}>
                      {HIGHLIGHT_COLORS.map((c) => (
                        <button key={c} type="button" className={styles.colorDot} style={{ background: HIGHLIGHT_BG[c] }} aria-pressed={h?.color === c} aria-label={`Highlight ${c}`} onClick={() => void r.setHighlight(i, c)} />
                      ))}
                      {h && (
                        <button type="button" className={styles.smallButton} onClick={() => { void r.removeHighlight(h.id); setSelected(null); }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <form
                      className={styles.noteRow}
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (h) void r.saveHighlightNote(h.id, noteDraft.trim() || null);
                        else void r.setHighlight(i, "yellow", noteDraft.trim() || null);
                        setSelected(null);
                      }}
                    >
                      <label className={styles.srOnly} htmlFor={`note-${i}`}>Note for this paragraph</label>
                      <input id={`note-${i}`} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a note…" maxLength={2000} data-testid="highlight-note-input" />
                      <button type="submit" className={styles.smallButton}>Save</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
          <p id="paragraph-hint" className={styles.srOnly}>Select a paragraph to highlight it or add a note.</p>
        </article>
        {r.pageError && (
          <div className={styles.errorBox} role="alert">
            <p>{r.pageError}</p>
            <button type="button" onClick={() => void r.retryPage()}>Try again</button>
          </div>
        )}
      </main>

      <footer className={styles.bottomBar}>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.nav}>
          <button type="button" className={styles.navButton} onClick={() => void r.goTo(current - 1)} disabled={current <= 1} data-testid="prev-page">
            ← Previous
          </button>
          <p className={styles.pageLabel} aria-live="polite" data-testid="page-label">
            Page {current} of {total} · {percent}%
          </p>
          <button type="button" className={styles.navButton} onClick={() => void r.goTo(current + 1)} disabled={current >= total} data-testid="next-page">
            Next →
          </button>
        </div>
      </footer>

      <dialog ref={finishRef} className={styles.finish} aria-labelledby="finish-title" onCancel={r.dismissFinished} data-testid="finished-dialog">
        <div className={styles.finishBadge} aria-hidden="true">✓</div>
        <h2 id="finish-title">You finished {book.title}!</h2>
        <p>It&apos;s marked as Completed{book.listId ? " and counts toward your reading challenge" : ""}.</p>
        <div className={styles.finishActions}>
          <Link href="/library" className={styles.navButton}>My Library</Link>
          <button type="button" className={styles.navButton} onClick={r.dismissFinished}>Keep reading</button>
        </div>
      </dialog>

      <Toast message={r.message} onDone={() => r.setMessage(null)} />
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: string; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className={styles.segmented}>
      <legend className={styles.settingLabel}>{label}</legend>
      <div className={styles.segments}>
        {options.map(([v, text]) => (
          <label key={v} className={styles.segment}>
            <input type="radio" name={label} value={v} checked={value === v} onChange={() => onChange(v)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
