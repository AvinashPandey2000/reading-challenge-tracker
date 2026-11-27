import { SAMPLE_PDF } from "@/lib/site";
import styles from "./SamplePdf.module.css";

export function SamplePdf() {
  return (
    <section className={`glass ${styles.card}`} aria-labelledby="sample-heading" data-tour="sample">
      <h2 id="sample-heading" className={styles.heading}>
        Free sample to read
      </h2>
      <p className={styles.text}>
        Start <cite>The Secret Garden</cite> with its first chapter. This is the only book in the challenge with a
        downloadable sample; borrow the others from the library.
      </p>
      <a className={styles.download} href={SAMPLE_PDF.href} download data-testid="sample-pdf">
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={styles.icon}>
          <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          Download sample PDF
          <span className={styles.meta}>
            {SAMPLE_PDF.title} · {SAMPLE_PDF.sizeLabel}
          </span>
        </span>
      </a>
      <p className={styles.small}>{SAMPLE_PDF.author}</p>
    </section>
  );
}
