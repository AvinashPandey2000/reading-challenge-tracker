"use client";

import Link from "next/link";
import { useState } from "react";
import type { Bookmark, Highlight, Note } from "@rct/shared";
import styles from "./reading.module.css";

/** Bookmarks, highlights and notes for a book (used on the details page and inside the reader). */
export function AnnotationsPanel({
  bookId,
  readable,
  bookmarks,
  highlights,
  notes,
  busy,
  onAddNote,
  onDeleteNote,
  onDeleteBookmark,
  onDeleteHighlight,
  onAddBookmark,
  onJump,
}: {
  bookId: string;
  readable: boolean;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  notes: Note[];
  busy: boolean;
  onAddNote: (text: string) => Promise<void> | void;
  onDeleteNote: (id: number) => Promise<void> | void;
  onDeleteBookmark: (id: number) => Promise<void> | void;
  onDeleteHighlight: (id: number) => Promise<void> | void;
  onAddBookmark?: () => Promise<void> | void;
  /** In the reader, jump in place instead of navigating. */
  onJump?: (page: number) => void;
}) {
  const [text, setText] = useState("");
  const pageLink = (page: number, label: string) =>
    onJump ? (
      <button type="button" className={styles.linkButton} onClick={() => onJump(page)}>
        {label}
      </button>
    ) : readable ? (
      <Link href={`/books/${bookId}/read?page=${page}`}>{label}</Link>
    ) : (
      <span>{label}</span>
    );

  return (
    <div className={styles.annotations} data-testid="annotations">
      <section aria-labelledby="bookmarks-heading" className={styles.section}>
        <div className={styles.toolbar}>
          <h2 id="bookmarks-heading" className={styles.sectionTitle}>Bookmarks <span className={styles.count}>{bookmarks.length}</span></h2>
          {onAddBookmark && (
            <button type="button" className={styles.secondaryButton} onClick={() => void onAddBookmark()} disabled={busy}>
              Bookmark my page
            </button>
          )}
        </div>
        {bookmarks.length ? (
          <ul className={styles.annoList} data-testid="bookmark-list">
            {bookmarks.map((b) => (
              <li key={b.id} className={styles.annoItem}>
                {pageLink(b.page, b.label)}
                <button type="button" className={styles.iconButton} aria-label={`Remove bookmark: ${b.label}`} onClick={() => void onDeleteBookmark(b.id)} disabled={busy}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No bookmarks yet.{readable ? " Use the bookmark button while reading." : ""}</p>
        )}
      </section>

      {readable && (
        <section aria-labelledby="highlights-heading" className={styles.section}>
          <h2 id="highlights-heading" className={styles.sectionTitle}>Highlights <span className={styles.count}>{highlights.length}</span></h2>
          {highlights.length ? (
            <ul className={styles.annoList} data-testid="highlight-list">
              {highlights.map((h) => (
                <li key={h.id} className={styles.annoItem} data-color={h.color}>
                  <div>
                    <p className={styles.excerpt}>“{h.excerpt}”</p>
                    {h.note && <p className={styles.annoNote}>Note: {h.note}</p>}
                    {pageLink(h.page, `Page ${h.page}`)}
                  </div>
                  <button type="button" className={styles.iconButton} aria-label={`Remove highlight on page ${h.page}`} onClick={() => void onDeleteHighlight(h.id)} disabled={busy}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No highlights yet. While reading, select a paragraph to highlight it.</p>
          )}
        </section>
      )}

      <section aria-labelledby="notes-heading" className={styles.section}>
        <h2 id="notes-heading" className={styles.sectionTitle}>Notes <span className={styles.count}>{notes.length}</span></h2>
        <form
          className={styles.noteForm}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            await onAddNote(text);
            setText("");
          }}
        >
          <label className={styles.srOnly} htmlFor={`note-${bookId}`}>New note</label>
          <textarea id={`note-${bookId}`} rows={2} maxLength={2000} placeholder="Write a note about this book…" value={text} onChange={(e) => setText(e.target.value)} data-testid="note-input" />
          <button type="submit" className={styles.primaryButton} disabled={busy || !text.trim()}>
            Add note
          </button>
        </form>
        {notes.length > 0 && (
          <ul className={styles.annoList} data-testid="note-list">
            {notes.map((n) => (
              <li key={n.id} className={styles.annoItem}>
                <div>
                  <p>{n.text}</p>
                  {n.page && pageLink(n.page, `Page ${n.page}`)}
                </div>
                <button type="button" className={styles.iconButton} aria-label="Delete note" onClick={() => void onDeleteNote(n.id)} disabled={busy}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
