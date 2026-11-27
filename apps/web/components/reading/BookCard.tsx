import Link from "next/link";
import { pagesLabel, type LibraryBook } from "@rct/shared";
import { BookCover } from "./BookCover";
import { ProgressMeter, StatusBadge } from "./bits";
import styles from "./reading.module.css";

export function BookCard({ book }: { book: LibraryBook }) {
  return (
    <li className={`glass ${styles.card}`} data-testid={`library-book-${book.id}`}>
      <BookCover title={book.title} author={book.author} cover={book.cover} className={styles.cardCover} />
      <div className={styles.cardBody}>
        <p className={styles.category}>
          {book.category}
          {book.year ? ` · ${book.year}` : ""}
        </p>
        <h3 className={styles.cardTitle}>
          <Link href={`/books/${book.id}`} className={styles.cardLink}>
            {book.title}
          </Link>
        </h3>
        <p className={styles.author}>{book.author}</p>
        <p className={styles.summary}>{book.summary}</p>
        <StatusBadge status={book.progress.status} />
        <ProgressMeter percent={book.progress.percent} label={pagesLabel(book)} compact />
      </div>
    </li>
  );
}

/** Small cover tile for the Continue Reading / Recently Read rows. */
export function BookTile({ book, href, caption }: { book: LibraryBook; href: string; caption: string }) {
  return (
    <li className={styles.tile}>
      <Link href={href} className={styles.tileLink}>
        <BookCover title={book.title} author={book.author} cover={book.cover} className={styles.tileCover} />
        <span className={styles.tileTitle}>{book.title}</span>
        <span className={styles.tileCaption}>{caption}</span>
        <span className={styles.tileBar} aria-hidden="true">
          <span style={{ width: `${book.progress.percent}%` }} />
        </span>
      </Link>
    </li>
  );
}
