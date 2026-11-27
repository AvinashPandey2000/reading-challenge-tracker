"use client";

import Link from "next/link";
import type { ReadingList, SaveError } from "@rct/shared";
import { formatCount } from "@rct/shared";
import styles from "./ReadingChallenge.module.css";

interface Props {
  list: ReadingList;
  pending: Record<string, boolean>;
  errors: Record<string, SaveError>;
  onToggle: (bookId: string, read: boolean) => void;
}

export function BookList({ list, pending, errors, onToggle }: Props) {
  const headingId = `${list.id}-heading`;
  const countId = `${list.id}-count`;
  const percent = list.total ? Math.round((list.readCount / list.total) * 100) : 0;
  const complete = list.total > 0 && list.readCount === list.total;

  return (
    <section className={`glass ${styles.listCard}`} aria-labelledby={headingId} data-testid={`list-${list.id}`}>
      <header className={styles.listHeader}>
        <h2 id={headingId} className={styles.listTitle}>
          {list.title}
        </h2>
        <p id={countId} className={styles.count} data-testid={`count-${list.id}`}>
          <span className={styles.countNumber}>{list.readCount}</span> of {list.total} read
          {complete && <span className={styles.completeTag}> · Complete</span>}
        </p>
      </header>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`${list.title} progress`}
        aria-valuemin={0}
        aria-valuemax={list.total}
        aria-valuenow={list.readCount}
        aria-valuetext={formatCount(list.readCount, list.total)}
      >
        <div className={styles.progressFill} style={{ width: `${percent}%` }} data-complete={complete || undefined} />
      </div>

      <ul className={styles.books}>
        {list.books.map((book) => {
          const saving = book.id in pending;
          const error = errors[book.id];
          const inputId = `book-${book.id}`;
          const statusId = `${inputId}-status`;
          return (
            <li key={book.id} className={styles.bookRow} data-read={book.read || undefined} data-testid={`book-${book.id}`}>
              <div className={styles.bookMain}>
                <input
                  id={inputId}
                  type="checkbox"
                  className={styles.checkbox}
                  checked={book.read}
                  aria-describedby={statusId}
                  aria-busy={saving || undefined}
                  aria-disabled={saving || undefined}
                  onChange={() => {
                    if (!saving) onToggle(book.id, !book.read);
                  }}
                />
                <label htmlFor={inputId} className={styles.bookLabel}>
                  <span className={styles.box} aria-hidden="true">
                    <svg viewBox="0 0 20 20" className={styles.checkmark} focusable="false">
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className={styles.bookText}>
                    <span className={styles.bookTitle}>{book.title}</span>
                    <span className={styles.bookAuthor}>{book.author}</span>
                  </span>
                </label>
                <span id={statusId} className={styles.status} data-state={saving ? "saving" : book.read ? "read" : "unread"}>
                  {saving ? "Saving…" : book.read ? "✓ Read" : "Not read yet"}
                </span>
                <Link href={`/books/${book.id}`} className={styles.detailsLink} aria-label={`${book.title}: details and reading`}>
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
              {error && !saving && (
                <div className={styles.rowError} role="alert">
                  <span>{error.message}</span>
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => onToggle(book.id, error.target)}
                    aria-label={`Retry saving ${book.title}`}
                  >
                    Retry
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
