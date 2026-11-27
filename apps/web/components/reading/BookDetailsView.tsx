"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration, formatLastRead, pagesLabel } from "@rct/shared";
import { useBookDetails } from "@/lib/useBookDetails";
import { BookCover } from "./BookCover";
import { ConfirmDialog, ProgressMeter, StatusBadge, Toast } from "./bits";
import { AnnotationsPanel } from "./AnnotationsPanel";
import styles from "./reading.module.css";

export function BookDetailsView({ bookId }: { bookId: string }) {
  const d = useBookDetails(bookId);
  const [confirm, setConfirm] = useState<null | "read" | "reset">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");

  if (d.state.status === "loading") return <p className={styles.muted} data-testid="details-loading">Loading book…</p>;
  if (d.state.status === "error") {
    return (
      <div className={styles.errorBox} role="alert">
        <p>{d.state.message}</p>
        {d.state.notFound ? (
          <Link href="/library" className={styles.primaryButton}>Back to My Library</Link>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={() => void d.reload()}>Try again</button>
        )}
      </div>
    );
  }

  const { details, bookmarks, highlights, notes } = d.state;
  const { book, chapters } = details;
  const p = book.progress;
  const done = p.status === "completed";
  const run = async (fn: () => Promise<string | null>, ok: string) => {
    const err = await fn();
    setMessage(err ?? ok);
  };
  const resumePage = Math.max(1, p.currentPage);
  const primaryLabel = p.status === "not_started" ? "Start reading" : done && p.currentPage >= p.totalPages ? "Read again" : "Continue reading";

  return (
    <article className={styles.details} data-testid="book-details">
      <div className={styles.detailsHero}>
        <BookCover title={book.title} author={book.author} cover={book.cover} className={styles.detailsCover} />
        <div className={styles.detailsInfo}>
          <p className={styles.category}>
            {book.category}
            {book.year ? ` · First published ${book.year}` : ""}
          </p>
          <h1 className={styles.detailsTitle}>{book.title}</h1>
          <p className={styles.author}>by {book.author}</p>
          <StatusBadge status={p.status} />
          <ProgressMeter percent={p.percent} label={pagesLabel(book)} />
          <p className={styles.metaLine}>
            {formatDuration(p.secondsRead)} read · Last read: {formatLastRead(p.lastReadAt)}
          </p>
          {book.contentNote && <p className={styles.contentNote}>{book.contentNote}</p>}

          <div className={styles.actions}>
            {book.readable ? (
              <Link href={`/books/${book.id}/read${p.currentPage > 0 && primaryLabel !== "Read again" ? `?page=${resumePage}` : primaryLabel === "Read again" ? "?page=1" : ""}`} className={styles.primaryButton} data-testid="start-reading">
                {primaryLabel}
                {p.currentPage > 0 && primaryLabel === "Continue reading" ? ` · page ${resumePage}` : ""}
              </Link>
            ) : (
              <form
                className={styles.pageForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(pageInput);
                  if (!Number.isInteger(n) || n < 1 || n > p.totalPages) return setMessage(`Enter a page from 1 to ${p.totalPages}.`);
                  void run(() => d.setPage(n), `Saved: page ${n} of ~${p.totalPages}.`);
                  setPageInput("");
                }}
              >
                <label>
                  I&apos;m on page
                  <input type="number" min={1} max={p.totalPages} value={pageInput} onChange={(e) => setPageInput(e.target.value)} placeholder={String(p.currentPage || 1)} data-testid="page-input" />
                </label>
                <span className={styles.muted}>of ~{p.totalPages}</span>
                <button type="submit" className={styles.primaryButton} disabled={d.busy}>
                  Update page
                </button>
              </form>
            )}
            {done ? (
              <button type="button" className={styles.secondaryButton} disabled={d.busy} onClick={() => void run(() => d.markRead(false), `${book.title} marked as unread.`)}>
                Mark as unread
              </button>
            ) : (
              <button type="button" className={styles.secondaryButton} disabled={d.busy} onClick={() => setConfirm("read")} data-testid="mark-read">
                Mark as read
              </button>
            )}
            {(p.status !== "not_started" || p.secondsRead > 0) && (
              <button type="button" className={styles.textButton} disabled={d.busy} onClick={() => setConfirm("reset")} data-testid="reset-progress">
                Reset progress
              </button>
            )}
          </div>
          {!book.readable && <p className={styles.muted}>This book isn&apos;t available to read here. Borrow it from the library and track your page above.</p>}
        </div>
      </div>

      <section className={styles.section} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.sectionTitle}>About this book</h2>
        <p className={styles.description}>{book.description}</p>
      </section>

      {chapters.length > 0 && (
        <section className={styles.section} aria-labelledby="chapters-heading">
          <h2 id="chapters-heading" className={styles.sectionTitle}>Chapters</h2>
          <ol className={styles.chapters}>
            {chapters.map((c) => (
              <li key={`${c.startPage}-${c.title}`}>
                <Link href={`/books/${book.id}/read?page=${c.startPage}`}>
                  <span>{c.title}</span>
                  <span className={styles.muted}>p. {c.startPage}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <AnnotationsPanel
        bookId={book.id}
        readable={book.readable}
        bookmarks={bookmarks}
        highlights={highlights}
        notes={notes}
        busy={d.busy}
        onAddNote={(text) => run(() => d.addNote(text), "Note saved.")}
        onDeleteNote={(id) => run(() => d.deleteNote(id), "Note deleted.")}
        onDeleteBookmark={(id) => run(() => d.deleteBookmark(id), "Bookmark removed.")}
        onDeleteHighlight={(id) => run(() => d.deleteHighlight(id), "Highlight removed.")}
        onAddBookmark={!book.readable && p.currentPage > 0 ? () => run(() => d.addBookmark(p.currentPage), `Bookmarked page ${p.currentPage}.`) : undefined}
      />

      <ConfirmDialog
        open={confirm === "read"}
        title={`Mark ${book.title} as read?`}
        body="It will show as Completed and count toward your challenge and rewards. You can still open it and read again."
        confirmLabel="Mark as read"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void run(() => d.markRead(true), `${book.title} marked as read. 🎉`);
        }}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        tone="danger"
        title="Reset reading progress?"
        body="Your page, reading time and completed status for this book will be cleared. Bookmarks, highlights and notes are kept."
        confirmLabel="Reset progress"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void run(() => d.reset(), "Progress reset.");
        }}
      />
      <Toast message={message} onDone={() => setMessage(null)} />
    </article>
  );
}
